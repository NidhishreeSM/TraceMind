from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.models.database import get_db
from backend.app.schemas.health import HealthResponse, ServiceStatus
from backend.app.services.hindsight_service import hindsight_service

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("", response_model=HealthResponse)
def get_system_health(db: Session = Depends(get_db)):
    """Reports health status of core service and all external dependencies separately."""
    services = {}
    overall_ok = True

    # 1. Database Health Check
    try:
        db.execute(text("SELECT 1"))
        engine_type = "sqlite" if settings.is_sqlite() else "postgresql"
        services["database"] = ServiceStatus(
            status="healthy",
            message="Database connection established",
            details={"engine": engine_type}
        )
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        overall_ok = False
        services["database"] = ServiceStatus(
            status="unhealthy",
            message=f"Database unreachable: {str(e)}"
        )

    # 2. Groq AI Configuration Health Check
    if not settings.GROQ_API_KEY or settings.GROQ_API_KEY.startswith("your_"):
        services["groq"] = ServiceStatus(
            status="degraded",
            message="GROQ_API_KEY is not configured in environment",
            details={"primary_model": settings.GROQ_MODEL}
        )
    else:
        services["groq"] = ServiceStatus(
            status="healthy",
            message="Groq API key configured",
            details={
                "primary_model": settings.GROQ_MODEL,
                "fallback_model": settings.GROQ_FALLBACK_MODEL
            }
        )

    # 3. Hindsight Memory Engine Health Check
    hindsight_health = hindsight_service.check_health()
    h_status = hindsight_health.get("status", "unhealthy")
    if h_status == "unhealthy":
        overall_ok = False

    services["hindsight"] = ServiceStatus(
        status=h_status,
        message=hindsight_health.get("message"),
        details={
            "bank_id": settings.HINDSIGHT_BANK_ID,
            "base_url": settings.HINDSIGHT_BASE_URL,
            "version": hindsight_health.get("version")
        }
    )

    overall_status = "ok" if overall_ok else "degraded"
    status_code = status.HTTP_200_OK if overall_ok else status.HTTP_503_SERVICE_UNAVAILABLE

    return JSONResponse(
        status_code=status.HTTP_200_OK,  # Return 200 with service breakdown so UI can inspect components
        content={
            "status": overall_status,
            "version": "1.0.0",
            "services": {k: v.model_dump() for k, v in services.items()}
        }
    )

