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
        res = client.post("/api/incidents/INC-DEMO-001/analyze", json={"use_memory": False})
        assert res.status_code == 502
        assert res.json()["error"]["code"] == "LLM_UNAVAILABLE"


def test_rule_1_analytics_counts_only_non_demo_analyses(memory_db):
    """Rule 1: Analytics must count only analyses that belong to non-demo (is_demo=false) incidents."""
    service = AnalyticsService()

    # Create demo incident with an analysis that has use_memory=True
    demo_inc = Incident(
        id="INC-DEMO-001",
        title="Demo incident",
        service="payment-api",
        environment="production",
        severity="high",
        status="resolved",
        symptoms="Demo symptoms",
        is_demo=True,
        created_at=datetime.now(timezone.utc)
    )
    demo_analysis = Analysis(
        incident_id="INC-DEMO-001",
        use_memory=True,
        model_used="openai/gpt-oss-120b",
        latency_ms=1200,
        hypotheses_json="[]",
        investigation_steps_json="[]",
        recommendation="Demo fix",
        uncertainty_note="Demo note",
        recalled_memories_json=json.dumps([{"id": "mem_1", "text": "precedent"}]),
        created_at=datetime.now(timezone.utc)
    )
    memory_db.add(demo_inc)
    memory_db.add(demo_analysis)
    memory_db.commit()

    # With only demo incidents, live recall_hit_rate must ignore the demo analysis
    summary = service.get_summary(memory_db)
    assert summary.demo_incidents == 1
    assert summary.live_incidents == 0
    assert summary.memory_impact.recall_hit_rate is None
    assert summary.memory_impact.recall_hit_rate_note == "No live memory analyses recorded yet"

    # Now add a live (non-demo) incident with a memory analysis
    live_inc = Incident(
        id="INC-001",
        title="Live incident",
        service="payment-api",
        environment="production",
        severity="critical",
        status="open",
        symptoms="Live symptoms",
        is_demo=False,
        created_at=datetime.now(timezone.utc)
    )
    live_analysis = Analysis(
        incident_id="INC-001",
        use_memory=True,
        model_used="openai/gpt-oss-120b",
        latency_ms=1400,
        hypotheses_json="[]",
        investigation_steps_json="[]",
        recommendation="Live fix",
        uncertainty_note="Live note",
        recalled_memories_json=json.dumps([{"id": "mem_live", "text": "live precedent"}]),
        created_at=datetime.now(timezone.utc)
    )
    memory_db.add(live_inc)
    memory_db.add(live_analysis)
    memory_db.commit()

    summary_live = service.get_summary(memory_db)
    assert summary_live.live_incidents == 1
    assert summary_live.memory_impact.recall_hit_rate == 1.0
    assert "1 live memory analysis call(s)" in summary_live.memory_impact.recall_hit_rate_note


def test_rule_2_reset_live_data_deletes_child_rows_and_no_orphans(memory_db):
    """Rule 2: reset_live_data.py must also delete analyses, feedback and resolutions that belong to live incidents, leaving no orphan rows."""
    from backend.scripts.reset_live_data import reset_database_live_records

    # 1. Seed demo incident with resolution
    demo_inc = Incident(
        id="INC-DEMO-001",
        title="Demo incident",
        service="payment-api",
        environment="production",
        severity="high",
        status="resolved",
        symptoms="Demo symptoms",
        is_demo=True,
        created_at=datetime.now(timezone.utc)
    )
    demo_res = Resolution(
        incident_id="INC-DEMO-001",
        confirmed_cause="Demo root cause",
        steps_taken_json="[]",
        verified_resolution="Demo fix",
        created_at=datetime.now(timezone.utc)
    )
    memory_db.add(demo_inc)
    memory_db.add(demo_res)

    # 2. Add live incident with full child records (analysis, resolution, feedback)
    live_inc = Incident(
        id="INC-001",
        title="Live incident",
        service="orders-db",
        environment="production",
        severity="critical",
        status="resolved",
        symptoms="Live symptoms",
        is_demo=False,
        created_at=datetime.now(timezone.utc)
    )
    live_res = Resolution(
        incident_id="INC-001",
        confirmed_cause="Live cause",
        steps_taken_json="[]",
        verified_resolution="Live fix",
        created_at=datetime.now(timezone.utc)
    )
    live_analysis = Analysis(
        incident_id="INC-001",
        use_memory=True,
        model_used="openai/gpt-oss-120b",
        latency_ms=1100,
        hypotheses_json="[]",
        investigation_steps_json="[]",
        recommendation="Live fix",
        uncertainty_note="Live note",
        created_at=datetime.now(timezone.utc)
    )
    live_feedback = Feedback(
        incident_id="INC-001",
        feedback_type="accept",
        notes="Great fix",
        created_at=datetime.now(timezone.utc)
    )
    memory_db.add(live_inc)
    memory_db.add(live_res)
    memory_db.add(live_analysis)
    memory_db.add(live_feedback)

    # 3. Add an orphan analysis and orphan feedback (whose incident_id does not exist)
    orphan_analysis = Analysis(
        incident_id="INC-DELETED-999",
        use_memory=True,
        model_used="openai/gpt-oss-120b",
        latency_ms=900,
        hypotheses_json="[]",
        investigation_steps_json="[]",
        recommendation="Orphan fix",
        uncertainty_note="Orphan note",
        created_at=datetime.now(timezone.utc)
    )
    orphan_feedback = Feedback(
        incident_id="INC-DELETED-999",
        feedback_type="reject",
        notes="Orphan feedback",
        created_at=datetime.now(timezone.utc)
    )
    memory_db.add(orphan_analysis)
    memory_db.add(orphan_feedback)
    memory_db.commit()

    # Pre-reset assertions
    assert memory_db.query(Incident).count() == 2
    assert memory_db.query(Analysis).count() == 2
    assert memory_db.query(Resolution).count() == 2
    assert memory_db.query(Feedback).count() == 2

    # Execute reset
    del_counts = reset_database_live_records(memory_db)

    # Post-reset assertions
    assert del_counts["incidents"] == 1
    assert memory_db.query(Incident).filter(Incident.is_demo == False).count() == 0
    assert memory_db.query(Incident).filter(Incident.id == "INC-DEMO-001").count() == 1

    # Verify no live or orphan child rows exist
    demo_ids = [r[0] for r in memory_db.query(Incident.id).filter(Incident.is_demo == True).all()]
    orphan_analyses_count = memory_db.query(Analysis).filter(~Analysis.incident_id.in_(demo_ids)).count()
    orphan_resolutions_count = memory_db.query(Resolution).filter(~Resolution.incident_id.in_(demo_ids)).count()
    orphan_feedbacks_count = memory_db.query(Feedback).filter(~Feedback.incident_id.in_(demo_ids)).count()

    assert orphan_analyses_count == 0
    assert orphan_resolutions_count == 0
    assert orphan_feedbacks_count == 0
    assert memory_db.query(Resolution).filter(Resolution.incident_id == "INC-DEMO-001").count() == 1


def test_rule_3_recall_hit_rate_null_when_zero_live_analyses(memory_db):
    """Rule 3: recall_hit_rate must be null with a plain note when there are zero live memory analyses."""
    service = AnalyticsService()

    # 1. Completely empty database
    summary_empty = service.get_summary(memory_db)
    assert summary_empty.memory_impact.recall_hit_rate is None
    assert summary_empty.memory_impact.recall_hit_rate_note == "No live memory analyses recorded yet"

    # 2. Database with only demo incidents and demo analyses
    demo_inc = Incident(
        id="INC-DEMO-002",
        title="Demo incident 2",
        service="orders-db",
        environment="production",
        severity="medium",
        status="open",
        symptoms="Demo symptoms",
        is_demo=True,
        created_at=datetime.now(timezone.utc)
    )
    memory_db.add(demo_inc)
    memory_db.commit()

    summary_demo_only = service.get_summary(memory_db)
    assert summary_demo_only.memory_impact.recall_hit_rate is None
    assert summary_demo_only.memory_impact.recall_hit_rate_note == "No live memory analyses recorded yet"


