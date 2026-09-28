from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.dependencies import get_current_user
from app.ml.isolation_forest.service import IsolationForestService
from app.models.anomaly import Anomaly
from app.models.container import Container
from app.models.enums import (
    AnomalyType,
    ContainerStatus,
    DoorStatus,
    MovementStatus,
    RiskLevel,
)
from app.models.sensor_reading import SensorReading
from app.models.user import User


router = APIRouter(
    prefix="/anomaly-detection",
    tags=["Anomaly Detection"],
)


def _risk_level(score: float) -> RiskLevel:
    if score >= 70:
        return RiskLevel.HIGH

    if score >= 30:
        return RiskLevel.MEDIUM

    return RiskLevel.LOW


def _anomaly_type(
    *,
    is_anomaly: bool,
    temperature: float,
    humidity: float,
    gps_valid: bool,
    door_status: str,
    movement_status: str,
    container_status: str,
) -> AnomalyType | None:
    if not is_anomaly:
        return None

    door = str(door_status).lower()
    movement = str(movement_status).lower()
    status = str(container_status).lower()

    if door == DoorStatus.OPEN.value:
        return AnomalyType.DOOR_OPEN

    if not gps_valid:
        return AnomalyType.GPS_SPOOFING

    if movement == MovementStatus.STATIONARY.value:
        if status == ContainerStatus.IDLE.value:
            return AnomalyType.IDLE_CONTAINER

        return AnomalyType.UNAUTHORIZED_STOP

    if temperature < 0 or temperature > 40:
        return AnomalyType.TEMPERATURE_ANOMALY

    if humidity < 20 or humidity > 90:
        return AnomalyType.TEMPERATURE_ANOMALY

    return AnomalyType.ROUTE_DEVIATION


def _latest_sensor(
    db: Session,
    container_id: str,
) -> SensorReading | None:
    return db.scalar(
        select(SensorReading)
        .where(SensorReading.container_id == container_id)
        .order_by(
            SensorReading.recorded_at.desc(),
            SensorReading.id.desc(),
        )
    )


def _serialize_anomaly(
    anomaly: Anomaly,
    container: Container | None,
) -> dict:
    return {
        "id": anomaly.id,
        "container_id": anomaly.container_id,
        "container_code": (
            container.container_code
            if container
            else anomaly.container_id
        ),
        "anomaly_type": anomaly.anomaly_type.value,
        "confidence": float(anomaly.confidence),
        "risk_level": anomaly.risk_level.value,
        "detected_at": anomaly.detected_at,
        "resolved": bool(anomaly.resolved),
    }


@router.get(
    "/{container_id}",
    dependencies=[Depends(get_current_user)],
)
def detect_container_anomaly(
    container_id: str,
    db: Session = Depends(get_db),
) -> dict:
    container = db.scalar(
        select(Container).where(Container.id == container_id)
    )

    if not container:
        raise HTTPException(
            status_code=404,
            detail="Container not found",
        )

    sensor = _latest_sensor(db, container_id)

    if sensor is None:
        raise HTTPException(
            status_code=404,
            detail="No sensor reading found for this container",
        )

    result = IsolationForestService.detect(
        temperature=float(sensor.temperature),
        humidity=float(sensor.humidity),
        battery=float(sensor.battery_level),
        gps_valid=bool(sensor.gps_valid),
        door_status=str(sensor.door_status.value),
        movement_status=str(sensor.movement_status.value),
    )

    level = _risk_level(result.anomaly_score)

    anomaly_type = _anomaly_type(
        is_anomaly=result.is_anomaly,
        temperature=float(sensor.temperature),
        humidity=float(sensor.humidity),
        gps_valid=bool(sensor.gps_valid),
        door_status=str(sensor.door_status.value),
        movement_status=str(sensor.movement_status.value),
        container_status=str(container.status.value),
    )

    saved_anomaly = None

    if result.is_anomaly and anomaly_type is not None:
        saved_anomaly = Anomaly(
            container_id=container.id,
            anomaly_type=anomaly_type,
            confidence=float(result.confidence),
            risk_level=level,
            detected_at=datetime.now(timezone.utc),
            resolved=False,
        )

        db.add(saved_anomaly)
        db.commit()
        db.refresh(saved_anomaly)

    return {
        "container_id": container.id,
        "container_code": container.container_code,
        "is_anomaly": bool(result.is_anomaly),
        "anomaly_score": float(result.anomaly_score),
        "confidence": float(result.confidence),
        "risk_level": level.value,
        "anomaly_type": (
            anomaly_type.value
            if anomaly_type is not None
            else None
        ),
        "sensor": {
            "temperature": float(sensor.temperature),
            "humidity": float(sensor.humidity),
            "battery_level": float(sensor.battery_level),
            "gps_valid": bool(sensor.gps_valid),
            "door_status": sensor.door_status.value,
            "movement_status": sensor.movement_status.value,
            "recorded_at": sensor.recorded_at,
        },
        "stored_anomaly_id": (
            saved_anomaly.id
            if saved_anomaly is not None
            else None
        ),
    }


@router.get(
    "/history/recent",
    dependencies=[Depends(get_current_user)],
)
def recent_anomalies(
    db: Session = Depends(get_db),
    limit: int = Query(
        default=10,
        ge=1,
        le=50,
    ),
) -> list[dict]:
    rows = list(
        db.scalars(
            select(Anomaly)
            .order_by(Anomaly.detected_at.desc())
            .limit(limit)
        )
    )

    return [
        _serialize_anomaly(
            anomaly,
            db.get(Container, anomaly.container_id),
        )
        for anomaly in rows
    ]