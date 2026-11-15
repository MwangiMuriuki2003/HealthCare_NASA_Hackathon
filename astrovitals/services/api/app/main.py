"""FastAPI ground back-end for AstraVitals.

- API-key auth for service-to-service calls
- TimescaleDB-backed sessions + append-only audit log
- Bundle verification (Ed25519 + SHA-256)
- DTN-aware ingest endpoint (+ outbox queue)
- Role-based routes: astronaut / medical officer / mission control
"""

import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import Depends, FastAPI, HTTPException, Security
from fastapi.security import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .db import (
    append_audit,
    engine,
    get_session,
    get_aggregate_stats,
    get_anonymized_cohort,
    get_or_compute_baseline,
    get_readings_for_astronaut,
    insert_reading,
    insert_reminder,
)
from .models import Astronaut, Reading
from .rbac import rbac_dependency, UserRole
from .ingest import add_to_outbox
from .security.keys import verify_bundle_signature
from .security.verify import verify_api_key

app = FastAPI(
    title="AstraVitals API",
    description="Ground back-end for AstraVitals astronaut health monitoring",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://astra-vitals.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_db():
    async with engine.begin() as conn:
        await conn.run_sync(lambda c: None)  # placeholder: Alembic handles DDL


API_KEY_NAME = "X-API-Key"


def get_api_key(
    api_key: str = Security(APIKeyHeader(name=API_KEY_NAME)),
) -> str:
    """Validate API key for service-to-service calls."""
    if not verify_api_key(api_key):
        raise HTTPException(status_code=403, detail="Invalid API key")
    return api_key


class VitalReadingCreate(BaseModel):
    astronaut_id: str
    metric: str
    value: float
    unit: str = "unknown"
    source: str = "MANUAL"
    trend: str = "stable"
    is_first_of_day: bool = False


class VitalReadingResponse(VitalReadingCreate):
    id: str
    recorded_at: datetime
    interpretation: Optional[Dict[str, Any]] = None

    model_config = {"from_attributes": True}


class InterpretationCreate(BaseModel):
    astronaut_id: str
    metric: str
    value: float
    status: str
    reason: str
    guidance: str


class AchievementCreate(BaseModel):
    astronaut_id: str
    achievement_type: str


class ReminderCreate(BaseModel):
    astronaut_id: str
    type: str
    cron_expression: str
    message: str


class BundlePayload(BaseModel):
    payload: Dict[str, Any]
    hash: str
    signature: str


@app.get("/healthz", include_in_schema=False)
async def healthz() -> dict:
    return {"status": "healthy"}


@app.get("/db-health", include_in_schema=False)
async def db_health(session: AsyncSession = Depends(get_session)) -> dict:
    await session.execute(select(1))
    return {"status": "ok"}


@app.post("/crew/readings", response_model=VitalReadingResponse, status_code=201)
async def crew_ingest_reading(
    reading_data: VitalReadingCreate,
    session: AsyncSession = Depends(get_session),
    _: str = Depends(
        rbac_dependency([UserRole.ASTRONAUT, UserRole.MEDICAL_OFFICER])
    ),
):
    """Ingest a single vital reading (astronaut enters via PWA)."""
    from .db import compute_interpretation

    interpretation_result = await compute_interpretation(
        session,
        reading_data.astronaut_id,
        reading_data.metric,
        reading_data.value,
    )

    reading = await insert_reading(
        session,
        astronaut_id=reading_data.astronaut_id,
        metric=reading_data.metric,
        value=reading_data.value,
        unit=reading_data.unit,
        source=reading_data.source,
        trend=reading_data.trend,
        is_first_of_day=reading_data.is_first_of_day,
        interpretation=interpretation_result,
    )

    await append_audit(
        session,
        astronaut_id=reading_data.astronaut_id,
        action="ingest_vital",
        details={"metric": reading_data.metric, "status": interpretation_result["status"]},
    )

    await add_to_outbox(
        session,
        astronaut_id=reading_data.astronaut_id,
        payload_type="vital-reading",
        payload={
            "reading": {
                "id": reading.id,
                "astronaut_id": reading.astronaut_id,
                "metric": reading.metric,
                "value": reading.value,
                "unit": reading.unit,
                "source": reading.source,
                "recorded_at": reading.recorded_at.isoformat(),
            },
            "interpretation": interpretation_result,
        },
    )

    return VitalReadingResponse(
        id=reading.id,
        astronaut_id=reading.astronaut_id,
        metric=reading.metric,
        value=reading.value,
        unit=reading.unit,
        source=reading.source,
        trend=reading.trend,
        is_first_of_day=reading.is_first_of_day,
        recorded_at=reading.recorded_at,
        interpretation=interpretation_result,
    )


@app.get("/crew/astronauts/{astronaut_id}/readings")
async def crew_get_readings(
    astronaut_id: str,
    session: AsyncSession = Depends(get_session),
    _: str = Depends(
        rbac_dependency(
            [
                UserRole.ASTRONAUT,
                UserRole.MEDICAL_OFFICER,
                UserRole.MISSION_CONTROL,
            ]
        )
    ),
):
    """Get all readings for an astronaut."""
    readings = await get_readings_for_astronaut(session, astronaut_id)
    return [
        {
            "id": r.id,
            "astronaut_id": r.astronaut_id,
            "metric": r.metric,
            "value": r.value,
            "unit": r.unit,
            "source": r.source,
            "trend": r.trend,
            "is_first_of_day": r.is_first_of_day,
            "recorded_at": r.recorded_at,
            "interpretation": (
                {"status": i.status, "reason": i.reason, "guidance": i.guidance}
                if (i := r.interpretation) is not None
                else None
            ),
        }
        for r in readings
    ]


@app.get("/crew/astronauts/{astronaut_id}/baseline")
async def crew_get_baseline(
    astronaut_id: str,
    session: AsyncSession = Depends(get_session),
    _: str = Depends(
        rbac_dependency(
            [
                UserRole.ASTRONAUT,
                UserRole.MEDICAL_OFFICER,
                UserRole.MISSION_CONTROL,
            ]
        )
    ),
):
    """Get or compute baseline for an astronaut."""
    return await get_or_compute_baseline(session, astronaut_id)


@app.post("/crew/achievements", status_code=201)
async def crew_check_achievements(
    achievement_data: AchievementCreate,
    session: AsyncSession = Depends(get_session),
    _: str = Depends(
        rbac_dependency(
            [
                UserRole.ASTRONAUT,
                UserRole.MEDICAL_OFFICER,
                UserRole.MISSION_CONTROL,
            ]
        )
    ),
):
    """Check and award an achievement for an astronaut."""
    from .db import check_and_award_achievements

    return await check_and_award_achievements(
        session, achievement_data.astronaut_id, achievement_data.achievement_type
    )


@app.post("/crew/reminders", status_code=201)
async def crew_create_reminder(
    reminder_data: ReminderCreate,
    session: AsyncSession = Depends(get_session),
    _: str = Depends(rbac_dependency([UserRole.MEDICAL_OFFICER])),
):
    """Create a cron-based reminder for an astronaut."""
    reminder = await insert_reminder(
        session,
        astronaut_id=reminder_data.astronaut_id,
        type=reminder_data.type,
        cron_expression=reminder_data.cron_expression,
        message=reminder_data.message,
    )
    return {"id": reminder.id, "message": reminder.message, "active": reminder.active}


@app.get("/mission-control/aggregate", include_in_schema=False)
async def mission_control_aggregate(
    session: AsyncSession = Depends(get_session),
    _: str = Depends(rbac_dependency([UserRole.MISSION_CONTROL])),
):
    """Aggregate view across all astronauts."""
    return await get_aggregate_stats(session)


@app.get("/research/cohort", include_in_schema=False)
async def research_cohort(
    session: AsyncSession = Depends(get_session),
    _: str = Depends(rbac_dependency([UserRole.RESEARCHER])),
):
    """Anonymized, consented data access for researchers."""
    return await get_anonymized_cohort(session)


@app.post("/security/verify-bundle", include_in_schema=False)
async def verify_bundle_endpoint(
    bundle: BundlePayload,
    api_key: str = Depends(get_api_key),
):
    """Verify a signed sync bundle (DTN inbound)."""
    valid, reason = verify_bundle_signature(
        bundle.payload, bundle.hash, bundle.signature
    )
    return {"valid": valid, "reason": reason}


def run_migrations() -> None:
    """Entry point for Alembic DB migrations."""
    import subprocess

    subprocess.run(["alembic", "upgrade", "head"], check=True)


def main() -> None:
    """Entry point for running the AstraVitals API."""
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)


if __name__ == "__main__":
    main()
