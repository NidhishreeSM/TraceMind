from datetime import datetime, timezone
import json
from typing import Generator, List, Optional
from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer, String, Text, create_engine
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker, Session
from backend.app.core.config import settings
from backend.app.core.logging import logger

# Create engine
connect_args = {}
if settings.is_sqlite():
    connect_args["check_same_thread"] = False

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_utc_now():
    return datetime.now(timezone.utc)


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String(50), primary_key=True, index=True)
    sequence_num = Column(Integer, autoincrement=True, unique=True, nullable=True)
    title = Column(String(255), nullable=False)
    service = Column(String(100), nullable=False, index=True)
    environment = Column(String(50), nullable=False, default="production")
    severity = Column(String(50), nullable=False, default="high")
    status = Column(String(50), nullable=False, default="open", index=True)
    symptoms = Column(Text, nullable=False)
    error_logs = Column(Text, nullable=True)
    is_demo = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    analyses = relationship("Analysis", back_populates="incident", cascade="all, delete-orphan", order_by="Analysis.created_at.desc()")
    resolution = relationship("Resolution", back_populates="incident", uselist=False, cascade="all, delete-orphan")
    feedbacks = relationship("Feedback", back_populates="incident", cascade="all, delete-orphan", order_by="Feedback.created_at.desc()")


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    incident_id = Column(String(50), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    use_memory = Column(Boolean, nullable=False, default=True)
    model_used = Column(String(100), nullable=False)
    latency_ms = Column(Integer, nullable=False, default=0)
    hypotheses_json = Column(Text, nullable=False)          # JSON list of AI hypotheses
    investigation_steps_json = Column(Text, nullable=False) # JSON list of strings
    recommendation = Column(Text, nullable=False)
    uncertainty_note = Column(Text, nullable=False)
    recalled_memories_json = Column(Text, nullable=True)    # JSON list of exact Hindsight recall items
    created_at = Column(DateTime, default=get_utc_now, nullable=False)

    incident = relationship("Incident", back_populates="analyses")


class Resolution(Base):
    __tablename__ = "resolutions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    incident_id = Column(String(50), ForeignKey("incidents.id", ondelete="CASCADE"), unique=True, nullable=False)
    confirmed_cause = Column(Text, nullable=False)
    steps_taken_json = Column(Text, nullable=False)         # JSON list of strings
    verified_resolution = Column(Text, nullable=False)
    failed_attempts_json = Column(Text, nullable=True)      # JSON list of strings
    outcome = Column(Text, nullable=True)
    retained_in_hindsight = Column(Boolean, default=False)
    hindsight_document_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)

    incident = relationship("Incident", back_populates="resolution")


class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    incident_id = Column(String(50), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    analysis_id = Column(Integer, nullable=True)
    feedback_type = Column(String(50), nullable=False)      # "accept", "reject", "modify"
    notes = Column(Text, nullable=True)
    modified_recommendation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)

    incident = relationship("Incident", back_populates="feedbacks")


def init_db():
    """Initializes database schema cleanly without migrations."""
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database schema initialized successfully.")


def get_db() -> Generator[Session, None, None]:
    """Dependency that yields a database session and safely closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
