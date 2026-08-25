"""XGBoost-based composite risk scoring service.

The model is an actual XGBClassifier trained on a reproducible synthetic
training dataset because the project currently has no labeled real-world
customs incident dataset.

The model combines:
    GPS
    RFID
    IoT sensor risk
    Manifest mismatch
    YOLO inspection risk
    Delay / ETA risk
    LSTM anomaly score
    Isolation Forest anomaly score

Important:
This is synthetically trained and must not be described as trained on
real customs incident data.
"""

from __future__ import annotations

import threading
from dataclasses import dataclass, field

import numpy as np
import pandas as pd
from xgboost import XGBClassifier

from app.models.enums import RiskLevel


FEATURES: list[str] = [
    "gps_score",
    "rfid_score",
    "sensor_score",
    "manifest_score",
    "yolo_score",
    "delay_score",
    "lstm_anomaly_score",
    "isolation_forest_score",
]


FEATURE_LABELS: dict[str, str] = {
    "gps_score": "GPS Deviation",
    "rfid_score": "RFID Failure",
    "sensor_score": "Sensor Anomaly",
    "manifest_score": "Manifest Mismatch",
    "yolo_score": "YOLO Detection",
    "delay_score": "Delay / ETA Risk",
    "lstm_anomaly_score": "LSTM Prediction Anomaly",
    "isolation_forest_score": "Isolation Forest Anomaly",
}


TRIGGER_THRESHOLD = 25.0

_RANDOM_SEED = 42
_TRAIN_SAMPLES = 5000

_model: XGBClassifier | None = None
_lock = threading.Lock()


@dataclass
class RiskInputs:
    gps_score: float
    rfid_score: float
    sensor_score: float
    manifest_score: float
    yolo_score: float
    delay_score: float
    lstm_anomaly_score: float
    isolation_forest_score: float


@dataclass
class RiskPrediction:
    final_score: float
    risk_level: RiskLevel
    confidence: float
    recommendation: str
    factors: list[dict] = field(default_factory=list)


def _synthetic_training_data(
    n: int = _TRAIN_SAMPLES,
) -> tuple[pd.DataFrame, np.ndarray]:
    """Create a reproducible synthetic training dataset.

    Every feature is represented on a 0-100 risk scale.

    The labels are generated from a continuous synthetic risk function
    followed by a probabilistic sampling process. This produces a smoother
    relationship between risk inputs and XGBoost probability.

    This is NOT a real customs incident dataset.
    """

    rng = np.random.default_rng(_RANDOM_SEED)

    data = {
        feature: rng.uniform(0, 100, n)
        for feature in FEATURES
    }

    df = pd.DataFrame(data)

    # Relative importance of each risk source.
    #
    # YOLO remains the strongest individual security signal.
    # LSTM and Isolation Forest contribute genuine anomaly information.
    weights = {
        "gps_score": 0.16,
        "rfid_score": 0.08,
        "sensor_score": 0.16,
        "manifest_score": 0.14,
        "yolo_score": 0.22,
        "delay_score": 0.08,
        "lstm_anomaly_score": 0.08,
        "isolation_forest_score": 0.08,
    }

    weighted_score = sum(
        df[feature] * weight
        for feature, weight in weights.items()
    )

    # Add a small interaction between the two anomaly detectors.
    anomaly_interaction = (
        df["lstm_anomaly_score"]
        * df["isolation_forest_score"]
        / 100.0
    ) * 0.04

    # YOLO + manifest combination represents a stronger inspection signal.
    inspection_interaction = (
        df["yolo_score"]
        * df["manifest_score"]
        / 100.0
    ) * 0.06

    continuous_score = (
        weighted_score
        + anomaly_interaction
        + inspection_interaction
    )

    # Convert the continuous risk score into a probability.
    #
    # Centering around approximately 50 gives the classifier a smoother
    # transition from normal to high-risk conditions.
    logit = (
        (continuous_score - 50.0) / 10.0
    )

    probability = 1.0 / (
        1.0 + np.exp(-logit)
    )

    # Sample binary outcomes from the generated probability.
    labels = (
        rng.random(n) < probability
    ).astype(int)

    # Ensure both classes are present.
    if labels.sum() == 0:
        labels[np.argmax(probability)] = 1

    if labels.sum() == n:
        labels[np.argmin(probability)] = 0

    return df, labels


def _get_model() -> XGBClassifier:
    """Create and cache the actual XGBoost classifier."""

    global _model

    if _model is not None:
        return _model

    with _lock:
        if _model is not None:
            return _model

        X, y = _synthetic_training_data()

        model = XGBClassifier(
            n_estimators=150,
            max_depth=4,
            learning_rate=0.06,
            subsample=0.9,
            colsample_bytree=0.9,
            objective="binary:logistic",
            eval_metric="logloss",
            random_state=_RANDOM_SEED,
            n_jobs=1,
        )

        model.fit(X, y)

        _model = model

        return _model


def _risk_level(score: float) -> RiskLevel:
    if score >= 61:
        return RiskLevel.HIGH

    if score >= 31:
        return RiskLevel.MEDIUM

    return RiskLevel.LOW


def _describe(
    key: str,
    value: float,
) -> str:

    if value < TRIGGER_THRESHOLD:
        return "Within normal range"

    descriptions = {
        "gps_score": (
            "GPS track deviates from the expected route "
            "or signal is invalid"
        ),
        "rfid_score": (
            "RFID tag scan failed or returned an unexpected read"
        ),
        "sensor_score": (
            "Sensor telemetry is outside the expected range"
        ),
        "manifest_score": (
            "Declared manifest does not match observed cargo information"
        ),
        "yolo_score": (
            "X-ray screening flagged a restricted or high-threat object"
        ),
        "delay_score": (
            "Container is significantly behind its predicted schedule"
        ),
        "lstm_anomaly_score": (
            "LSTM detected an unusual future sensor-state pattern"
        ),
        "isolation_forest_score": (
            "Isolation Forest detected anomalous container telemetry"
        ),
    }

    return descriptions.get(
        key,
        "Risk factor exceeded the normal threshold",
    )


def _recommend(
    risk_level: RiskLevel,
    factors: list[dict],
) -> str:

    top = factors[0] if factors else None

    if risk_level == RiskLevel.HIGH:

        if top and top["factor"] == "yolo_score":
            return "Security Team Required"

        return "Secondary Inspection Required"

    if risk_level == RiskLevel.MEDIUM:
        return "Open Container"

    return "Proceed Normally"


class XGBoostRiskService:
    """Actual XGBoost inference service."""

    @classmethod
    def get_model(cls) -> XGBClassifier:
        return _get_model()

    @classmethod
    def score(
        cls,
        inputs: RiskInputs,
    ) -> RiskPrediction:

        model = cls.get_model()

        raw = {
            "gps_score": float(inputs.gps_score),
            "rfid_score": float(inputs.rfid_score),
            "sensor_score": float(inputs.sensor_score),
            "manifest_score": float(inputs.manifest_score),
            "yolo_score": float(inputs.yolo_score),
            "delay_score": float(inputs.delay_score),
            "lstm_anomaly_score": float(
                inputs.lstm_anomaly_score
            ),
            "isolation_forest_score": float(
                inputs.isolation_forest_score
            ),
        }

        row = pd.DataFrame(
            [[raw[feature] for feature in FEATURES]],
            columns=FEATURES,
        )

        probability = float(
            model.predict_proba(row)[0][1]
        )

        # Convert model probability to the application's
        # 0-100 risk score.
        final_score = round(
            max(
                0.0,
                min(
                    100.0,
                    probability * 100.0,
                ),
            ),
            1,
        )

        risk_level = _risk_level(
            final_score
        )

        # Probability farther from 0.5 means stronger
        # model confidence.
        confidence = round(
            0.5 + abs(
                probability - 0.5
            ),
            2,
        )

        # Feature contributions are based on the trained
        # tree model's feature importance.
        importance = model.feature_importances_

        factors: list[dict] = []

        for index, feature in enumerate(FEATURES):

            raw_value = raw[feature]

            contribution = (
                raw_value
                * float(importance[index])
            )

            factors.append(
                {
                    "factor": feature,
                    "label": FEATURE_LABELS[feature],
                    "contribution": round(
                        contribution,
                        1,
                    ),
                    "triggered": (
                        raw_value
                        >= TRIGGER_THRESHOLD
                    ),
                    "description": _describe(
                        feature,
                        raw_value,
                    ),
                }
            )

        factors.sort(
            key=lambda item: item["contribution"],
            reverse=True,
        )

        return RiskPrediction(
            final_score=final_score,
            risk_level=risk_level,
            confidence=confidence,
            recommendation=_recommend(
                risk_level,
                factors,
            ),
            factors=factors,
        )