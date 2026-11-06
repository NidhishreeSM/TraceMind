import re
from typing import Optional
from fastapi import HTTPException, status
from backend.app.core.config import settings


def sanitize_error_message(message: str) -> str:
    """Strips secret keys and tokens from user-facing error messages."""
    sanitized = str(message)
    # Redact configured API keys if present
    for secret in [settings.HINDSIGHT_API_KEY, settings.GROQ_API_KEY]:
        if secret and len(secret) > 6 and secret in sanitized:
            sanitized = sanitized.replace(secret, f"{secret[:4]}...[REDACTED]")

    # Redact common key prefixes
    sanitized = re.sub(r"hsk_[A-Za-z0-9_\-]+", "hsk_...[REDACTED]", sanitized)
    sanitized = re.sub(r"gsk_[A-Za-z0-9_\-]+", "gsk_...[REDACTED]", sanitized)
    return sanitized


class HindsightUnavailableException(HTTPException):
    def __init__(self, message: str = "Hindsight memory service is currently unavailable."):
        sanitized = sanitize_error_message(message)
        super().__init__(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=sanitized,
            headers={"X-Error-Code": "HINDSIGHT_UNAVAILABLE"}
        )
        self.code = "HINDSIGHT_UNAVAILABLE"


class LLMUnavailableException(HTTPException):
    def __init__(self, message: str = "LLM inference service is currently unavailable."):
        sanitized = sanitize_error_message(message)
        super().__init__(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=sanitized,
            headers={"X-Error-Code": "LLM_UNAVAILABLE"}
        )
        self.code = "LLM_UNAVAILABLE"

