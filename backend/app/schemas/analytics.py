from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class MemoryImpactMetrics(BaseModel):
    avg_minutes_to_resolve_with_memory: Optional[float] = Field(
        default=None,
        description="Average MTTR in minutes for live incidents analyzed with Hindsight memory. Null if insufficient live samples."
    )
    avg_minutes_to_resolve_without_memory: Optional[float] = Field(
        default=None,
        description="Average MTTR in minutes for live incidents analyzed without memory. Null if insufficient live samples."
    )
    time_saved_percentage: Optional[float] = Field(
        default=None,
        description="Percentage reduction in resolution time for live runs. Null unless both sides have >= 1 live sample."
    )
    recall_hit_rate: Optional[float] = Field(
        default=None,
        description="Proportion of live analyze calls with use_memory=True that returned >= 1 memory from Hindsight. Null if no memory analyses yet."
    )
    recall_hit_rate_note: str = Field(
        default="No live memory analyses recorded yet",
        description="Contextual note regarding live recall hit rate sample size"
    )
    feedback_accept_rate: Optional[float] = Field(
        default=None,
        description="Proportion of human engineer feedback that was 'accept'. Null if no feedback recorded yet."
    )
    basis: str = Field(
        default="insufficient_live_data",
        description="Data basis of primary metrics: 'live_runs' or 'insufficient_live_data'"
    )
    demo_benchmark: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Historical benchmark statistics derived from synthetic sample incidents, clearly separated from live telemetry"
    )


class AnalyticsSummaryResponse(BaseModel):
    total_incidents: int
    open_incidents: int
    resolved_incidents: int
    live_incidents: int = Field(default=0, description="Count of live production incidents (is_demo=false)")
    demo_incidents: int = Field(default=0, description="Count of synthetic sample incidents (is_demo=true)")
    memory_impact: MemoryImpactMetrics
    severity_breakdown: Dict[str, int] = Field(default_factory=dict)
    service_breakdown: Dict[str, int] = Field(default_factory=dict)
