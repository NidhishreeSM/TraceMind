from datetime import datetime
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field, field_validator


class FeedbackTypeEnum(str, Enum):
    ACCEPT = "accept"
    REJECT = "reject"
    MODIFY = "modify"


class FeedbackCreate(BaseModel):
    analysis_id: Optional[int] = Field(default=None, description="Optional ID of the Analysis being rated")
    feedback_type: FeedbackTypeEnum = Field(..., description="Action taken: accept, reject, or modify")
    notes: Optional[str] = Field(default=None, description="Engineer's explanation or qualitative comments")
    modified_recommendation: Optional[str] = Field(
        default=None,
        description="If modified, the revised recommendation text chosen by engineer"
    )

    @field_validator("feedback_type", mode="before")
    @classmethod
    def normalize_type(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.lower()
        return v


class FeedbackResponse(BaseModel):
    id: int
    incident_id: str
    analysis_id: Optional[int] = None
    feedback_type: FeedbackTypeEnum
    notes: Optional[str] = None
    modified_recommendation: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
