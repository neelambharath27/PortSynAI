from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from sklearn.ensemble import IsolationForest


@dataclass
class AnomalyResult:
    is_anomaly: bool
    anomaly_score: float
    confidence: float


class IsolationForestService:
    """
    Isolation Forest anomaly detector for live container telemetry.

    Features:
        temperature
        humidity
        battery
        gps_valid
        door_status
        movement_status
    """

    _model: IsolationForest | None = None

    @classmethod
    def _get_model(cls) -> IsolationForest:
        if cls._model is None:
            rng = np.random.default_rng(42)

            # Baseline synthetic telemetry used to establish
            # normal operating behaviour.
            normal_data = np.column_stack(
                [
                    rng.normal(15.0, 5.0, 3000),       # temperature
                    rng.normal(65.0, 15.0, 3000),      # humidity
                    rng.normal(75.0, 15.0, 3000),      # battery
                    rng.choice([0.0, 1.0], 3000, p=[0.02, 0.98]),  # GPS
                    rng.choice([0.0, 1.0], 3000, p=[0.95, 0.05]),  # door
                    rng.choice([0.0, 1.0], 3000, p=[0.20, 0.80]),  # movement
                ]
            )

            model = IsolationForest(
                n_estimators=200,
                contamination=0.05,
                random_state=42,
                n_jobs=-1,
            )

            model.fit(normal_data)
            cls._model = model

        return cls._model

    @classmethod
    def detect(
        cls,
        *,
        temperature: float,
        humidity: float,
        battery: float,
        gps_valid: bool,
        door_status: str,
        movement_status: str,
    ) -> AnomalyResult:
        model = cls._get_model()

        door_value = 1.0 if str(door_status).lower() == "open" else 0.0
        movement_value = (
            1.0
            if str(movement_status).lower() in {"moving", "in_transit"}
            else 0.0
        )
        gps_value = 1.0 if gps_valid else 0.0

        features = np.array(
            [
                [
                    float(temperature),
                    float(humidity),
                    float(battery),
                    gps_value,
                    door_value,
                    movement_value,
                ]
            ]
        )

        prediction = int(model.predict(features)[0])
        raw_score = float(model.decision_function(features)[0])

        # Convert the Isolation Forest score into a simple
        # 0-100 anomaly-risk scale.
        anomaly_score = float(
            np.clip((0.5 - raw_score) * 100.0, 0.0, 100.0)
        )

        is_anomaly = prediction == -1

        confidence = float(
            np.clip(
                0.50 + abs(raw_score) * 2.0,
                0.50,
                0.99,
            )
        )

        return AnomalyResult(
            is_anomaly=is_anomaly,
            anomaly_score=round(anomaly_score, 1),
            confidence=round(confidence, 2),
        )