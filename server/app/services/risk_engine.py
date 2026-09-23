from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.container import Container
from app.models.risk_score import RiskScore
from app.models.shap_explanation import ShapExplanation

from app.ml.services.risk_engine import gather_inputs
from app.ml.shap_explain.service import explain

from app.services.xgboost_risk import XGBoostRiskService


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
                +------------------+
                |                  |
                v                  v
          Final Risk Score       SHAP
                |                  |
                +---------+--------+
                          |
                          v
                  RiskScore + SHAP
    """

    # --------------------------------------------------------------
    # 1. Gather all risk inputs
    # --------------------------------------------------------------

    inputs = gather_inputs(
        db=db,
        container=container,
    )

    # --------------------------------------------------------------
    # 2. XGBoost risk fusion
    # --------------------------------------------------------------

    prediction = XGBoostRiskService.score(
        inputs
    )

    # --------------------------------------------------------------
    # 3. Create RiskScore database record
    # --------------------------------------------------------------

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

    # Flush first so score_row.id is available for the SHAP foreign key.
    db.flush()

    # --------------------------------------------------------------
    # 4. Build feature vector for SHAP
    # --------------------------------------------------------------

    feature_vector = {
        "gps_score": inputs.gps_score,
        "rfid_score": inputs.rfid_score,
        "sensor_score": inputs.sensor_score,
        "manifest_score": inputs.manifest_score,
        "yolo_score": inputs.yolo_score,
        "delay_score": inputs.delay_score,
        "lstm_anomaly_score": inputs.lstm_anomaly_score,
        "isolation_forest_score": inputs.isolation_forest_score,
    }

    # --------------------------------------------------------------
    # 5. Explain the SAME XGBoost model using SHAP
    # --------------------------------------------------------------

    shap_result = explain(
        feature_vector
    )

    # --------------------------------------------------------------
    # 6. Persist the eight SHAP contributions
    # --------------------------------------------------------------

    for rank, contribution in enumerate(
        shap_result["contributions"],
        start=1,
    ):

        shap_row = ShapExplanation(
            risk_score_id=score_row.id,
            feature_name=contribution["feature"],
            contribution_value=float(
                contribution["shap_value"]
            ),
            rank=rank,
        )

        db.add(shap_row)

    return score_row