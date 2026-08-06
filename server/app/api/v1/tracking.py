from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.core.security import decode_token
from app.database.session import SessionLocal, get_db
from app.dependencies import get_current_user
from app.models.container import Container
from app.models.route import Route
from app.models.user import User
from app.schemas.tracking import RouteHistoryOut, TrackingSnapshot
from app.services.tracking_simulator import build_snapshot, manager

router = APIRouter(prefix="/tracking", tags=["Live Tracking"])


@router.get("/live", response_model=TrackingSnapshot)
def get_live_snapshot(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """REST fallback / initial-load snapshot. Live updates stream over /tracking/ws."""
    return build_snapshot(db)


@router.get("/{container_id}/history", response_model=RouteHistoryOut)
def get_route_history(container_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> dict:
    container = db.get(Container, container_id)
    if not container:
        raise NotFoundException("Container not found")

    route = db.scalar(select(Route).where(Route.container_id == container_id))
    waypoints = route.waypoints if route else []
    eta_predicted = route.eta_predicted if route else None
    delay_probability = route.delay_probability if route else 0.0

    return {
        "container_id": container.id,
        "container_code": container.container_code,
        "waypoints": waypoints,
        "eta_predicted": eta_predicted,
        "delay_probability": delay_probability,
    }


def _authenticate_ws_token(token: str | None) -> User | None:
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
async def tracking_websocket(websocket: WebSocket, token: str | None = Query(default=None)):
    user = _authenticate_ws_token(token)
    if not user or not user.is_active:
        await websocket.close(code=4401)
        return

    await manager.connect(websocket)
    try:
        # Send an immediate snapshot so the client isn't waiting for the next tick.
        db = SessionLocal()
        try:
            initial = build_snapshot(db)
        finally:
            db.close()
        await websocket.send_json(_jsonable(initial))

        while True:
            # We don't expect inbound messages, but reading keeps the
            # connection alive and lets us detect client disconnects.
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(websocket)


def _jsonable(payload: dict) -> dict:
    import json

    return json.loads(json.dumps(payload, default=str))
