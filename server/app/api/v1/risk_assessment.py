from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.core.rbac import require_role
from app.core.security import decode_token
from app.database.session import SessionLocal, get_db
from app.models.container import Container
from app.models.enums import RiskLevel, UserRole
from app.models.risk_score import RiskScore
from app.models.user import User
from app.schemas.risk_assessment import RiskAssessmentOut, RiskAssessmentRequest
from app.services.risk_engine import assess_container
from app.services.risk_simulator import build_risk_snapshot, manager

router = APIRouter(prefix="/risk-assessment", tags=["Risk Assessment"])

can_access = require_role(UserRole.ADMINISTRATOR, UserRole.CUSTOMS_OFFICER)


def _to_out(score: RiskScore, container_code: str | None) -> RiskAssessmentOut:
    return RiskAssessmentOut(
        id=score.id,
        container_id=score.container_id,
        container_code=container_code,
        gps_score=score.gps_score,
        rfid_score=score.rfid_score,
        sensor_score=score.sensor_score,
        manifest_score=score.manifest_score,
        yolo_score=score.yolo_score,
        delay_score=score.delay_score,
        final_score=score.final_score,
        risk_level=score.risk_level,
        confidence=score.confidence,
        recommendation=score.recommendation,
        risk_factors=score.risk_factors or [],
        computed_at=score.computed_at,
    )


@router.get("", response_model=list[RiskAssessmentOut], dependencies=[Depends(can_access)])
def list_risk_assessments(
    db: Session = Depends(get_db),
    risk_level: RiskLevel | None = None,
    limit: int = Query(default=100, le=300),
) -> list[RiskAssessmentOut]:
    """Latest assessment per container, highest risk first."""
    snapshot = build_risk_snapshot(db)
    items = snapshot["assessments"]
    if risk_level:
        items = [i for i in items if i["risk_level"] == risk_level.value]
    items = items[:limit]
    return [
        RiskAssessmentOut(
            id=i["id"],
            container_id=i["container_id"],
            container_code=i["container_code"],
            gps_score=i["gps_score"],
            rfid_score=i["rfid_score"],
            sensor_score=i["sensor_score"],
            manifest_score=i["manifest_score"],
            yolo_score=i["yolo_score"],
            delay_score=i["delay_score"],
            final_score=i["final_score"],
            risk_level=i["risk_level"],
            confidence=i["confidence"],
            recommendation=i["recommendation"],
            risk_factors=i["risk_factors"],
            computed_at=i["computed_at"],
        )
        for i in items
    ]


@router.post("", response_model=RiskAssessmentOut, status_code=201, dependencies=[Depends(can_access)])
def trigger_risk_assessment(payload: RiskAssessmentRequest, db: Session = Depends(get_db)) -> RiskAssessmentOut:
    container = db.get(Container, payload.container_id)
    if not container:
        raise NotFoundException("Container not found")

    score = assess_container(db, container)
    db.commit()
    db.refresh(score)
    return _to_out(score, container.container_code)


@router.get("/{container_id}", response_model=RiskAssessmentOut, dependencies=[Depends(can_access)])
def get_latest_risk_assessment(container_id: str, db: Session = Depends(get_db)) -> RiskAssessmentOut:
    container = db.get(Container, container_id)
    if not container:
        raise NotFoundException("Container not found")

    score = db.scalar(
        select(RiskScore)
        .where(RiskScore.container_id == container_id)
        .order_by(RiskScore.computed_at.desc())
    )
    if not score:
        # No assessment yet for this container — compute one on demand
        # rather than 404ing on a container that legitimately exists.
        score = assess_container(db, container)
        db.commit()
        db.refresh(score)

    return _to_out(score, container.container_code)


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
async def risk_websocket(websocket: WebSocket, token: str | None = Query(default=None)):
    user = _authenticate_ws_user(token)
    if not user or not user.is_active:
        await websocket.close(code=4401)
        return
    if user.role not in (UserRole.ADMINISTRATOR, UserRole.CUSTOMS_OFFICER):
        await websocket.close(code=4403)
        return

    await manager.connect(websocket)
    try:
        db = SessionLocal()
        try:
            initial = build_risk_snapshot(db)
        finally:
            db.close()
        await websocket.send_json(_jsonable(initial))

        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(websocket)


def _jsonable(payload: dict) -> dict:
    import json

    return json.loads(json.dumps(payload, default=str))
