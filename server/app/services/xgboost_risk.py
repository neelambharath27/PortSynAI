"""XGBoost-based composite risk scoring service.

The model is an actual XGBClassifier trained on a reproducible synthetic
training dataset because the project currently has no labeled real-world
customs incident dataset.

The trained model is cached in memory and used for risk prediction.
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
]

FEATURE_LABELS: dict[str, str] = {
    "gps_score": "GPS Deviation",
    "rfid_score": "RFID Failure",
    "sensor_score": "Sensor Anomaly",
    "manifest_score": "Manifest Mismatch",
    "yolo_score": "YOLO Detection",
    "delay_score": "Delay / ETA Risk",
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

    Each feature is represented on a 0-100 risk scale.

    This is NOT a real customs dataset. It is used only because the project
    currently does not contain labeled real-world incident outcomes.
    """

    rng = np.random.default_rng(_RANDOM_SEED)

    data = {
        feature: rng.uniform(0, 100, n)
        for feature in FEATURES
    }

    df = pd.DataFrame(data)

    # Training relationship used to create synthetic labels.
    # Higher values indicate higher operational/security risk.
    weights = {
        "gps_score": 0.22,
        "rfid_score": 0.12,
        "sensor_score": 0.20,
        "manifest_score": 0.20,
        "yolo_score": 0.34,
        "delay_score": 0.10,
    }

    weighted_score = sum(
        df[feature] * weight
        for feature, weight in weights.items()
    )

    noise = rng.normal(0, 7, n)

    synthetic_score = weighted_score + noise

    threshold = np.percentile(synthetic_score, 65)

    labels = (synthetic_score >= threshold).astype(int)

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
            learning_rate=0.08,
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


def _describe(key: str, value: float) -> str:
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
    }

    return descriptions[key]

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
    def score(cls, inputs: RiskInputs) -> RiskPrediction:
        model = cls.get_model()

        raw = {
            "gps_score": float(inputs.gps_score),
            "rfid_score": float(inputs.rfid_score),
            "sensor_score": float(inputs.sensor_score),
            "manifest_score": float(inputs.manifest_score),
            "yolo_score": float(inputs.yolo_score),
            "delay_score": float(inputs.delay_score),
        }

        row = pd.DataFrame(
            [[raw[feature] for feature in FEATURES]],
            columns=FEATURES,
        )

        probability = float(
            model.predict_proba(row)[0][1]
        )

        # Convert model probability to the application's 0-100 risk score.
        final_score = round(
            max(0.0, min(100.0, probability * 100.0)),
            1,
        )

        risk_level = _risk_level(final_score)

        # Probability farther from 0.5 means stronger model confidence.
        confidence = round(
            0.5 + abs(probability - 0.5),
            2,
        )

        # Feature contributions are based on the trained tree model's
        # feature importance and the current feature values.
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
                        raw_value >= TRIGGER_THRESHOLD
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