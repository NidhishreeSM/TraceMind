from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class ServiceStatus(BaseModel):
    status: str = Field(..., description="'healthy', 'degraded', or 'unhealthy'")
    message: Optional[str] = Field(default=None, description="Diagnostic detail or error message")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Additional component metadata")


class HealthResponse(BaseModel):
    status: str = Field(..., description="Overall platform status: 'ok', 'degraded', or 'error'")
    version: str = Field(default="1.0.0", description="API version")
    services: Dict[str, ServiceStatus] = Field(..., description="Individual dependency health states")

