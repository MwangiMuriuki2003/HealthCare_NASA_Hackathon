"""Database setup for the AstraVitals FastAPI backend.

Provides the SQLAlchemy async engine, session factory, Base declarative
metaclass and small helpers used by the route handlers.
"""

import json
from collections.abc import AsyncGenerator
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy import create_async_engine, select, func
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

DATABASE_URL = "postgresql+asyncpg://astro_user:password@localhost:5432/astronotes"

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async session and rolls it back on error."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def insert_reading(
    session: AsyncSession,
    *,
    astronaut_id: str,
    metric: str,
    value: float,
    unit: str = "unknown",
    source: str = "MANUAL",
    trend: str = "stable",
    is_first_of_day: bool = False,
    interpretation: dict | None = None,
) -> "Reading":
    """Persist a vital reading + optional interpretation.

    Imported by main.py for the crew ingest endpoint.
    """
    from .models import Reading, Interpretation

    reading = Reading(
        id=func.gen_random_uuid(),
        astronaut_id=astronaut_id,
        metric=metric,
        value=value,
        unit=unit,
        source=source,
        trend=trend,
        is_first_of_day=is_first_of_day,
        recorded_at=datetime.now(timezone.utc),
    )
    session.add(reading)
    await session.flush()

    if interpretation:
        interp = Interpretation(
            id=func.gen_random_uuid(),
            reading_id=reading.id,
            status=interpretation["status"],
            reason=interpretation["reason"],
            guidance=interpretation["guidance"],
            computed_at=datetime.now(timezone.utc),
        )
        session.add(interp)
        await session.flush()

    return reading


async def compute_interpretation(
    session: AsyncSession,
    astronaut_id: str,
    metric: str,
    value: float,
) -> dict:
    """Compute GREEN/YELLOW/RED status for a reading against baseline ranges."""
    from .models import Baseline

    stmt = select(Baseline).where(
        Baseline.astronaut_id == astronaut_id,
        Baseline.metric == metric,
    )
    result = await session.execute(stmt)
    baseline = result.scalar_one_or_none()

    if baseline is not None:
        normal_min, normal_max = baseline.normal_min, baseline.normal_max
    else:
        default_ranges = {
            "HEART_RATE": (60, 100),
            "BLOOD_PRESSURE_SYSTOLIC": (90, 120),
            "BLOOD_PRESSURE_DIASTOLIC": (60, 80),
            "BLOOD_GLUCOSE": (70, 140),
            "BODY_TEMPERATURE": (36.1, 37.2),
            "SLEEP_DURATION": (7, 9),
        }
        normal_min, normal_max = default_ranges.get(
            metric, (60, 100)
        )

    warning = (normal_max - normal_min) * 0.1
    low_watch = normal_min - warning
    high_watch = normal_max + warning

    if not (low_watch <= value <= high_watch):
        status = "RED"
        reason = (
            f"{metric} critically"
            + (" below" if value < normal_min else " above")
            + f" normal range ({normal_min}-{normal_max})"
        )
    elif not (normal_min <= value <= normal_max):
        status = "YELLOW"
        reason = (
            f"{metric} slightly"
            + (" below" if value < normal_min else " above")
            + f" normal range ({normal_min}-{normal_max})"
        )
    else:
        status = "GREEN"
        reason = f"{metric} within normal range ({normal_min}-{normal_max})"

    return {
        "status": status,
        "reason": reason,
        "guidance": _guidance(status, metric),
    }


def _guidance(status: str, metric: str) -> str:
    guidance = {
        "HEART_RATE": {
            "GREEN": "Continue normal mission activities.",
            "YELLOW": "Rest 10 minutes and retake. Notify Medical Officer if still abnormal.",
            "RED": "Sit down, stay calm, notify Medical Officer now. Repeat in 5 minutes.",
        },
        "BLOOD_PRESSURE_SYSTOLIC": {
            "GREEN": "Continue normal mission activities.",
            "YELLOW": "Rest 10 minutes and retake. Notify Medical Officer if systolic stays above 130 mmHg.",
            "RED": "Lie down, hydrate, notify Medical Officer now. Do not start strenuous tasks.",
        },
        "BLOOD_PRESSURE_DIASTOLIC": {
            "GREEN": "Continue normal mission activities.",
            "YELLOW": "Rest 10 minutes and retake. Notify Medical Officer if diastolic stays above 90 mmHg.",
            "RED": "Lie down, hydrate, notify Medical Officer now.",
        },
        "BLOOD_GLUCOSE": {
            "GREEN": "Continue normal meal and hydration schedule.",
            "YELLOW": "Follow meal plan and retest in 30 minutes.",
            "RED": "Follow hypo/hyperglycaemia protocol, retest in 15 minutes, notify Medical Officer.",
        },
        "BODY_TEMPERATURE": {
            "GREEN": "Continue normal mission activities.",
            "YELLOW": "Rest, hydrate, retake in 30 minutes. Notify Medical Officer if above 38 C.",
            "RED": "Start cooling measures, hydrate, notify Medical Officer now.",
        },
        "SLEEP_DURATION": {
            "GREEN": "Recovery is adequate for mission duties.",
            "YELLOW": "Schedule a sleep opportunity soon; avoid critical tasks while tired.",
            "RED": "Notify Medical Officer and postpone critical tasks until rest is restored.",
        },
    }
    return guidance.get(metric, {}).get(
        status, "Monitor and consult Medical Officer if symptoms persist."
    )


async def get_readings_for_astronaut(
    session: AsyncSession, astronaut_id: str
):
    """Return all readings for an astronaut, newest first."""
    from .models import Reading

    result = await session.execute(
        select(Reading)
        .where(Reading.astronaut_id == astronaut_id)
        .order_by(Reading.recorded_at.desc())
    )
    return list(result.scalars().all())


async def get_or_compute_baseline(
    session: AsyncSession, astronaut_id: str
) -> dict:
    """Return existing baseline per metric, or compute from recent readings."""
    from .models import Baseline, Reading

    result = await session.execute(
        select(Baseline).where(Baseline.astronaut_id == astronaut_id)
    )
    baselines = list(result.scalars().all())
    if baselines:
        return {
            "astronaut_id": astronaut_id,
            "metrics": {
                b.metric: [b.normal_min, b.normal_max] for b in baselines
            },
            "updated_at": baselines[0].calculated_at,
        }

    thirty_days_ago = func.now() - func.interval("30 days")
    result = await session.execute(
        select(Reading).where(
            Reading.astronaut_id == astronaut_id,
            Reading.recorded_at >= thirty_days_ago,
        )
    )
    readings = list(result.scalars().all())
    if not readings:
        return {"astronaut_id": astronaut_id, "metrics": {}, "updated_at": func.now()}

    metrics: dict[str, list[float]] = {}
    for r in readings:
        metrics.setdefault(r.metric, []).append(r.value)

    computed = {
        m: [min(vs), max(vs)] for m, vs in metrics.items() if vs
    }

    for metric, (lo, hi) in computed.items():
        session.add(
            Baseline(
                id=func.gen_random_uuid(),
                astronaut_id=astronaut_id,
                metric=metric,
                normal_min=lo,
                normal_max=hi,
                calculated_at=datetime.now(timezone.utc),
                reading_count=len(metrics[metric]),
            )
        )
    await session.flush()

    return {"astronaut_id": astronaut_id, "metrics": computed, "updated_at": func.now()}


async def check_and_award_achievements(
    session: AsyncSession,
    astronaut_id: str,
    achievement_type: str,
) -> dict:
    """Record an achievement for an astronaut if it does not already exist."""
    from .models import Achievement

    existing = await session.execute(
        select(Achievement).where(
            Achievement.astronaut_id == astronaut_id,
            Achievement.type == achievement_type,
        )
    )
    if existing.scalar_one_or_none():
        return {"status": "duplicate", "type": achievement_type}

    achievement = Achievement(
        id=func.gen_random_uuid(),
        astronaut_id=astronaut_id,
        type=achievement_type,
        earned_at=datetime.now(timezone.utc),
    )
    session.add(achievement)
    await session.flush()
    return {"status": "awarded", "id": achievement.id, "type": achievement_type}


async def insert_reminder(
    session: AsyncSession,
    *,
    astronaut_id: str,
    type: str,
    cron_expression: str,
    message: str,
) -> "Reminder":
    """Create a cron-based reminder for an astronaut."""
    from .models import Reminder

    reminder = Reminder(
        id=func.gen_random_uuid(),
        astronaut_id=astronaut_id,
        type=type,
        cron_expression=cron_expression,
        message=message,
        active=True,
        created_at=datetime.now(timezone.utc),
    )
    session.add(reminder)
    await session.flush()
    return reminder


async def get_aggregate_stats(session: AsyncSession) -> dict:
    """Aggregate stats for Mission Control."""
    from .models import Reading, Astronaut, Interpretation

    total_readings = (
        (await session.execute(select(func.count()).select_from(Reading)))
        .scalar()
        or 0
    )
    red_count = (
        (
            await session.execute(
                select(func.count())
                .select_from(Reading)
                .join(Interpretation, Reading.id == Interpretation.reading_id)
                .where(Interpretation.status == "RED")
            )
        )
        .scalar()
        or 0
    )
    astronauts_count = (
        (await session.execute(select(func.count()).select_from(Astronaut)))
        .scalar()
        or 0
    )

    env_result = await session.execute(
        select(Astronaut.environment, func.count())
        .select_from(Astronaut)
        .group_by(Astronaut.environment)
    )
    env_breakdown = {row[0]: row[1] for row in env_result.all()}

    return {
        "total_readings": total_readings,
        "red_alerts": red_count,
        "astronauts_count": astronauts_count,
        "environment_breakdown": env_breakdown,
    }


async def append_audit(
    session: AsyncSession,
    *,
    astronaut_id: Optional[str],
    action: str,
    details: Optional[Dict[str, Any]] = None,
) -> "AuditEvent":
    """Append an append-only audit event."""
    from .models import AuditEvent

    event = AuditEvent(
        id=func.gen_random_uuid(),
        astronaut_id=astronaut_id,
        action=action,
        details=(json.dumps(details) if details else None),
        created_at=datetime.now(timezone.utc),
    )
    session.add(event)
    await session.flush()
    return event


async def get_anonymized_cohort(session: AsyncSession) -> dict:
    """Anonymized aggregate stats for research cohorts."""
    from .models import Reading

    total = (
        (await session.execute(select(func.count()).select_from(Reading)))
        .scalar()
        or 0
    )
    by_metric = (
        await session.execute(
            select(
                Reading.metric,
                func.avg(Reading.value).label("avg"),
                func.count(),
            )
            .group_by(Reading.metric)
        )
    ).all()

    return {
        "total_readings": total,
        "by_metric": {
            metric: {"average": round(float(avg), 2), "count": int(cnt)}
            for metric, avg, cnt in by_metric
        },
    }
