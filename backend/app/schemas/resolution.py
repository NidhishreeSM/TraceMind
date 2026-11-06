from datetime import datetime
from typing import Any, List, Optional, Union
from pydantic import BaseModel, Field, field_validator


class ResolveRequest(BaseModel):
    confirmed_cause: str = Field(..., min_length=5, description="Root cause confirmed by the engineering team")
    steps_taken: Union[List[str], str] = Field(..., description="Action steps taken during incident mitigation")
    verified_resolution: str = Field(..., min_length=5, description="Permanent fix verified in production/staging")
    failed_attempts: Optional[Union[List[str], str]] = Field(
        default_factory=list,
        description="Dead ends, incorrect hypotheses, or failed remediation attempts"
    )
    outcome: Optional[str] = Field(
        default=None,
        description="Observed outcome (e.g. latency back to normal, 0 errors)"
    )

    @field_validator("steps_taken", mode="after")
    @classmethod
    def normalize_steps(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            return [line.strip("- *").strip() for line in v.splitlines() if line.strip()]
        return v

    @field_validator("failed_attempts", mode="after")
    @classmethod
    def normalize_failed(cls, v: Any) -> List[str]:
        if v is None:
            return []
        if isinstance(v, str):
            return [line.strip("- *").strip() for line in v.splitlines() if line.strip()]
        return v


class ResolutionDetails(BaseModel):
    id: int
    incident_id: str
    confirmed_cause: str
    steps_taken: List[str]
    verified_resolution: str
    failed_attempts: List[str]
    outcome: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ResolveResponse(BaseModel):
    incident_id: str
    status: str = "resolved"
    resolved_at: datetime
    resolution: ResolutionDetails
    retained_in_hindsight: bool = Field(
        ...,
        description="Honest boolean flag whether retention succeeded in real Hindsight service"
    )
    hindsight_status: str = Field(
        ...,
        description="'retained', 'failed', or 'skipped_unconfigured'"
    )
    hindsight_document_id: Optional[str] = Field(
        default=None,
        description="Document ID stored in Hindsight bank"
    )
    error: Optional[str] = Field(
        default=None,
        description="Failure reason if Hindsight retain was unsuccessful"
    )

