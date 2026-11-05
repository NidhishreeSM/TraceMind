from fastapi import APIRouter, HTTPException, status
from backend.app.schemas.memory import MemoryRecallRequest, MemoryRecallResponse
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Hindsight recall operation failed: {str(e)}"
        )

