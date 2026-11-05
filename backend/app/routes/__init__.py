from backend.app.routes.health import router as health_router
from backend.app.routes.incidents import router as incidents_router
from backend.app.routes.memory import router as memory_router
from backend.app.routes.analytics import router as analytics_router

__all__ = [
    "health_router",
    "incidents_router",
    "memory_router",
    "analytics_router"
]
