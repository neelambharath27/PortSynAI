"""
Risk input aggregation and XGBoost risk assessment.

Combines:
- GPS
- RFID
- Sensor health
- Manifest mismatch
- YOLO inspection
- Delay / ETA
- LSTM anomaly
- Isolation Forest anomaly

into the XGBoost risk fusion engine.
"""

import random
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.container import Container
from app.models.inspection import Inspection
from app.models.manifest import Manifest
from app.models.risk_score import RiskScore
from app.models.route import Route
from app.models.sensor_reading import SensorReading

from app.services.digital_twin_simulator import compute_health
from app.services.xgboost_risk import RiskInputs, XGBoostRiskService

from app.ml.lstm.service import predict_next_sensor_state
from app.ml.isolation_forest.service import IsolationForestService


# ---------------------------------------------------------------------------
# RFID simulation
# ---------------------------------------------------------------------------

_RFID_BASELINE = (0.0, 12.0)
_RFID_FAILURE_CHANCE = 0.08
_RFID_FAILURE_RANGE = (45.0, 85.0)


# ---------------------------------------------------------------------------
# Individual risk calculations
# ---------------------------------------------------------------------------

def _gps_score(reading: SensorReading | None) -> float:
    if reading is None:
        return round(random.uniform(0, 10), 1)

    if not reading.gps_valid:
        return round(random.uniform(55, 90), 1)

    return round(random.uniform(0, 12), 1)


def _sensor_score(
    reading: SensorReading | None,
    cargo_type: str,
) -> float:
    if reading is None:
        return round(random.uniform(0, 10), 1)

    health = compute_health(reading, cargo_type)

    # 100 = healthy, therefore invert to obtain risk.
    return round(max(0.0, 100.0 - health["score"]), 1)


def _manifest_score(
    manifest: Manifest | None,
    container: Container,
) -> float:
    if manifest is None or not manifest.declared_weight:
        return round(random.uniform(5, 20), 1)

    discrepancy = abs(
        container.weight_kg - manifest.declared_weight
    ) / max(manifest.declared_weight, 1.0)

    return round(min(100.0, discrepancy * 220), 1)


def _delay_score(route: Route | None) -> float:
    if route is None or route.delay_probability is None:
        return round(random.uniform(0, 15), 1)

    return round(
        min(100.0, route.delay_probability * 100),
        1,
    )


def _rfid_score() -> float:
    if random.random() < _RFID_FAILURE_CHANCE:
        return round(
            random.uniform(*_RFID_FAILURE_RANGE),
            1,
        )

    return round(
        random.uniform(*_RFID_BASELINE),
        1,
    )


# ---------------------------------------------------------------------------
# LSTM input preparation
# ---------------------------------------------------------------------------

def _get_lstm_readings(
    db: Session,
    container_id: str,
) -> list[dict[str, float]]:
    readings = db.scalars(
        select(SensorReading)
        .where(SensorReading.container_id == container_id)
        .order_by(SensorReading.recorded_at.desc())
        .limit(12)
    ).all()

    readings = list(reversed(readings))

    return [
        {
            "temperature": float(reading.temperature),
            "humidity": float(reading.humidity),
            "battery_level": float(reading.battery_level),
        }
        for reading in readings
    ]


# ---------------------------------------------------------------------------
# Gather all risk inputs
# ---------------------------------------------------------------------------

def gather_inputs(
    db: Session,
    container: Container,
) -> RiskInputs:

    latest_sensor = db.scalar(
        select(SensorReading)
        .where(
            SensorReading.container_id == container.id
        )
        .order_by(
            SensorReading.recorded_at.desc()
        )
    )

    latest_inspection = db.scalar(
        select(Inspection)
        .where(
            Inspection.container_id == container.id
        )
        .order_by(
            Inspection.created_at.desc()
        )
    )

    manifest = db.scalar(
        select(Manifest)
        .where(
            Manifest.container_id == container.id
        )
    )

    route = db.scalar(
        select(Route)
        .where(
            Route.container_id == container.id
        )
    )

    # -----------------------------------------------------------------------
    # YOLO inspection score
    # -----------------------------------------------------------------------

    yolo_score = 0.0

    if (
        latest_inspection
        and latest_inspection.detected_objects
    ):
        severities = {
            "none": 0,
            "low": 10,
            "medium": 35,
            "high": 70,
            "critical": 95,
        }

        peak = max(
            (
                severities.get(
                    obj.get("threat_level", "none"),
                    0,
                )
                for obj in latest_inspection.detected_objects
            ),
            default=0,
        )

        yolo_score = float(peak)

    # -----------------------------------------------------------------------
    # LSTM anomaly
    # -----------------------------------------------------------------------

    lstm_anomaly_score = 0.0

    lstm_readings = _get_lstm_readings(
        db,
        container.id,
    )

    if len(lstm_readings) >= 12:
        try:
            lstm_prediction = predict_next_sensor_state(
                lstm_readings
            )

            lstm_anomaly_score = float(
                lstm_prediction.anomaly_score
            )

        except Exception:
            # Keep risk assessment available if ML prediction fails.
            lstm_anomaly_score = 0.0

    # -----------------------------------------------------------------------
    # Isolation Forest anomaly
    # -----------------------------------------------------------------------

    isolation_forest_score = 0.0

    if latest_sensor is not None:
        try:
            isolation_result = IsolationForestService.detect(
                temperature=float(
                    latest_sensor.temperature
                ),
                humidity=float(
                    latest_sensor.humidity
                ),
                battery=float(
                    latest_sensor.battery_level
                ),
                gps_valid=bool(
                    latest_sensor.gps_valid
                ),
                door_status=str(
                    latest_sensor.door_status
                ),
                movement_status=str(
                    latest_sensor.movement_status
                ),
            )

            isolation_forest_score = float(
                isolation_result.anomaly_score
            )

        except Exception:
            # Keep risk assessment available if ML prediction fails.
            isolation_forest_score = 0.0

    # -----------------------------------------------------------------------
    # Build XGBoost input object
    # -----------------------------------------------------------------------

    return RiskInputs(
        gps_score=_gps_score(latest_sensor),
        rfid_score=_rfid_score(),
        sensor_score=_sensor_score(
            latest_sensor,
            container.cargo_type,
        ),
        manifest_score=_manifest_score(
            manifest,
            container,
        ),
        yolo_score=yolo_score,
        delay_score=_delay_score(route),
        lstm_anomaly_score=lstm_anomaly_score,
        isolation_forest_score=isolation_forest_score,
    )


# ---------------------------------------------------------------------------
# Complete risk assessment
# ---------------------------------------------------------------------------

def assess_container(
    db: Session,
    container: Container,
) -> RiskScore:

    inputs = gather_inputs(
        db,
        container,
    )

    prediction = XGBoostRiskService.score(
        inputs
    )

    score_row = RiskScore(
        container_id=container.id,

        gps_score=inputs.gps_score,
        rfid_score=inputs.rfid_score,
        sensor_score=inputs.sensor_score,
        manifest_score=inputs.manifest_score,
        yolo_score=inputs.yolo_score,

        lstm_anomaly_score=inputs.lstm_anomaly_score,
        isolation_forest_score=inputs.isolation_forest_score,

        final_score=prediction.final_score,
        risk_level=prediction.risk_level,

        computed_at=datetime.now(
            timezone.utc
        ),
    )

    db.add(score_row)

    return score_row