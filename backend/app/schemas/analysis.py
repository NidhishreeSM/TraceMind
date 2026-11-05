from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class AIHypothesis(BaseModel):
    description: str = Field(..., description="AI-generated root cause hypothesis (never a confirmed cause)")
    confidence: str = Field(..., description="'high', 'medium', or 'low'")
    rationale: str = Field(..., description="Justification and observed evidence for this hypothesis")


class RecalledMemoryItem(BaseModel):
    id: Optional[str] = Field(default=None, description="Hindsight memory ID")
    text: str = Field(..., description="Exact recalled fact or lesson from Hindsight memory bank")
    type: Optional[str] = Field(default=None, description="Memory type: experience, world, or observation")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Metadata tags attached to the memory")
    score: Optional[float] = Field(default=None, description="Relevance score from multi-strategy retrieval")


class AnalyzeRequest(BaseModel):
    use_memory: bool = Field(
        default=True,
        description="Whether to augment Groq with persistent Hindsight memory lessons (Core demo comparison)"
    )


class AnalyzeResponse(BaseModel):
    id: int = Field(..., description="Unique Analysis record ID")
    incident_id: str = Field(..., description="Target incident ID")
    use_memory: bool = Field(..., description="True if Hindsight memory was queried and provided to the model")
    model_used: str = Field(..., description="Exact Groq model identifier used")
    latency_ms: int = Field(..., description="Total execution latency in milliseconds")
    hypotheses: List[AIHypothesis] = Field(..., description="Structured AI hypotheses with confidence levels")
    investigation_steps: List[str] = Field(..., description="Recommended diagnostic steps to verify or refute")
    recommendation: str = Field(..., description="Synthesized actionable remediation recommendation")
    uncertainty_note: str = Field(..., description="Clear disclosure of limitations, missing telemetry, or assumptions")
    recalled_memories: List[RecalledMemoryItem] = Field(default_factory=list, description="Exact Hindsight memories retrieved")
    created_at: datetime

    model_config = {"from_attributes": True}

