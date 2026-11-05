import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = Field(
        default="sqlite:///./tracemind.db",
        description="Database connection string (PostgreSQL in Docker or SQLite fallback)"
    )

    # Hindsight
    HINDSIGHT_BASE_URL: str = Field(
        default="https://api.hindsight.vectorize.io",
        description="Hindsight server URL (Cloud or self-hosted)"
    )
    HINDSIGHT_API_KEY: Optional[str] = Field(
        default=None,
        description="API key for Hindsight (required for Cloud or authenticated self-hosted)"
    )
    HINDSIGHT_BANK_ID: str = Field(
        default="tracemind-production",
        description="Memory bank namespace for TraceMind"
    )

    # Groq AI
    GROQ_API_KEY: Optional[str] = Field(
        default=None,
        description="Groq API key for LLM inference"
    )
    GROQ_MODEL: str = Field(
        default="openai/gpt-oss-120b",
        description="Primary Groq model for incident analysis"
    )
    GROQ_FALLBACK_MODEL: str = Field(
        default="qwen/qwen3-32b",
        description="Fallback Groq model if primary is rate limited or unavailable"
    )

    # Security & CORS
    FRONTEND_ORIGIN: str = Field(
        default="http://localhost:3000",
        description="Allowed origin for CORS from React frontend"
    )

    # App server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

    def get_missing_credentials(self) -> List[str]:
        """Returns list of essential external credentials missing from environment."""
        missing = []
        if not self.GROQ_API_KEY or self.GROQ_API_KEY.startswith("your_"):
            missing.append("GROQ_API_KEY")
        if not self.HINDSIGHT_API_KEY or self.HINDSIGHT_API_KEY.startswith("your_"):
            missing.append("HINDSIGHT_API_KEY")
        return missing

    def is_sqlite(self) -> bool:
        return self.DATABASE_URL.startswith("sqlite")


# Global settings instance
settings = Settings()

