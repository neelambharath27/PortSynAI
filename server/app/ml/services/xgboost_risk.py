"""
Real XGBoost-based composite risk scoring engine.

Prototype note:
The project currently does not contain a real historical, labeled customs
incident dataset. Therefore, this module trains a deterministic XGBoost
regressor on a synthetic prototype dataset.

The model itself is a genuine XGBRegressor. The eight risk signals produced
by the risk-input aggregation pipeline are used as model features.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from functools import lru_cache

import numpy as np
import pandas as pd
from xgboost import XGBRegressor

from app.models.enums import RiskLevel


# ---------------------------------------------------------------------------
# Feature configuration
# ---------------------------------------------------------------------------

FEATURES = [
    "gps_score",
    "rfid_score",
    "sensor_score",
    "manifest_score",
    "yolo_score",
    "delay_score",
    "lstm_anomaly_score",
    "isolation_forest_score",
]


FEATURE_LABELS = {
    "gps_score": "GPS Deviation",
    "rfid_score": "RFID Failure",
    "sensor_score": "Sensor Anomaly",
    "manifest_score": "Manifest Mismatch",
    "yolo_score": "YOLO Detection",
    "delay_score": "Delay / ETA Risk",
    "lstm_anomaly_score": "LSTM Anomaly",
    "isolation_forest_score": "Isolation Forest Anomaly",
}


# Prototype weights used only to create synthetic training labels.
# These are NOT claimed to be learned real-world weights.
SYNTHETIC_WEIGHTS = {
    "gps_score": 0.12,
    "rfid_score": 0.08,
    "sensor_score": 0.16,
    "manifest_score": 0.14,
    "yolo_score": 0.18,
    "delay_score": 0.08,
    "lstm_anomaly_score": 0.12,
    "isolation_forest_score": 0.12,
}


TRIGGER_THRESHOLD = 25.0


# ---------------------------------------------------------------------------
# Input / output data structures
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Synthetic prototype dataset
# ---------------------------------------------------------------------------

def _build_training_data(
    n_samples: int = 5000,
    seed: int = 42,
) -> tuple[pd.DataFrame, np.ndarray]:
    """
    Create deterministic synthetic training data.

    All eight features are represented on a 0-100 risk scale.
    """

    rng = np.random.default_rng(seed)

    X = pd.DataFrame(
        rng.uniform(
            low=0.0,
            high=100.0,
            size=(n_samples, len(FEATURES)),
        ),
        columns=FEATURES,
    )

    weighted_score = sum(
        X[feature] * weight
        for feature, weight in SYNTHETIC_WEIGHTS.items()
    )

    # Non-linear interactions make the prototype model learn something
    # beyond a simple linear weighted sum.
    interaction = (
        0.08 * np.sqrt(X["yolo_score"] * X["sensor_score"])
        + 0.05 * np.sqrt(
            X["lstm_anomaly_score"]
            * X["isolation_forest_score"]
        )
        + 0.04 * np.sqrt(
            X["gps_score"] * X["delay_score"]
        )
    )

    noise = rng.normal(
        loc=0.0,
        scale=2.0,
        size=n_samples,
    )

    y = np.clip(
        weighted_score + interaction + noise,
        0.0,
        100.0,
    )

    return X, y


# ---------------------------------------------------------------------------
# XGBoost model
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def get_xgboost_model() -> XGBRegressor:
    """
    Train and cache the XGBoost prototype model.

    Training occurs only once per Python process.
    """

    X_train, y_train = _build_training_data()

    model = XGBRegressor(
        n_estimators=250,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.9,
        colsample_bytree=0.9,
        objective="reg:squarederror",
        random_state=42,
        n_jobs=1,
    )

    model.fit(X_train, y_train)

    return model


# ---------------------------------------------------------------------------
# Risk-level mapping
# ---------------------------------------------------------------------------

def _risk_level(score: float) -> RiskLevel:
    if score >= 81:
        return RiskLevel.CRITICAL

    if score >= 61:
        return RiskLevel.HIGH

    if score >= 31:
        return RiskLevel.MEDIUM

    return RiskLevel.LOW


# ---------------------------------------------------------------------------
# Feature descriptions
# ---------------------------------------------------------------------------

def _describe(
    key: str,
    value: float,
) -> str:

    if value < TRIGGER_THRESHOLD:
        return "Within normal range"

    descriptions = {
        "gps_score":
            "GPS track deviates from the expected route or signal is invalid",

        "rfid_score":
            "RFID tag scan failed or returned an unexpected read",

        "sensor_score":
            "Sensor telemetry is outside the expected operating range",

        "manifest_score":
            "Declared manifest differs from observed container information",

        "yolo_score":
            "X-ray screening flagged a potentially restricted or high-threat object",

        "delay_score":
            "Container is significantly behind its predicted schedule",

        "lstm_anomaly_score":
            "LSTM detected an unusual future sensor-state pattern",

        "isolation_forest_score":
            "Isolation Forest detected unusual container behaviour",
    }

    return descriptions.get(
        key,
        "Risk signal exceeded the configured threshold",
    )


# ---------------------------------------------------------------------------
# Recommendation
# ---------------------------------------------------------------------------

def _recommend(
    risk_level: RiskLevel,
    factors: list[dict],
) -> str:

    top = factors[0] if factors else None

    if risk_level == RiskLevel.CRITICAL:

        if top and top["factor"] == "yolo_score":
            return "Security Team Required"

        return "Immediate Customs Review"

    if risk_level == RiskLevel.HIGH:
        return "Secondary Inspection Required"

    if risk_level == RiskLevel.MEDIUM:
        return "Open Container"

    return "Proceed Normally"


# ---------------------------------------------------------------------------
# Model wrapper
# ---------------------------------------------------------------------------

class XGBoostRiskService:

    @classmethod
    def get_model(cls) -> XGBRegressor:
        return get_xgboost_model()

    @classmethod
    def score(
        cls,
        inputs: RiskInputs,
    ) -> RiskPrediction:

        model = cls.get_model()

        feature_values = {
            feature: float(
                max(
                    0.0,
                    min(
                        100.0,
                        getattr(inputs, feature),
                    ),
                )
            )
            for feature in FEATURES
        }

        X = pd.DataFrame(
            [feature_values],
            columns=FEATURES,
        )

        predicted_score = float(
            model.predict(X)[0]
        )

        final_score = round(
            max(
                0.0,
                min(
                    100.0,
                    predicted_score,
                ),
            ),
            1,
        )

        # Use XGBoost feature importance as a model-level signal for
        # confidence/explanation ordering. SHAP will provide the actual
        # per-container contribution explanation.
        importance_map = dict(
            zip(
                FEATURES,
                model.feature_importances_,
            )
        )

        raw_contributions = {
            feature:
                feature_values[feature]
                * float(importance_map.get(feature, 0.0))
            for feature in FEATURES
        }

        total_contribution = sum(
            raw_contributions.values()
        )

        if total_contribution > 0:
            factors = [
                {
                    "factor": feature,
                    "label": FEATURE_LABELS[feature],
                    "contribution": round(
                        raw_contributions[feature],
                        1,
                    ),
                    "triggered":
                        feature_values[feature]
                        >= TRIGGER_THRESHOLD,
                    "description": _describe(
                        feature,
                        feature_values[feature],
                    ),
                }
                for feature in FEATURES
            ]

            factors.sort(
                key=lambda item: item["contribution"],
                reverse=True,
            )

        else:
            factors = [
                {
                    "factor": feature,
                    "label": FEATURE_LABELS[feature],
                    "contribution": 0.0,
                    "triggered": False,
                    "description": "No measurable contribution",
                }
                for feature in FEATURES
            ]

        risk_level = _risk_level(final_score)

        # Prototype confidence:
        # Higher when several independent risk signals are elevated.
        triggered_count = sum(
            1
            for feature in FEATURES
            if feature_values[feature] >= TRIGGER_THRESHOLD
        )

        confidence = min(
            0.98,
            0.72 + (0.04 * triggered_count),
        )

        confidence = round(
            confidence,
            2,
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