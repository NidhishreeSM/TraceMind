from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class MemoryRecallRequest(BaseModel):
    query: str = Field(..., min_length=3, description="Semantic or incident query to search in Hindsight memory")
    types: Optional[List[str]] = Field(
        default=None,
        description="Filter by memory types (e.g. ['experience', 'world', 'observation'])"
    )
    budget: str = Field(default="mid", description="Retrieval budget: 'low', 'mid', or 'high'")
    limit: int = Field(default=10, ge=1, le=50, description="Maximum number of memory items to return")


class MemoryRecallResponse(BaseModel):
    query: str
    results: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Exact memory units returned from Hindsight"
    )
    total: int

