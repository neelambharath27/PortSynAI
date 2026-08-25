"""XGBoost composite risk scoring engine.

No trained model or labeled incident dataset is available in this
environment, so `_MockXGBoostModel.predict` combines the six input signals
with fixed weights (standing in for learned `feature_importances_`) instead
of running a real boosted-tree inference pass. The public surface
(`XGBoostRiskService.score`) returns the same shape a real model would
(final score + per-feature contributions), so replacing the mock with
`xgboost.Booster.predict()` + a SHAP `TreeExplainer` later is a change
contained entirely to this file.

The "model" is loaded/cached once per process, per the performance
requirement to cache the XGBoost model rather than reconstruct it per call.
"""

from __future__ import annotations

import random
import time
from dataclasses import dataclass, field

from app.models.enums import RiskLevel

# Feature weight = its contribution to the 0-100 final score at a raw input
# of 100. Stands in for a trained model's feature_importances_. Signals sum
# to noticeably more than 1.0 combined because in practice a container
# rarely trips more than 2-3 of these at once — this keeps single-signal
# incidents (e.g. just a temperature spike) from being under-weighted while
# still capping the final blended score at 100.
FEATURE_WEIGHTS: dict[str, float] = {
    "gps_score": 0.22,
    "rfid_score": 0.12,
    "sensor_score": 0.20,
    "manifest_score": 0.20,
    "yolo_score": 0.34,
    "delay_score": 0.10,
}

FEATURE_LABELS: dict[str, str] = {
    "gps_score": "GPS Deviation",
    "rfid_score": "RFID Failure",
    "sensor_score": "Sensor Anomaly (Temp / Humidity / Battery / Door)",
    "manifest_score": "Manifest Mismatch",
    "yolo_score": "YOLO Detection",
    "delay_score": "Delay / ETA Risk",
}

TRIGGER_THRESHOLD = 25.0  # a factor is called out as "triggered" above this


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


class _MockXGBoostModel:
    def __init__(self) -> None:
        self.loaded_at = time.monotonic()
        self.weights = FEATURE_WEIGHTS

    def predict(self, inputs: RiskInputs) -> RiskPrediction:
        raw = {
            "gps_score": inputs.gps_score,
            "rfid_score": inputs.rfid_score,
            "sensor_score": inputs.sensor_score,
            "manifest_score": inputs.manifest_score,
            "yolo_score": inputs.yolo_score,
            "delay_score": inputs.delay_score,
        }

        contributions = {k: raw[k] * self.weights[k] for k in raw}
        final_score = round(min(100.0, sum(contributions.values())), 1)

        factors = sorted(
            (
                {
                    "factor": key,
                    "label": FEATURE_LABELS[key],
                    "contribution": round(value, 1),
                    "triggered": raw[key] >= TRIGGER_THRESHOLD,
                    "description": _describe(key, raw[key]),
                }
                for key, value in contributions.items()
            ),
            key=lambda f: f["contribution"],
            reverse=True,
        )

        risk_level = _risk_level(final_score)
        # A real model's confidence would come from predicted-probability
        # margin; here it's a function of how many signals agree (more
        # agreement among high-contributing factors -> higher confidence).
        triggered = sum(1 for f in factors if f["triggered"])
        confidence = round(min(0.98, 0.78 + 0.05 * triggered + random.uniform(-0.03, 0.03)), 2)

        return RiskPrediction(
            final_score=final_score,
            risk_level=risk_level,
            confidence=confidence,
            recommendation=_recommend(risk_level, factors),
            factors=factors,
        )


def _risk_level(score: float) -> RiskLevel:
    if score >= 81:
        return RiskLevel.CRITICAL
    if score >= 61:
        return RiskLevel.HIGH
    if score >= 31:
        return RiskLevel.MEDIUM
    return RiskLevel.LOW


def _describe(key: str, value: float) -> str:
    if value < TRIGGER_THRESHOLD:
        return "Within normal range"
    descriptions = {
        "gps_score": "GPS track deviates from the expected route or signal is invalid",
        "rfid_score": "RFID tag scan failed or returned an unexpected read",
        "sensor_score": "Sensor telemetry (temperature/humidity/battery/door) is out of range",
        "manifest_score": "Declared manifest doesn't match observed cargo weight or contents",
        "yolo_score": "X-ray screening flagged a restricted or high-threat object",
        "delay_score": "Container is significantly behind its predicted schedule",
    }
    return descriptions[key]


def _recommend(risk_level: RiskLevel, factors: list[dict]) -> str:
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


class XGBoostRiskService:
    _model: _MockXGBoostModel | None = None

    @classmethod
    def get_model(cls) -> _MockXGBoostModel:
        if cls._model is None:
            cls._model = _MockXGBoostModel()
        return cls._model

    @classmethod
    def score(cls, inputs: RiskInputs) -> RiskPrediction:
        return cls.get_model().predict(inputs)
