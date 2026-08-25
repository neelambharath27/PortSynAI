"""Bridges the rest of the platform's live data (sensors, tracking, cargo
inspection, manifests) into `XGBoostRiskService`, and persists the result as
a `RiskScore` row. Shared by the on-demand POST /risk-assessment endpoint
and the periodic background rescoring loop so both go through one code
path.
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

# A container without an RFID subsystem reading is simulated with a low
# baseline plus an occasional failed-scan spike, rather than a pure no-op —
# there's no RFID hardware model in this schema yet, unlike GPS/sensors
# which have real backing tables.
_RFID_BASELINE = (0.0, 12.0)
_RFID_FAILURE_CHANCE = 0.08
_RFID_FAILURE_RANGE = (45.0, 85.0)


def _gps_score(reading: SensorReading | None) -> float:
    if reading is None:
        return round(random.uniform(0, 10), 1)
    if not reading.gps_valid:
        return round(random.uniform(55, 90), 1)
    return round(random.uniform(0, 12), 1)


def _sensor_score(reading: SensorReading | None, cargo_type: str) -> float:
    if reading is None:
        return round(random.uniform(0, 10), 1)
    health = compute_health(reading, cargo_type)
    # health.score is 100 = perfectly healthy -> invert to a 0-100 risk score.
    return round(max(0.0, 100 - health["score"]), 1)


def _manifest_score(manifest: Manifest | None, container: Container) -> float:
    if manifest is None or not manifest.declared_weight:
        return round(random.uniform(5, 20), 1)
    discrepancy = abs(container.weight_kg - manifest.declared_weight) / max(
        manifest.declared_weight, 1.0
    )
    return round(min(100.0, discrepancy * 220), 1)


def _delay_score(route: Route | None) -> float:
    if route is None or route.delay_probability is None:
        return round(random.uniform(0, 15), 1)
    return round(min(100.0, route.delay_probability * 100), 1)


def _rfid_score() -> float:
    if random.random() < _RFID_FAILURE_CHANCE:
        return round(random.uniform(*_RFID_FAILURE_RANGE), 1)
    return round(random.uniform(*_RFID_BASELINE), 1)


def gather_inputs(db: Session, container: Container) -> RiskInputs:
    latest_sensor = db.scalar(
        select(SensorReading)
        .where(SensorReading.container_id == container.id)
        .order_by(SensorReading.recorded_at.desc())
    )
    latest_inspection = db.scalar(
        select(Inspection)
        .where(Inspection.container_id == container.id)
        .order_by(Inspection.created_at.desc())
    )
    manifest = db.scalar(select(Manifest).where(Manifest.container_id == container.id))
    route = db.scalar(select(Route).where(Route.container_id == container.id))

    yolo_score = 0.0
    if latest_inspection and latest_inspection.detected_objects:
        severities = {"none": 0, "low": 10, "medium": 35, "high": 70, "critical": 95}
        peak = max(
            (severities.get(obj.get("threat_level", "none"), 0) for obj in latest_inspection.detected_objects),
            default=0,
        )
        yolo_score = float(peak)

    return RiskInputs(
        gps_score=_gps_score(latest_sensor),
        rfid_score=_rfid_score(),
        sensor_score=_sensor_score(latest_sensor, container.cargo_type),
        manifest_score=_manifest_score(manifest, container),
        yolo_score=yolo_score,
        delay_score=_delay_score(route),
    )


def assess_container(db: Session, container: Container) -> RiskScore:
    inputs = gather_inputs(db, container)
    prediction = XGBoostRiskService.score(inputs)

    score_row = RiskScore(
        container_id=container.id,
        gps_score=inputs.gps_score,
        rfid_score=inputs.rfid_score,
        sensor_score=inputs.sensor_score,
        manifest_score=inputs.manifest_score,
        yolo_score=inputs.yolo_score,
        delay_score=inputs.delay_score,
        final_score=prediction.final_score,
        risk_level=prediction.risk_level,
        confidence=prediction.confidence,
        recommendation=prediction.recommendation,
        risk_factors=prediction.factors,
        computed_at=datetime.now(timezone.utc),
    )
    db.add(score_row)
    return score_row
