# ---------------------------------------------------------------------------
# Risk assessment
# ---------------------------------------------------------------------------

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.container import Container

from app.models.risk_score import RiskScore

from app.services.xgboost_risk import XGBoostRiskService
# IMPORTANT:
# Keep/import these from the locations where they already exist
# in your project.
#
# Example:
# from app.models.container import Container
# from app.models.risk_score import RiskScore
# from app.services.risk_engine_inputs import gather_inputs
# from app.services.xgboost_risk import XGBoostRiskService


def assess_container(
    db: Session,
    container: Container,
) -> RiskScore:
    """
    Perform complete container risk assessment.

    Pipeline:

        SensorReading history
                |
        +-------+--------+
        |                |
       LSTM        Isolation Forest
        |                |
        +-------+--------+
                |
        GPS / RFID / Sensor / Manifest / YOLO / Delay
                |
                v
        8-feature XGBoost
                |
                v
        Final Risk Score
                |
                v
          RiskScore database row
    """

    # ------------------------------------------------------------------
    # Gather all 8 XGBoost inputs
    # ------------------------------------------------------------------

    inputs = gather_inputs(
        db=db,
        container=container,
    )

    # ------------------------------------------------------------------
    # XGBoost risk fusion
    #
    # The XGBoost model receives:
    #
    # 1. GPS
    # 2. RFID
    # 3. Sensor
    # 4. Manifest
    # 5. YOLO
    # 6. Delay
    # 7. LSTM anomaly
    # 8. Isolation Forest anomaly
    # ------------------------------------------------------------------

    prediction = XGBoostRiskService.score(inputs)

    # ------------------------------------------------------------------
    # Create RiskScore database record
    # ------------------------------------------------------------------

    score_row = RiskScore(
        container_id=container.id,

        # Existing risk features
        gps_score=inputs.gps_score,
        rfid_score=inputs.rfid_score,
        sensor_score=inputs.sensor_score,
        manifest_score=inputs.manifest_score,
        yolo_score=inputs.yolo_score,

        # Delay / ETA risk
        delay_score=inputs.delay_score,

        # ML anomaly features
        lstm_anomaly_score=inputs.lstm_anomaly_score,
        isolation_forest_score=inputs.isolation_forest_score,

        # Final XGBoost result
        final_score=prediction.final_score,
        risk_level=prediction.risk_level,

        # UTC timestamp
        computed_at=datetime.now(timezone.utc),
    )

    # ------------------------------------------------------------------
    # Add record to current SQLAlchemy transaction
    # ------------------------------------------------------------------

    db.add(score_row)

    return score_row