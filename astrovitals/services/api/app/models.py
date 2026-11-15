"""SQLAlchemy + TimescaleDB models for AstraVitals ground backend.

Pydantic + ORM models for readings, interpretations, baselines, audit events,
and reminders. TimescaleDB hypertables are created via Alembic migrations.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    func,
    select,
)
from sqlalchemy.orm import relationship
from sqlalchemy.ext.asyncio import AsyncAttrs, AsyncSession

from .db import Base


class Astronaut(Base, AsyncAttrs):
    __tablename__ = "astronauts"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)  # ASTRONAUT, MEDICAL_OFFICER, MISSION_CONTROL
    environment = Column(String, nullable=False)  # Spacecraft, Space Station, Rover, Base
    status = Column(String, default="healthy")  # healthy, watch, critical
    mission_start = Column(Integer, nullable=True)  # MET in hours
    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=True,
    )

    readings = relationship(
        "Reading", back_populates="astronaut", cascade="all, delete-orphan"
    )
    baselines = relationship(
        "Baseline", back_populates="astronaut", cascade="all, delete-orphan"
    )
    achievements = relationship(
        "Achievement", back_populates="astronaut", cascade="all, delete-orphan"
    )
    reminders = relationship(
        "Reminder", back_populates="astronaut", cascade="all, delete-orphan"
    )
    audit_events = relationship(
        "AuditEvent", back_populates="astronaut", cascade="all, delete-orphan"
    )


class Reading(Base, AsyncAttrs):
    __tablename__ = "readings"

    id = Column(String, primary_key=True, index=True)
    astronaut_id = Column(
        String, ForeignKey("astronauts.id"), nullable=False, index=True
    )
    metric = Column(String, nullable=False)
    value = Column(Float, nullable=False)
    unit = Column(String, default="unknown")
    source = Column(String, default="MANUAL")  # MANUAL, CAMERA, AUTOMATED
    trend = Column(String, default="stable")  # improving, stable, declining
    is_first_of_day = Column(Boolean, default=False)
    recorded_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    astronaut = relationship("Astronaut", back_populates="readings")
    interpretation = relationship(
        "Interpretation",
        back_populates="reading",
        uselist=False,
        cascade="save-update, merge",
    )


class Interpretation(Base, AsyncAttrs):
    __tablename__ = "interpretations"

    id = Column(String, primary_key=True, index=True)
    reading_id = Column(
        String, ForeignKey("readings.id"), unique=True, nullable=False, index=True
    )
    status = Column(String, nullable=False)  # GREEN, YELLOW, RED
    reason = Column(Text, nullable=False)
    guidance = Column(Text, nullable=False)
    computed_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    reading = relationship("Reading", back_populates="interpretation")


class Baseline(Base, AsyncAttrs):
    __tablename__ = "baselines"

    id = Column(String, primary_key=True, index=True)
    astronaut_id = Column(
        String, ForeignKey("astronauts.id"), nullable=False, index=True
    )
    metric = Column(String, nullable=False)
    normal_min = Column(Float, nullable=False)
    normal_max = Column(Float, nullable=False)
    calculated_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    reading_count = Column(Integer, default=0)

    astronaut = relationship("Astronaut", back_populates="baselines")


class Achievement(Base, AsyncAttrs):
    __tablename__ = "achievements"

    id = Column(String, primary_key=True, index=True)
    astronaut_id = Column(
        String, ForeignKey("astronauts.id"), nullable=False, index=True
    )
    type = Column(String, nullable=False)
    earned_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    astronaut = relationship("Astronaut", back_populates="achievements")


class Reminder(Base, AsyncAttrs):
    __tablename__ = "reminders"

    id = Column(String, primary_key=True, index=True)
    astronaut_id = Column(
        String, ForeignKey("astronauts.id"), nullable=False, index=True
    )
    type = Column(String, nullable=False)
    cron_expression = Column(String, nullable=False)
    message = Column(String, nullable=False)
    active = Column(Boolean, default=True)
    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    astronaut = relationship("Astronaut", back_populates="reminders")


class Outbox(Base, AsyncAttrs):
    __tablename__ = "outbox"

    id = Column(String, primary_key=True, index=True)
    astronaut_id = Column(
        String, ForeignKey("astronauts.id"), nullable=False, index=True
    )
    payload_type = Column(String, nullable=False)
    payload_json = Column(Text, nullable=False)
    status = Column(String, nullable=False, default="pending")
    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    attempts = Column(Integer, default=0)
    last_attempt_at = Column(DateTime, nullable=True)



class AuditEvent(Base, AsyncAttrs):
    __tablename__ = "audit_events"

    id = Column(String, primary_key=True, index=True)
    astronaut_id = Column(
        String, ForeignKey("astronauts.id"), nullable=True, index=True
    )
    action = Column(String, nullable=False)
    details = Column(Text, nullable=True)  # JSON string
    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    astronaut = relationship("Astronaut", back_populates="audit_events")
