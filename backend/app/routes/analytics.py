from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.models.database import get_db
from backend.app.schemas.analytics import AnalyticsSummaryResponse
from backend.app.services.analytics_service import analytics_service

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/summary", response_model=AnalyticsSummaryResponse)
def get_analytics_summary(db: Session = Depends(get_db)):
    """Returns analytics computed strictly from real database records."""
    return analytics_service.get_summary(db)
