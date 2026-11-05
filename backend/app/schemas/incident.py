from datetime import datetime
from enum import Enum
from typing import Any, List, Optional
from pydantic import BaseModel, Field, field_validator


class SeverityEnum(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class EnvironmentEnum(str, Enum):
    PRODUCTION = "production"
    STAGING = "staging"
    DEVELOPMENT = "development"


class StatusEnum(str, Enum):
    OPEN = "open"
    INVESTIGATING = "investigating"
    MITIGATED = "mitigated"
    RESOLVED = "resolved"


class IncidentBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=255, description="Brief summary of the incident")
    service: str = Field(..., min_length=2, max_length=100, description="Affected microservice or system component")
    environment: EnvironmentEnum = Field(default=EnvironmentEnum.PRODUCTION, description="Deployment environment")
    severity: SeverityEnum = Field(default=SeverityEnum.HIGH, description="Incident severity level")
    symptoms: str = Field(..., min_length=5, description="Observed user-facing or telemetry symptoms")
    error_logs: Optional[str] = Field(default=None, description="Raw error traces or log snippet")

    @field_validator("environment", mode="before")
    @classmethod
    def normalize_environment(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.lower()
        return v

    @field_validator("severity", mode="before")
    @classmethod
    def normalize_severity(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.lower()
        return v


class IncidentCreate(IncidentBase):
    pass


class IncidentResponse(IncidentBase):
    id: str = Field(..., description="Unique generated incident ID (e.g. INC-001)")
    status: StatusEnum = Field(default=StatusEnum.OPEN, description="Incident operational status")
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    is_demo: bool = False

    model_config = {"from_attributes": True}


class IncidentListResponse(BaseModel):
    items: List[IncidentResponse]
    total: int
    limit: int
    offset: int


from backend.app.schemas.analysis import AnalyzeResponse
from backend.app.schemas.resolution import ResolutionDetails
from backend.app.schemas.feedback import FeedbackResponse


class IncidentDetailResponse(IncidentResponse):
    analyses: List[AnalyzeResponse] = Field(default_factory=list)
    resolution: Optional[ResolutionDetails] = None
    feedbacks: List[FeedbackResponse] = Field(default_factory=list)

