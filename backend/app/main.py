from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.models.database import init_db
from backend.app.routes import (
    health_router, incidents_router, memory_router, analytics_router
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Database schema
    logger.info("TraceMind Backend starting up...")
    logger.info("Tagline: 'Every incident teaches. Every resolution makes us smarter.'")
    init_db()

    # Log actionable credential advisory if any keys are missing
    missing_creds = settings.get_missing_credentials()
    if missing_creds:
        logger.warning(
            f"Advisory: The following credentials are not configured in .env: {', '.join(missing_creds)}. "
            f"Health endpoints will report degraded status until configured."
        )
    else:
        logger.info("All required external credentials detected.")

    yield

    # Shutdown
    logger.info("TraceMind Backend shutting down...")


app = FastAPI(
    title="TraceMind Incident Intelligence API",
    description="AI-powered incident response platform using persistent memory to learn from past incidents. 'Every incident teaches. Every resolution makes us smarter.'",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration: strictly limited to the specified frontend origin
origins = [settings.FRONTEND_ORIGIN]
if settings.ENVIRONMENT == "development":
    # Also permit localhost variants in local development
    origins.extend([
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ])
# Deduplicate while preserving order
allowed_origins = list(dict.fromkeys(origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global Exception Handlers ensuring consistent Error Format
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    code_mapping = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "CONFLICT",
        422: "UNPROCESSABLE_ENTITY",
        500: "INTERNAL_ERROR",
        503: "SERVICE_UNAVAILABLE"
    }
    error_code = code_mapping.get(exc.status_code, "ERROR")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": error_code,
                "message": str(exc.detail),
                "details": getattr(exc, "headers", None)
            }
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request payload or parameters",
                "details": exc.errors()
            }
        }
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred. Please check server logs.",
                "details": str(exc) if settings.ENVIRONMENT == "development" else None
            }
        }
    )


# Mount API Routers under /api
app.include_router(health_router, prefix="/api")
app.include_router(incidents_router, prefix="/api")
app.include_router(memory_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")


@app.get("/", tags=["Root"])
def root_info():
    return {
        "name": "TraceMind Incident Intelligence API",
        "tagline": "Every incident teaches. Every resolution makes us smarter.",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health"
    }

