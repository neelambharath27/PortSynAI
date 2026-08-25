from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.core.rbac import require_role
from app.core.security import decode_token
from app.database.session import SessionLocal, get_db
from app.dependencies import get_current_user
from app.models.container import Container
from app.models.enums import UserRole
from app.models.sensor_reading import SensorReading
from app.models.user import User
from app.schemas.digital_twin import (
    TwinContainerOption,
    TwinHistoryOut,
    TwinSnapshot,
    TwinSummary,
)
from app.services.digital_twin_simulator import (
    build_twin_snapshot,
    compute_health,
    manager,
)

router = APIRouter(prefix="/digital-twin", tags=["Digital Twin"])

# Matches the frontend's navConfig entry for Digital Twin (administrator +
# port_operator). Kept in one place so REST and WebSocket auth can't drift
# apart from each other.
can_view_twin = require_role(UserRole.ADMINISTRATOR, UserRole.PORT_OPERATOR)


@router.get(
    "/containers",
    response_model=list[TwinContainerOption],
    dependencies=[Depends(can_view_twin)],
)
def list_twin_containers(
    db: Session = Depends(get_db),
) -> list[TwinContainerOption]:
    """Lightweight list for the container picker on the Digital Twin page."""

    snapshot = build_twin_snapshot(db)

    result: list[TwinContainerOption] = []

    for twin in snapshot["twins"]:
        result.append(
            TwinContainerOption(
                container_id=twin["container_id"],
                container_code=twin["container_code"],
                ship_name=twin.get("ship_name"),
                status=twin["status"],
                risk_level=twin["risk_level"],
                health_score=twin["health_score"],
            )
        )

    return result

    """Lightweight list for the container picker on the Digital Twin page."""

    stmt = select(Container).order_by(Container.container_code)
    containers = list(db.scalars(stmt))

    result: list[TwinContainerOption] = []

    for container in containers:
        result.append(
            TwinContainerOption(
                container_id=container.id,
                container_code=container.container_code,
                ship_name=getattr(container, "ship_name", None),
                status=str(container.status),
                risk_level="warning",
                health_score=0.0,
            )
        )

    return result

@router.get(
    "",
    response_model=TwinSnapshot,
    dependencies=[Depends(can_view_twin)],
)
def get_twin_snapshot(db: Session = Depends(get_db)) -> dict:
    """REST fallback / initial-load snapshot for every container's twin.
    Live updates stream over /digital-twin/ws."""
    return build_twin_snapshot(db)


@router.get(
    "/{container_id}",
    response_model=TwinSummary,
    dependencies=[Depends(can_view_twin)],
)
def get_container_twin(container_id: str, db: Session = Depends(get_db)) -> dict:
    container = db.get(Container, container_id)
    if not container:
        raise NotFoundException("Container not found")

    snapshot = build_twin_snapshot(db)
    for twin in snapshot["twins"]:
        if twin["container_id"] == container_id:
            return twin

    # build_twin_snapshot iterates every row of `containers`, and we've just
    # confirmed this container_id exists, so this branch is unreachable in
    # practice. It's kept only so a future refactor of the snapshot builder
    # fails loudly (404) instead of silently 500ing.
    raise NotFoundException("Container not found")


@router.get(
    "/{container_id}/history",
    response_model=TwinHistoryOut,
    dependencies=[Depends(can_view_twin)],
)
def get_twin_history(
    container_id: str,
    db: Session = Depends(get_db),
    hours: int = Query(default=24, ge=1, le=168, description="How far back to look"),
) -> dict:
    container = db.get(Container, container_id)
    if not container:
        raise NotFoundException("Container not found")

    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    stmt = (
        select(SensorReading)
        .where(SensorReading.container_id == container_id, SensorReading.recorded_at >= since)
        .order_by(SensorReading.recorded_at.asc())
        .limit(120)
    )
    readings = list(db.scalars(stmt))

    points = [
        {
            "temperature": r.temperature,
            "humidity": r.humidity,
            "battery_level": r.battery_level,
            "door_status": r.door_status,
            "movement_status": r.movement_status,
            "gps_valid": r.gps_valid,
            "health_status": compute_health(r, container.cargo_type)["status"],
            "recorded_at": r.recorded_at,
        }
        for r in readings
    ]

    return {
        "container_id": container.id,
        "container_code": container.container_code,
        "points": points,
    }


def _authenticate_ws_user(token: str | None) -> User | None:
    if not token:
        return None
    try:
        payload = decode_token(token)
    except ValueError:
        return None
    if payload.get("type") != "access":
        return None

    db = SessionLocal()
    try:
        return db.get(User, payload.get("sub"))
    finally:
        db.close()


@router.websocket("/ws")
async def digital_twin_websocket(websocket: WebSocket, token: str | None = Query(default=None)):
    user = _authenticate_ws_user(token)
    if not user or not user.is_active:
        await websocket.close(code=4401)
        return
    if user.role not in (UserRole.ADMINISTRATOR, UserRole.PORT_OPERATOR):
        await websocket.close(code=4403)
        return

    await manager.connect(websocket)
    try:
        db = SessionLocal()
        try:
            initial = build_twin_snapshot(db)
        finally:
            db.close()
        await websocket.send_json(_jsonable(initial))

        while True:
            # No inbound messages expected; reading keeps the connection
            # alive and lets us detect client disconnects promptly.
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(websocket)


def _jsonable(payload: dict) -> dict:
    import json

    return json.loads(json.dumps(payload, default=str))
