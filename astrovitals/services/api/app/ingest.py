"""DTN-aware ingest pipeline for AstraVitals.

Verifies signatures / sequence numbers, deduplicates readings, writes reading +
interpretation + audit to the database, and packages outbound sync bundles
(Ed25519-signed, SHA-256-hashed).
"""

import base64
import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession

from .db import (
    append_audit,
    compute_interpretation,
    get_or_compute_baseline,
    get_readings_for_astronaut,
    insert_reading,
)
from .models import Outbox

OutboxStatus = Literal["pending", "synced", "failed"]


async def add_to_outbox(
    session: AsyncSession,
    *,
    astronaut_id: str,
    payload_type: str,
    payload: Dict[str, Any],
) -> Outbox:
    """Add a package to the outbox for DTN store-and-forward."""
    package = Outbox(
        id=func.gen_random_uuid(),
        astronaut_id=astronaut_id,
        payload_type=payload_type,
        payload_json=json.dumps(payload),
        status="pending",
        created_at=datetime.now(timezone.utc),
    )
    session.add(package)
    await session.flush()
    return package


async def get_pending_outbox(session: AsyncSession) -> List[Outbox]:
    """Return all pending outbox packages."""
    from .models import Outbox

    result = await session.execute(
        select(Outbox).where(Outbox.status == "pending")  # type: ignore[attr-defined]
    )
    return list(result.scalars().all())


async def mark_outbox_synced(session: AsyncSession, package_id: str) -> None:
    """Mark an outbox package as synced."""
    from .models import Outbox

    package = await session.get(Outbox, package_id)
    if package is not None:
        package.status = "synced"
        package.last_attempt_at = datetime.now(timezone.utc)
        await session.flush()


async def mark_outbox_failed(session: AsyncSession, package_id: str) -> None:
    """Mark an outbox package as failed; increment attempt counter."""
    from .models import Outbox

    package = await session.get(Outbox, package_id)
    if package is not None:
        package.status = "failed"
        package.attempts = (package.attempts or 0) + 1
        package.last_attempt_at = datetime.now(timezone.utc)
        await session.flush()


async def process_ingest_bundle(
    session: AsyncSession,
    *,
    astronaut_id: str,
    payload: Dict[str, Any],
    signature_b64: str,
    hash_hex: str,
) -> Dict[str, Any]:
    """Full inbound DTN bundle processing.

    Steps:
      1. Verify Ed25519 signature over SHA-256 hash of canonical payload
      2. Deduplicate (check if an identical reading already exists within 1h)
      3. Parse reading data
      4. Compute interpretation via engine
      5. Persist reading + interpretation
      6. Append audit log
      7. Add to outbox for DTN downstream
    """
    from .security.keys import verify_bundle_signature

    valid, reason = verify_bundle_signature(payload, hash_hex, signature_b64)
    if not valid:
        await append_audit(
            session,
            astronaut_id=astronaut_id,
            action="bundle_verification_failed",
            details={"reason": reason, "payload_keys": list(payload.keys())},
        )
        raise HTTPException(status_code=400, detail=f"Bundle verification failed: {reason}")

    # Deduplication: same metric + value within 5% + within last hour.
    recent = await get_readings_for_astronaut(session, astronaut_id)
    value_in = payload.get("value")
    for r in recent:
        if r.metric != payload.get("metric"):
            continue
        if value_in is None:
            continue
        denom = max(abs(value_in), 1.0)
        if abs(r.value - value_in) / denom >= 0.05:
            continue
        if (datetime.now(timezone.utc) - r.recorded_at).total_seconds() > 3600:
            continue
        await append_audit(
            session,
            astronaut_id=astronaut_id,
            action="bundle_duplicate_skipped",
            details={"existing_reading_id": r.id, "metric": r.metric},
        )
        return {"status": "duplicate_skipped", "existing_id": r.id}

    reading_data = payload.get("reading", {})
    metric = reading_data.get("metric")
    value = reading_data.get("value")
    if not metric or value is None:
        raise HTTPException(status_code=400, detail="Invalid reading payload")

    interpretation = await compute_interpretation(
        session, astronaut_id, metric, value
    )

    reading = await insert_reading(
        session,
        astronaut_id=astronaut_id,
        metric=metric,
        value=value,
        unit=reading_data.get("unit", "unknown"),
        source=reading_data.get("source", "AUTOMATED"),
        trend=reading_data.get("trend", "stable"),
        is_first_of_day=reading_data.get("is_first_of_day", False),
        interpretation=interpretation,
    )

    await append_audit(
        session,
        astronaut_id=astronaut_id,
        action="ingest_vital",
        details={
            "metric": metric,
            "status": interpretation["status"],
            "source": reading_data.get("source", "AUTOMATED"),
        },
    )

    await add_to_outbox(
        session,
        astronaut_id=astronaut_id,
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
            "interpretation": interpretation,
        },
    )

    return {
        "status": "accepted",
        "reading_id": reading.id,
        "interpretation": interpretation,
    }
