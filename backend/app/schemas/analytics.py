from typing import Dict
from pydantic import BaseModel, Field


class MemoryImpactMetrics(BaseModel):
    avg_minutes_to_resolve_with_memory: float = Field(
        default=0.0,
        description="Average MTTR in minutes for incidents resolved using Hindsight memory"
    )
    avg_minutes_to_resolve_without_memory: float = Field(
        default=0.0,
        description="Average MTTR in minutes for incidents resolved without memory"
    )
    time_saved_percentage: float = Field(
        default=0.0,
        description="Percentage reduction in resolution time when using memory"
    )
    recall_hit_rate: float = Field(
        default=0.0,
        description="Proportion of analyze calls where Hindsight memory returned >= 1 relevant item"
    )
    feedback_accept_rate: float = Field(
        default=0.0,
        description="Proportion of engineer feedback that was 'accept'"
    )


class AnalyticsSummaryResponse(BaseModel):
    total_incidents: int
    open_incidents: int
    resolved_incidents: int
    memory_impact: MemoryImpactMetrics
    severity_breakdown: Dict[str, int] = Field(default_factory=dict)
    service_breakdown: Dict[str, int] = Field(default_factory=dict)
