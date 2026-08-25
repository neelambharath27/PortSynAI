"""
Risk engine for PortSynAI.

Pipeline:

    SensorReading history
            |
        +---+---+
        |       |
       LSTM  Isolation Forest
        |       |
        +---+---+
            |
    GPS / RFID / Sensor / Manifest / YOLO / Delay
            |
            + LSTM anomaly
            + Isolation Forest anomaly
            |
            v
        XGBoost Fusion
            |
            v
      Final Risk Score
"""

from __future__ import annotations

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

from app.ml.isolation_forest.service import IsolationForestService
from app.ml.lstm.service import predict_next_sensor_state

from app.services.digital_twin_simulator import compute_health
from app.services.xgboost_risk import RiskInputs, XGBoostRiskService


# ---------------------------------------------------------------------------
# RFID simulation
# ---------------------------------------------------------------------------

_RFID_BASELINE = (0.0, 12.0)
_RFID_FAILURE_CHANCE = 0.08
_RFID_FAILURE_RANGE = (45.0, 85.0)


# ---------------------------------------------------------------------------
# Sensor history
# ---------------------------------------------------------------------------

LSTM_SEQUENCE_LENGTH = 12


# ---------------------------------------------------------------------------
# Existing feature scoring
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

    health = compute_health(
        reading,
        cargo_type,
    )

    # Health score:
    #   100 = healthy
    #     0 = unhealthy
    #
    # Convert health into a 0-100 risk score.
    return round(
        max(
            0.0,
            100 - health["score"],
        ),
        1,
    )


def _manifest_score(
    manifest: Manifest | None,
    container: Container,
) -> float:
    if manifest is None or not manifest.declared_weight:
        return round(
            random.uniform(5, 20),
            1,
        )

    discrepancy = abs(
        container.weight_kg
        - manifest.declared_weight
    ) / max(
        manifest.declared_weight,
        1.0,
    )

    return round(
        min(
            100.0,
            discrepancy * 220,
        ),
        1,
    )


def _delay_score(
    route: Route | None,
) -> float:
    if (
        route is None
        or route.delay_probability is None
    ):
        return round(
            random.uniform(0, 15),
            1,
        )

    return round(
        min(
            100.0,
            route.delay_probability * 100,
        ),
        1,
    )


def _rfid_score() -> float:
    if random.random() < _RFID_FAILURE_CHANCE:
        return round(
            random.uniform(
                *_RFID_FAILURE_RANGE
            ),
            1,
        )

    return round(
        random.uniform(
            *_RFID_BASELINE
        ),
        1,
    )


# ---------------------------------------------------------------------------
# LSTM
# ---------------------------------------------------------------------------

def _lstm_prediction(
    readings: list[SensorReading],
) -> dict | None:
    """
    Run the LSTM using the latest 12 SensorReading records.

    The database query returns newest-first, therefore the readings
    are reversed before being passed to the LSTM so that the model
    receives chronological order.
    """

    if len(readings) < LSTM_SEQUENCE_LENGTH:
        return None

    chronological = list(
        reversed(
            readings[
                :LSTM_SEQUENCE_LENGTH
            ]
        )
    )

    sequence = [
        {
            "temperature": float(
                reading.temperature
            ),
            "humidity": float(
                reading.humidity
            ),
            "battery_level": float(
                reading.battery_level
            ),
        }
        for reading in chronological
    ]

    prediction = predict_next_sensor_state(
        sequence
    )

    return {
        "predicted_temperature": (
            prediction.predicted_temperature
        ),
        "predicted_humidity": (
            prediction.predicted_humidity
        ),
        "predicted_battery_level": (
            prediction.predicted_battery_level
        ),
        "anomaly_score": (
            prediction.anomaly_score
        ),
        "prediction_confidence": (
            prediction.prediction_confidence
        ),
    }


# ---------------------------------------------------------------------------
# Isolation Forest
# ---------------------------------------------------------------------------

def _isolation_forest_score(
    reading: SensorReading | None,
) -> dict | None:
    """
    Run Isolation Forest against the latest SensorReading.
    """

    if reading is None:
        return None

    result = IsolationForestService.detect(
        temperature=float(
            reading.temperature
        ),
        humidity=float(
            reading.humidity
        ),
        battery=float(
            reading.battery_level
        ),
        gps_valid=bool(
            reading.gps_valid
        ),
        door_status=str(
            reading.door_status
        ),
        movement_status=str(
            reading.movement_status
        ),
    )

    return {
        "is_anomaly": result.is_anomaly,
        "anomaly_score": result.anomaly_score,
        "confidence": result.confidence,
    }


# ---------------------------------------------------------------------------
# Gather model inputs
# ---------------------------------------------------------------------------

def gather_inputs(
    db: Session,
    container: Container,
) -> RiskInputs:
    """
    Gather the complete 8-feature XGBoost input vector.

    Features:

        1. GPS
        2. RFID
        3. Sensor
        4. Manifest
        5. YOLO
        6. Delay
        7. LSTM anomaly
        8. Isolation Forest anomaly
    """

    # ------------------------------------------------------------------
    # Get latest 12 SensorReadings
    # ------------------------------------------------------------------

    sensor_readings = db.scalars(
        select(SensorReading)
        .where(
            SensorReading.container_id
            == container.id
        )
        .order_by(
            SensorReading.recorded_at.desc()
        )
        .limit(
            LSTM_SEQUENCE_LENGTH
        )
    ).all()

    latest_sensor = (
        sensor_readings[0]
        if sensor_readings
        else None
    )

    # ------------------------------------------------------------------
    # Latest inspection
    # ------------------------------------------------------------------

    latest_inspection = db.scalar(
        select(Inspection)
        .where(
            Inspection.container_id
            == container.id
        )
        .order_by(
            Inspection.created_at.desc()
        )
    )

    # ------------------------------------------------------------------
    # Manifest
    # ------------------------------------------------------------------

    manifest = db.scalar(
        select(Manifest).where(
            Manifest.container_id
            == container.id
        )
    )

    # ------------------------------------------------------------------
    # Route
    # ------------------------------------------------------------------

    route = db.scalar(
        select(Route).where(
            Route.container_id
            == container.id
        )
    )

    # ------------------------------------------------------------------
    # Existing sensor risk
    # ------------------------------------------------------------------

    sensor_score = _sensor_score(
        latest_sensor,
        container.cargo_type,
    )

    # ------------------------------------------------------------------
    # LSTM prediction
    # ------------------------------------------------------------------

    lstm_result = _lstm_prediction(
        sensor_readings
    )

    lstm_anomaly_score = 0.0

    if lstm_result is not None:
        lstm_anomaly_score = round(
            max(
                0.0,
                min(
                    100.0,
                    float(
                        lstm_result[
                            "anomaly_score"
                        ]
                    ),
                ),
            ),
            1,
        )

    # ------------------------------------------------------------------
    # Isolation Forest
    # ------------------------------------------------------------------

    isolation_result = (
        _isolation_forest_score(
            latest_sensor
        )
    )

    isolation_forest_score = 0.0

    if isolation_result is not None:
        isolation_forest_score = round(
            max(
                0.0,
                min(
                    100.0,
                    float(
                        isolation_result[
                            "anomaly_score"
                        ]
                    ),
                ),
            ),
            1,
        )

    # ------------------------------------------------------------------
    # YOLO / inspection risk
    # ------------------------------------------------------------------

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
                    obj.get(
                        "threat_level",
                        "none",
                    ),
                    0,
                )
                for obj
                in latest_inspection.detected_objects
            ),
            default=0,
        )

        yolo_score = float(peak)

    # ------------------------------------------------------------------
    # Return complete 8-feature XGBoost input
    # ------------------------------------------------------------------

    return RiskInputs(
        gps_score=_gps_score(
            latest_sensor
        ),
        rfid_score=_rfid_score(),
        sensor_score=sensor_score,
        manifest_score=_manifest_score(
            manifest,
            container,
        ),
        yolo_score=yolo_score,
        delay_score=_delay_score(
            route
        ),
        lstm_anomaly_score=(
            lstm_anomaly_score
        ),
        isolation_forest_score=(
            isolation_forest_score
        ),
    )


# ---------------------------------------------------------------------------
# Complete risk assessment
# ---------------------------------------------------------------------------

def assess_container(
    db: Session,
    container: Container,
) -> RiskScore:
    """
    Perform complete container risk assessment.

    Pipeline:

        latest 12 SensorReadings
                    |
            +-------+-------+
            |               |
           LSTM       Isolation Forest
            |               |
            +-------+-------+
                    |
             8 Risk Inputs
                    |
                XGBoost
                    |
             Risk Prediction
                    |
               RiskScore
    """

    inputs = gather_inputs(
        db,
        container,
    )

    # ------------------------------------------------------------------
    # Final XGBoost fusion
    # ------------------------------------------------------------------

    prediction = XGBoostRiskService.score(
        inputs
    )

    # ------------------------------------------------------------------
    # Persist existing RiskScore schema.
    #
    # LSTM and Isolation Forest are already included in the XGBoost
    # calculation, but their individual values are not added as DB
    # columns yet.
    # ------------------------------------------------------------------

    score_row = RiskScore(
        container_id=container.id,
        gps_score=inputs.gps_score,
        rfid_score=inputs.rfid_score,
        sensor_score=inputs.sensor_score,
        manifest_score=inputs.manifest_score,
        yolo_score=inputs.yolo_score,
        final_score=prediction.final_score,
        risk_level=prediction.risk_level,
        computed_at=datetime.now(
            timezone.utc
        ),
    )

    db.add(score_row)

    return score_row