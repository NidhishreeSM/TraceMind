import json
from datetime import datetime, timezone
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.models.database import Base, Incident, Analysis, Resolution, Feedback
from backend.app.schemas.incident import IncidentCreate, SeverityEnum, EnvironmentEnum, StatusEnum
from backend.app.schemas.analysis import AIHypothesis, AnalyzeRequest
from backend.app.schemas.resolution import ResolveRequest
from backend.app.schemas.feedback import FeedbackCreate, FeedbackTypeEnum
from backend.app.services.groq_service import GroqService
from backend.app.services.incident_service import generate_next_incident_id
from backend.app.services.analytics_service import AnalyticsService


@pytest.fixture
def memory_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_incident_id_sequential_generation(memory_db):
    """Verifies that incident IDs are generated sequentially (INC-001, INC-002...)."""
    id1 = generate_next_incident_id(memory_db)
    assert id1 == "INC-001"

    inc1 = Incident(
        id=id1,
        title="Test Inc 1",
        service="payment-api",
        environment="production",
        severity="high",
        status="open",
        symptoms="Timeout",
        created_at=datetime.now(timezone.utc)
    )
    memory_db.add(inc1)
    memory_db.commit()

    id2 = generate_next_incident_id(memory_db)
    assert id2 == "INC-002"


def test_schema_enum_normalization():
    """Verifies that case variations in severity and environment normalize correctly."""
    inc = IncidentCreate(
        title="Database Latency",
        service="orders-db",
        environment="PRODUCTION",  # Uppercase input
        severity="CRITICAL",        # Uppercase input
        symptoms="Connection pool exhausted",
        error_logs="Timeout"
    )
    assert inc.environment == EnvironmentEnum.PRODUCTION
    assert inc.severity == SeverityEnum.CRITICAL


def test_resolve_request_multiline_normalization():
    """Verifies that multiline text strings in steps_taken normalize into clean lists."""
    req = ResolveRequest(
        confirmed_cause="Connection leak in webhook handler",
        steps_taken="""
        - Step 1: Checked pg_stat_activity
        - Step 2: Restarted connection pool
        * Step 3: Verified resolution
        """,
        verified_resolution="Wrapped session in try/finally context manager",
        failed_attempts="1. Tried restarting pod without fix\n2. Doubled pool size",
        outcome="Latency returned to 5ms"
    )
    assert len(req.steps_taken) == 3
    assert req.steps_taken[0] == "Step 1: Checked pg_stat_activity"
    assert len(req.failed_attempts) == 2


def test_groq_json_cleaner_markdown_code_blocks():
    """Verifies that groq_service robustly cleans JSON wrapped in markdown or code blocks."""
    service = GroqService()
    raw = """```json
    {
      "hypotheses": [{"description": "AI hypothesis: DB timeout", "confidence": "high", "rationale": "High latency"}],
      "investigation_steps": ["Check active queries"],
      "recommendation": "Tune timeouts",
      "uncertainty_note": "Requires metric verification"
    }
    ```"""
    parsed = service._clean_json_response(raw)
    assert "hypotheses" in parsed
    assert parsed["hypotheses"][0]["confidence"] == "high"


def test_groq_json_cleaner_with_commentary():
    """Verifies parsing when the LLM outputs commentary before and after the JSON block."""
    service = GroqService()
    raw = """Here is the diagnostic analysis:
    {
      "hypotheses": [{"description": "AI hypothesis: Leaked socket", "confidence": "medium", "rationale": "High TIME_WAIT"}],
      "investigation_steps": ["Run netstat"],
      "recommendation": "Configure SO_REUSEADDR",
      "uncertainty_note": "Preliminary"
    }
    Hope this helps!"""
    parsed = service._clean_json_response(raw)
    assert parsed["recommendation"] == "Configure SO_REUSEADDR"


def test_analytics_metrics_empty_db(memory_db):
    """Verifies that analytics returns None/zeros without fabrication when database has zero live records."""
    service = AnalyticsService()
    summary = service.get_summary(memory_db)
    assert summary.total_incidents == 0
    assert summary.open_incidents == 0
    assert summary.resolved_incidents == 0
    assert summary.live_incidents == 0
    assert summary.demo_incidents == 0
    assert summary.memory_impact.avg_minutes_to_resolve_with_memory is None
    assert summary.memory_impact.avg_minutes_to_resolve_without_memory is None
    assert summary.memory_impact.time_saved_percentage is None
    assert summary.memory_impact.recall_hit_rate is None
    assert summary.memory_impact.feedback_accept_rate is None
    assert summary.memory_impact.basis == "insufficient_live_data"


def test_recalled_memory_deduplication_and_source_id():
    """Verifies that deduplicate_memories drops near-duplicate texts and preserves score ranking."""
    from backend.app.schemas.analysis import RecalledMemoryItem
    from backend.app.services.hindsight_service import deduplicate_memories, parse_source_incident_id

    # Test parse_source_incident_id
    assert parse_source_incident_id({"incident_id": "INC-042"}, None, "text") == "INC-042"
    assert parse_source_incident_id(None, "INC-099", "text") == "INC-099"
    assert parse_source_incident_id(None, None, "Observed in INC-123 during rollout") == "INC-123"

    items = [
        RecalledMemoryItem(id="1", text="Payment API connection pool was exhausted in production.", score=0.99, source_incident_id="INC-001"),
        RecalledMemoryItem(id="2", text="Payment API connection pool was exhausted in production on 2026-11-05.", score=0.95, source_incident_id=None),
        RecalledMemoryItem(id="3", text="Redis cache cluster hit maximum memory threshold.", score=0.80, source_incident_id="INC-002"),
    ]
    deduped = deduplicate_memories(items, max_items=8)
    # The near-identical second memory should be dropped, leaving 2 items
    assert len(deduped) == 2
    assert deduped[0].id == "1"
    assert deduped[1].id == "3"


def test_error_envelope_mapping():
    """Verifies that Hindsight and Groq exceptions map to HTTP 502 with standard envelope."""
    from unittest.mock import patch
    from fastapi.testclient import TestClient
    from backend.app.main import app
    from backend.app.core.exceptions import HindsightUnavailableException, LLMUnavailableException

    client = TestClient(app)

    with patch("backend.app.routes.memory.hindsight_service.recall", side_effect=HindsightUnavailableException("Connection dropped")):
        res = client.post("/api/memory/recall", json={"query": "test query"})
        assert res.status_code == 502
        assert res.json()["error"]["code"] == "HINDSIGHT_UNAVAILABLE"

    with patch("backend.app.services.incident_service.groq_service.analyze_incident", side_effect=LLMUnavailableException("Rate limit")):
        res = client.post("/api/incidents/INC-001/analyze", json={"use_memory": False})
        assert res.status_code == 502
        assert res.json()["error"]["code"] == "LLM_UNAVAILABLE"


