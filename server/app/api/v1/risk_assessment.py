from fastapi import (
    APIRouter,
    Depends,
    Query,
    WebSocket,
    WebSocketDisconnect,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.core.rbac import require_role
from app.core.security import decode_token
from app.database.session import SessionLocal, get_db
from app.models.container import Container
from app.models.enums import RiskLevel, UserRole
from app.models.risk_score import RiskScore
from app.models.shap_explanation import ShapExplanation
from app.models.user import User
from app.schemas.risk_assessment import (
    RiskAssessmentOut,
    RiskAssessmentRequest,
)
from app.services.risk_engine import assess_container
from app.services.risk_simulator import (
    build_risk_snapshot,
    manager,
)


router = APIRouter(
    prefix="/risk-assessment",
    tags=["RiskAssessment"],
)


can_access = require_role(
    UserRole.ADMINISTRATOR,
    UserRole.CUSTOMS_OFFICER,
)


# ============================================================
# SHAP HELPERS
# ============================================================

FEATURE_LABELS = {
    "gps_score": "GPS Risk",
    "rfid_score": "RFID Risk",
    "sensor_score": "Sensor Risk",
    "manifest_score": "Manifest Risk",
    "yolo_score": "X-ray / YOLO Risk",
    "delay_score": "Delay Risk",
    "lstm_anomaly_score": "LSTM Anomaly",
    "isolation_forest_score": "Isolation Forest Anomaly",
}


def _get_feature_value(
    score: RiskScore,
    feature_name: str,
) -> float | None:
    """
    Return the feature value stored in RiskScore.

    delay_score is currently used by the XGBoost/SHAP model,
    but it is not stored as a column in the current RiskScore model.
    Therefore it returns None for delay_score.
    """

    values = {
        "gps_score": score.gps_score,
        "rfid_score": score.rfid_score,
        "sensor_score": score.sensor_score,
        "manifest_score": score.manifest_score,
        "yolo_score": score.yolo_score,
        "lstm_anomaly_score": score.lstm_anomaly_score,
        "isolation_forest_score": score.isolation_forest_score,
    }

    return values.get(feature_name)


def _build_shap_contributions(
    score: RiskScore,
    db: Session,
) -> list[dict]:
    """
    Load SHAP explanation rows belonging to one RiskScore.

    Results are returned in SHAP rank order.
    """

    rows = (
        db.scalars(
            select(ShapExplanation)
            .where(
                ShapExplanation.risk_score_id == score.id
            )
            .order_by(
                ShapExplanation.rank.asc()
            )
        )
        .all()
    )

    contributions: list[dict] = []

    for row in rows:
        shap_value = float(row.contribution_value)

        if shap_value > 0:
            direction = "increases_risk"
        elif shap_value < 0:
            direction = "decreases_risk"
        else:
            direction = "neutral"

        contributions.append(
            {
                "feature": row.feature_name,
                "label": FEATURE_LABELS.get(
                    row.feature_name,
                    row.feature_name,
                ),
                "feature_value": _get_feature_value(
                    score,
                    row.feature_name,
                ),
                "shap_value": shap_value,
                "direction": direction,
            }
        )

    return contributions


# ============================================================
# RESPONSE BUILDER
# ============================================================

def _to_out(
    score: RiskScore,
    container_code: str | None,
    db: Session,
) -> RiskAssessmentOut:
    """
    Convert database RiskScore + SHAP rows into API response.
    """

    shap_contributions = _build_shap_contributions(
        score,
        db,
    )

    return RiskAssessmentOut(
        id=score.id,
        container_id=score.container_id,
        container_code=container_code,

        gps_score=score.gps_score,
        rfid_score=score.rfid_score,
        sensor_score=score.sensor_score,
        manifest_score=score.manifest_score,
        yolo_score=score.yolo_score,

        lstm_anomaly_score=score.lstm_anomaly_score,
        isolation_forest_score=score.isolation_forest_score,

        final_score=score.final_score,
        risk_level=score.risk_level,

        computed_at=score.computed_at,

        # Current ShapExplanation table does not persist
        # these two values.
        shap_base_value=None,
        shap_probability=None,

        shap_contributions=shap_contributions,
    )


# ============================================================
# GET ALL RISK ASSESSMENTS
# ============================================================

@router.get(
    "",
    response_model=list[RiskAssessmentOut],
    dependencies=[Depends(can_access)],
)
def list_risk_assessments(
    db: Session = Depends(get_db),
    risk_level: RiskLevel | None = None,
    limit: int = Query(
        default=100,
        ge=1,
        le=300,
    ),
) -> list[RiskAssessmentOut]:
    """
    Return the latest risk assessment for each container.

    Results are ordered by highest final risk score first.
    """

    snapshot = build_risk_snapshot(db)

    items = snapshot["assessments"]

    if risk_level:
        items = [
            item
            for item in items
            if item["risk_level"] == risk_level.value
        ]

    items = items[:limit]

    results: list[RiskAssessmentOut] = []

    for item in items:
        score = db.get(
            RiskScore,
            item["id"],
        )

        # If the simulator snapshot references a RiskScore
        # that no longer exists, skip it safely.
        if not score:
            continue

        container = db.get(
            Container,
            score.container_id,
        )

        container_code = (
            container.container_code
            if container
            else item.get("container_code")
        )

        results.append(
            _to_out(
                score,
                container_code,
                db,
            )
        )

    return results


# ============================================================
# CREATE / TRIGGER NEW RISK ASSESSMENT
# ============================================================

@router.post(
    "",
    response_model=RiskAssessmentOut,
    status_code=201,
    dependencies=[Depends(can_access)],
)
def trigger_risk_assessment(
    payload: RiskAssessmentRequest,
    db: Session = Depends(get_db),
) -> RiskAssessmentOut:

    container = db.get(
        Container,
        payload.container_id,
    )

    if not container:
        raise NotFoundException(
            "Container not found"
        )

    # This creates the RiskScore and persists
    # the SHAP explanation rows.
    score = assess_container(
        db,
        container,
    )

    db.commit()
    db.refresh(score)

    return _to_out(
        score,
        container.container_code,
        db,
    )


# ============================================================
# GET LATEST RISK ASSESSMENT FOR ONE CONTAINER
# ============================================================

@router.get(
    "/{container_id}",
    response_model=RiskAssessmentOut,
    dependencies=[Depends(can_access)],
)
def get_latest_risk_assessment(
    container_id: str,
    db: Session = Depends(get_db),
) -> RiskAssessmentOut:

    container = db.get(
        Container,
        container_id,
    )

    if not container:
        raise NotFoundException(
            "Container not found"
        )

    score = db.scalar(
        select(RiskScore)
        .where(
            RiskScore.container_id == container_id
        )
        .order_by(
            RiskScore.computed_at.desc()
        )
    )

    # If no previous assessment exists,
    # create a new one.
    if not score:
        score = assess_container(
            db,
            container,
        )

        db.commit()
        db.refresh(score)

    return _to_out(
        score,
        container.container_code,
        db,
    )


# ============================================================
# WEBSOCKET AUTHENTICATION
# ============================================================

def _authenticate_ws_user(
    token: str | None,
) -> User | None:

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
        return db.get(
            User,
            payload.get("sub"),
        )
    finally:
        db.close()


# ============================================================
# RISK WEBSOCKET
# ============================================================

@router.websocket("/ws")
async def risk_websocket(
    websocket: WebSocket,
    token: str | None = Query(default=None),
):
    user = _authenticate_ws_user(token)

    if not user or not user.is_active:
        await websocket.close(
            code=4401
        )
        return

    if user.role not in (
        UserRole.ADMINISTRATOR,
        UserRole.CUSTOMS_OFFICER,
    ):
        await websocket.close(
            code=4403
        )
        return

    await manager.connect(websocket)

    try:
        db = SessionLocal()

        try:
            initial = build_risk_snapshot(db)
        finally:
            db.close()

        await websocket.send_json(
            _jsonable(initial)
        )

        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        pass

    finally:
        await manager.disconnect(websocket)


# ============================================================
# JSON SERIALIZER
# ============================================================

def _jsonable(payload: dict) -> dict:
    import json

    return json.loads(
        json.dumps(
            payload,
            default=str,
        )
    )