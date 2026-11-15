"""Role-Based Access Control for AstraVitals Ground Backend.

Ground-side view gating (astronaut / medical officer / mission control /
planner / researcher / admin). Role dependency for FastAPI ``Depends()``.

WARNING: the prototype role check reads ``X-User-Role`` from a header, which is
spoofable by any client. In production the role MUST come from a verified JWT
claim or an mTLS certificate Subject DN mapped server-side.
"""

from collections.abc import Callable
from typing import Any, Dict, List, Literal

from fastapi import Header, HTTPException

UserRole = Literal[
    "ASTRONAUT",
    "MEDICAL_OFFICER",
    "MISSION_CONTROL",
    "PLANNER",
    "RESEARCHER",
    "ADMIN",
]

PERMISSIONS: Dict[str, set] = {
    "ASTRONAUT": {
        "read_own_readings",
        "log_vitals",
        "view_own_achievements",
    },
    "MEDICAL_OFFICER": {
        "read_all_readings",
        "view_all_achievements",
        "create_reminders",
        "update_astronaut_status",
    },
    "MISSION_CONTROL": {
        "read_all_readings",
        "aggregate_dashboard",
        "csv_export",
    },
    "PLANNER": {
        "view_mission_planning_dashboard",
        "read_all_readings",
    },
    "RESEARCHER": {
        "read_anonymized_cohort",
        "consented_data_access",
    },
    "ADMIN": {
        "full_access",
        "user_management",
        "system_config",
    },
}


def rbac_dependency(allowed_roles: List[UserRole]) -> Callable:
    """FastAPI dependency that checks the caller has one of the allowed roles.

    In production this should decode a verified JWT (Authorization: Bearer) or
    validate the mTLS client certificate Subject DN. The header-based check below
    is for demo / local testing only.
    """

    async def dependency(
        x_user_role: str = Header(default="", alias="X-User-Role"),
    ) -> str:
        if not x_user_role:
            raise HTTPException(status_code=401, detail="Authentication required")

        if x_user_role not in set(allowed_roles):
            raise HTTPException(
                status_code=403,
                detail=(
                    f"Role '{x_user_role}' not authorized for this endpoint. "
                    f"Allowed: {allowed_roles}"
                ),
            )

        return x_user_role

    return dependency


def check_permission(role: str, permission: str) -> bool:
    """Check whether a role has a specific permission."""
    return permission in PERMISSIONS.get(role, set())


ROLE_NAME_MAP: Dict[str, str] = {
    "ASTRONAUT": "astronaut",
    "MEDICAL_OFFICER": "cmo",
    "MISSION_CONTROL": "mission_control",
    "PLANNER": "flight_planner",
    "RESEARCHER": "researcher",
    "ADMIN": "system_admin",
}


def role_from_name(name: str) -> str:
    """Convert a human-readable role name to the canonical role string."""
    mapping = {v: k for k, v in ROLE_NAME_MAP.items()}
    return mapping.get(name, "ASTRONAUT")
