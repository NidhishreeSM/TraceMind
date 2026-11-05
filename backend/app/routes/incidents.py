import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.app.models.database import get_db
from backend.app.schemas.incident import (
    IncidentCreate, IncidentResponse, IncidentListResponse, IncidentDetailResponse
)
from backend.app.schemas.analysis import (
    AnalyzeRequest, AnalyzeResponse, AIHypothesis, RecalledMemoryItem
)
from backend.app.schemas.resolution import (
    ResolveRequest, ResolveResponse, ResolutionDetails
)
from backend.app.schemas.feedback import (
    FeedbackCreate, FeedbackResponse
)
from backend.app.services.incident_service import incident_service

router = APIRouter(prefix="/incidents", tags=["Incidents"])


@router.post("", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
def create_incident(payload: IncidentCreate, db: Session = Depends(get_db)):
    """Creates a new incident record with sequential ID generation (INC-001, etc.)."""
    incident = incident_service.create_incident(db, payload)
    return incident


@router.get("", response_model=IncidentListResponse)
def list_incidents(
    status: Optional[str] = Query(default=None, description="Filter by status (open, investigating, resolved)"),
    severity: Optional[str] = Query(default=None, description="Filter by severity (critical, high, medium, low)"),
    service: Optional[str] = Query(default=None, description="Filter by service name substring"),
    is_demo: Optional[bool] = Query(default=None, description="Filter demo vs live incidents"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db)
):
    """Lists incidents with optional multi-attribute filtering."""
    items, total = incident_service.list_incidents(
        db, status=status, severity=severity, service=service,
        is_demo=is_demo, limit=limit, offset=offset
    )
    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset
    }


@router.get("/{incident_id}", response_model=IncidentDetailResponse)
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    """Retrieves full incident details including past AI analyses, resolution, and feedback."""
    incident = incident_service.get_incident(db, incident_id)
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident {incident_id} not found"
        )

    # Hydrate analyses
    hydrated_analyses = []
    for a in incident.analyses:
        try:
            raw_h = json.loads(a.hypotheses_json or "[]")
            hypotheses = [AIHypothesis(**item) for item in raw_h]
        except Exception:
            hypotheses = []

        try:
            inv_steps = json.loads(a.investigation_steps_json or "[]")
        except Exception:
            inv_steps = []

        try:
            raw_m = json.loads(a.recalled_memories_json or "[]")
            recalled = [RecalledMemoryItem(**m) for m in raw_m]
        except Exception:
            recalled = []

        hydrated_analyses.append(AnalyzeResponse(
            id=a.id,
            incident_id=a.incident_id,
            use_memory=a.use_memory,
            model_used=a.model_used,
            latency_ms=a.latency_ms,
            hypotheses=hypotheses,
            investigation_steps=inv_steps,
            recommendation=a.recommendation,
            uncertainty_note=a.uncertainty_note,
            recalled_memories=recalled,
            created_at=a.created_at
        ))

    # Hydrate resolution
    resolution_detail = None
    if incident.resolution:
        r = incident.resolution
        try:
            steps = json.loads(r.steps_taken_json or "[]")
        except Exception:
            steps = []
        try:
            failed = json.loads(r.failed_attempts_json or "[]")
        except Exception:
            failed = []

        resolution_detail = ResolutionDetails(
            id=r.id,
            incident_id=r.incident_id,
            confirmed_cause=r.confirmed_cause,
            steps_taken=steps,
            verified_resolution=r.verified_resolution,
            failed_attempts=failed,
            outcome=r.outcome,
            created_at=r.created_at
        )

    # Hydrate feedbacks
    hydrated_feedbacks = [
        FeedbackResponse(
            id=f.id,
            incident_id=f.incident_id,
            analysis_id=f.analysis_id,
            feedback_type=f.feedback_type,
            notes=f.notes,
            modified_recommendation=f.modified_recommendation,
            created_at=f.created_at
        ) for f in incident.feedbacks
    ]

    return IncidentDetailResponse(
        id=incident.id,
        title=incident.title,
        service=incident.service,
        environment=incident.environment,
        severity=incident.severity,
        status=incident.status,
        symptoms=incident.symptoms,
        error_logs=incident.error_logs,
        created_at=incident.created_at,
        updated_at=incident.updated_at,
        resolved_at=incident.resolved_at,
        is_demo=incident.is_demo,
        analyses=hydrated_analyses,
        resolution=resolution_detail,
        feedbacks=hydrated_feedbacks
    )


@router.post("/{incident_id}/analyze", response_model=AnalyzeResponse)
def analyze_incident(incident_id: str, payload: AnalyzeRequest = AnalyzeRequest(), db: Session = Depends(get_db)):
    """
    Performs AI incident analysis.
    If use_memory=True: queries real Hindsight recall first, then feeds recalled memories to Groq.
    If use_memory=False: calls Groq in zero-shot isolation.
    """
    try:
        return incident_service.analyze_incident(db, incident_id, use_memory=payload.use_memory)
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident {incident_id} not found"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}"
        )


@router.post("/{incident_id}/resolve", response_model=ResolveResponse)
def resolve_incident(incident_id: str, payload: ResolveRequest, db: Session = Depends(get_db)):
    """
    Resolves the incident in database and retains rich lesson memory into Hindsight.
    Returns honest boolean flag retained_in_hindsight.
    """
    try:
        return incident_service.resolve_incident(db, incident_id, payload)
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident {incident_id} not found"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Resolution persistence failed: {str(e)}"
        )


@router.post("/{incident_id}/feedback", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
def add_incident_feedback(incident_id: str, payload: FeedbackCreate, db: Session = Depends(get_db)):
    """Records human engineer feedback (accept/reject/modify) on AI recommendations. Never auto-remediates."""
    try:
        return incident_service.add_feedback(db, incident_id, payload)
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident {incident_id} not found"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record feedback: {str(e)}"
        )
