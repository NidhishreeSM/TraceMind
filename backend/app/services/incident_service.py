import json
from datetime import datetime, timezone
import re
from typing import List, Optional, Tuple
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from backend.app.core.logging import logger
from backend.app.models.database import Incident, Analysis, Resolution, Feedback
from backend.app.schemas.incident import IncidentCreate, StatusEnum
from backend.app.schemas.analysis import AIHypothesis, AnalyzeResponse, RecalledMemoryItem
from backend.app.schemas.resolution import ResolveRequest, ResolutionDetails, ResolveResponse
from backend.app.schemas.feedback import FeedbackCreate, FeedbackResponse
from backend.app.services.groq_service import groq_service
from backend.app.services.hindsight_service import (
    hindsight_service,
    deduplicate_memories
)


def get_utc_now():
    return datetime.now(timezone.utc)


def generate_next_incident_id(db: Session) -> str:
    """Generates next sequential incident identifier (e.g. INC-001, INC-002)."""
    # Find all existing incident IDs
    results = db.scalars(select(Incident.id)).all()
    max_num = 0
    for inc_id in results:
        match = re.search(r"^INC-(\d+)$", inc_id)
        if match:
            num = int(match.group(1))
            if num > max_num:
                max_num = num

    next_num = max_num + 1
    return f"INC-{next_num:03d}"


class IncidentService:

    def create_incident(self, db: Session, data: IncidentCreate, is_demo: bool = False, custom_id: Optional[str] = None) -> Incident:
        inc_id = custom_id or generate_next_incident_id(db)
        incident = Incident(
            id=inc_id,
            title=data.title,
            service=data.service,
            environment=data.environment.value if hasattr(data.environment, "value") else str(data.environment),
            severity=data.severity.value if hasattr(data.severity, "value") else str(data.severity),
            status="open",
            symptoms=data.symptoms,
            error_logs=data.error_logs,
            is_demo=is_demo,
            created_at=get_utc_now(),
            updated_at=get_utc_now()
        )
        db.add(incident)
        db.commit()
        db.refresh(incident)
        logger.info(f"Created incident {incident.id}: {incident.title}")
        return incident

    def list_incidents(
        self,
        db: Session,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        service: Optional[str] = None,
        is_demo: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[Incident], int]:
        query = select(Incident)
        if status:
            query = query.where(Incident.status == status.lower())
        if severity:
            query = query.where(Incident.severity == severity.lower())
        if service:
            query = query.where(Incident.service.ilike(f"%{service}%"))
        if is_demo is not None:
            query = query.where(Incident.is_demo == is_demo)

        total_query = select(func.count()).select_from(query.subquery())
        total = db.scalar(total_query) or 0

        query = query.order_by(Incident.created_at.desc()).offset(offset).limit(limit)
        items = list(db.scalars(query).all())
        return items, total

    def get_incident(self, db: Session, incident_id: str) -> Optional[Incident]:
        return db.scalar(select(Incident).where(Incident.id == incident_id))

    def analyze_incident(self, db: Session, incident_id: str, use_memory: bool = True) -> AnalyzeResponse:
        incident = self.get_incident(db, incident_id)
        if not incident:
            raise KeyError(f"Incident {incident_id} not found")

        recalled_memories: List[RecalledMemoryItem] = []
        warnings: List[str] = []
        effective_use_memory = use_memory

        # 1. Real Hindsight Recall (if use_memory=True)
        if use_memory:
            query_parts = [incident.symptoms]
            if incident.error_logs:
                # Include concise excerpt of error logs
                first_line = incident.error_logs.strip().splitlines()[0]
                query_parts.append(first_line)
            recall_query = f"{incident.service}: " + " | ".join(query_parts)

            try:
                recalled_memories = hindsight_service.recall(
                    query=recall_query,
                    budget="mid",
                    max_tokens=4096
                )
                logger.info(f"Hindsight recall returned {len(recalled_memories)} items for incident {incident_id}")
            except Exception as e:
                logger.warning(f"Hindsight recall failed for incident {incident_id}: {e}")
                warnings.append("Hindsight memory recall was unavailable; fell back to zero-shot first-principles analysis.")
                recalled_memories = []
                effective_use_memory = False

        # 2. Call Groq with Incident + Recalled Memories (pass rich context up to 12 items)
        analysis_data, model_used, latency_ms = groq_service.analyze_incident(
            incident_id=incident.id,
            title=incident.title,
            service=incident.service,
            environment=incident.environment,
            severity=incident.severity,
            symptoms=incident.symptoms,
            error_logs=incident.error_logs,
            recalled_memories=recalled_memories[:12],
            use_memory=effective_use_memory
        )

        # 3. Deduplicate recalled memories for compact API response (max 8, ranked by score)
        compact_memories = deduplicate_memories(recalled_memories, max_items=8)

        # 4. Persist Analysis in DB
        analysis = Analysis(
            incident_id=incident.id,
            use_memory=effective_use_memory,
            model_used=model_used,
            latency_ms=latency_ms,
            hypotheses_json=json.dumps(analysis_data["hypotheses"]),
            investigation_steps_json=json.dumps(analysis_data["investigation_steps"]),
            recommendation=analysis_data["recommendation"],
            uncertainty_note=analysis_data["uncertainty_note"],
            recalled_memories_json=json.dumps([m.model_dump() for m in compact_memories]),
            created_at=get_utc_now()
        )
        db.add(analysis)

        # Update incident status to investigating if still open
        if incident.status == "open":
            incident.status = "investigating"
            incident.updated_at = get_utc_now()

        db.commit()
        db.refresh(analysis)

        # Reconstruct typed response
        hypotheses = [AIHypothesis(**h) for h in analysis_data["hypotheses"]]
        return AnalyzeResponse(
            id=analysis.id,
            incident_id=incident.id,
            use_memory=effective_use_memory,
            model_used=model_used,
            latency_ms=latency_ms,
            hypotheses=hypotheses,
            investigation_steps=analysis_data["investigation_steps"],
            recommendation=analysis_data["recommendation"],
            uncertainty_note=analysis_data["uncertainty_note"],
            recalled_memories=compact_memories,
            warnings=warnings,
            created_at=analysis.created_at
        )

    def resolve_incident(self, db: Session, incident_id: str, data: ResolveRequest) -> ResolveResponse:
        incident = self.get_incident(db, incident_id)
        if not incident:
            raise KeyError(f"Incident {incident_id} not found")

        resolved_time = get_utc_now()
        incident.status = "resolved"
        incident.resolved_at = resolved_time
        incident.updated_at = resolved_time

        # Save or update resolution in DB
        steps_list = data.steps_taken if isinstance(data.steps_taken, list) else [data.steps_taken]
        failed_list = data.failed_attempts if isinstance(data.failed_attempts, list) else ([data.failed_attempts] if data.failed_attempts else [])

        existing_res = db.scalar(select(Resolution).where(Resolution.incident_id == incident.id))
        if existing_res:
            existing_res.confirmed_cause = data.confirmed_cause
            existing_res.steps_taken_json = json.dumps(steps_list)
            existing_res.verified_resolution = data.verified_resolution
            existing_res.failed_attempts_json = json.dumps(failed_list)
            existing_res.outcome = data.outcome
            resolution = existing_res
        else:
            resolution = Resolution(
                incident_id=incident.id,
                confirmed_cause=data.confirmed_cause,
                steps_taken_json=json.dumps(steps_list),
                verified_resolution=data.verified_resolution,
                failed_attempts_json=json.dumps(failed_list),
                outcome=data.outcome,
                created_at=resolved_time
            )
            db.add(resolution)

        # Retain rich memory in Hindsight
        retained = False
        hindsight_status = "skipped_unconfigured"
        error_msg = None

        if hindsight_service.is_configured():
            try:
                retain_res = hindsight_service.retain_incident(
                    incident_id=incident.id,
                    title=incident.title,
                    service=incident.service,
                    environment=incident.environment,
                    symptoms=incident.symptoms,
                    confirmed_cause=data.confirmed_cause,
                    verified_resolution=data.verified_resolution,
                    steps_taken=steps_list,
                    error_logs=incident.error_logs,
                    failed_attempts=failed_list,
                    outcome=data.outcome,
                    is_demo=incident.is_demo
                )
                retained = retain_res.get("success", True)
                hindsight_status = "retained" if retained else "failed"
                resolution.retained_in_hindsight = retained
                resolution.hindsight_document_id = incident.id
            except Exception as e:
                logger.error(f"Failed to retain incident {incident.id} in Hindsight: {e}")
                retained = False
                hindsight_status = "failed"
                error_msg = str(e)
                resolution.retained_in_hindsight = False
        else:
            hindsight_status = "skipped_unconfigured"
            error_msg = "HINDSIGHT_API_KEY is not configured in environment"
            resolution.retained_in_hindsight = False

        db.commit()
        db.refresh(resolution)

        res_details = ResolutionDetails(
            id=resolution.id,
            incident_id=incident.id,
            confirmed_cause=resolution.confirmed_cause,
            steps_taken=steps_list,
            verified_resolution=resolution.verified_resolution,
            failed_attempts=failed_list,
            outcome=resolution.outcome,
            created_at=resolution.created_at
        )

        return ResolveResponse(
            incident_id=incident.id,
            status="resolved",
            resolved_at=resolved_time,
            resolution=res_details,
            retained_in_hindsight=retained,
            hindsight_status=hindsight_status,
            error=error_msg
        )

    def add_feedback(self, db: Session, incident_id: str, data: FeedbackCreate) -> FeedbackResponse:
        incident = self.get_incident(db, incident_id)
        if not incident:
            raise KeyError(f"Incident {incident_id} not found")

        feedback = Feedback(
            incident_id=incident.id,
            analysis_id=data.analysis_id,
            feedback_type=data.feedback_type.value if hasattr(data.feedback_type, "value") else str(data.feedback_type),
            notes=data.notes,
            modified_recommendation=data.modified_recommendation,
            created_at=get_utc_now()
        )
        db.add(feedback)
        db.commit()
        db.refresh(feedback)
        logger.info(f"Stored {feedback.feedback_type} feedback for incident {incident.id}")

        return FeedbackResponse(
            id=feedback.id,
            incident_id=incident.id,
            analysis_id=feedback.analysis_id,
            feedback_type=feedback.feedback_type,
            notes=feedback.notes,
            modified_recommendation=feedback.modified_recommendation,
            created_at=feedback.created_at
        )


incident_service = IncidentService()

