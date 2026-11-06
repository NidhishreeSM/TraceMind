from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.exceptions import HindsightUnavailableException
from backend.app.models.database import get_db, Incident, Resolution
from backend.app.schemas.memory import (
    MemoryRecallRequest,
    MemoryRecallResponse,
    MemoryStatsResponse
)
from backend.app.services.hindsight_service import hindsight_service

router = APIRouter(prefix="/memory", tags=["Memory Explorer"])


@router.post("/recall", response_model=MemoryRecallResponse)
def memory_recall_passthrough(payload: MemoryRecallRequest):
    """
    Direct passthrough to real Hindsight multi-strategy retrieval for the Memory Explorer frontend.
    Returns authentic extracted facts, entities, and metadata.
    """
    try:
        results = hindsight_service.recall(
            query=payload.query,
            types=payload.types,
            budget=payload.budget,
            max_tokens=4096
        )

        formatted_results = [r.model_dump() for r in results[:payload.limit]]
        return {
            "query": payload.query,
            "results": formatted_results,
            "total": len(formatted_results)
        }
    except Exception as e:
        raise HindsightUnavailableException(f"Hindsight recall operation failed: {str(e)}")


@router.get("/stats", response_model=MemoryStatsResponse)
def get_memory_stats(db: Session = Depends(get_db)):
    """
    Returns authentic memory bank statistics directly from Hindsight API.
    If Hindsight is unavailable, falls back to local database retention counts with source='database'.
    """
    if hindsight_service.is_configured():
        try:
            stats = hindsight_service.get_memory_stats()
            if stats.get("source") == "hindsight":
                return stats
        except Exception:
            pass

    # Database Fallback
    total_incidents = db.query(Incident).count()
    retained_count = db.query(Resolution).filter(Resolution.retained_in_hindsight == True).count()
    return {
        "source": "database",
        "bank_id": hindsight_service.bank_id,
        "total_retained_resolutions": retained_count,
        "total_incidents": total_incidents,
        "message": "Hindsight API unavailable or unconfigured; counts reported from local database."
    }


