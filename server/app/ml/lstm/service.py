"""
LSTM sensor forecasting service for PortSynAI.

The model learns temporal patterns from temperature, humidity, and battery
sensor sequences and predicts the next sensor state.

IMPORTANT:
The initial model is trained on reproducible synthetic sensor sequences.
It is a genuine PyTorch LSTM, but it is NOT trained on real historical
customs/container data yet.
"""

from __future__ import annotations

import threading
from dataclasses import dataclass

import numpy as np
import torch
from torch import nn


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

FEATURES = [
    "temperature",
    "humidity",
    "battery_level",
]

SEQUENCE_LENGTH = 12
TRAIN_SEQUENCES = 600
EPOCHS = 60
LEARNING_RATE = 0.005
RANDOM_SEED = 42

_lock = threading.Lock()
_model: "SensorLSTM | None" = None


# ---------------------------------------------------------------------------
# Result object
# ---------------------------------------------------------------------------

@dataclass
class LSTMPrediction:
    predicted_temperature: float
    predicted_humidity: float
    predicted_battery_level: float
    anomaly_score: float
    prediction_confidence: float


# ---------------------------------------------------------------------------
# LSTM neural network
# ---------------------------------------------------------------------------

class SensorLSTM(nn.Module):
    def __init__(
        self,
        input_size: int = 3,
        hidden_size: int = 32,
        num_layers: int = 2,
        output_size: int = 3,
    ) -> None:
        super().__init__()

        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=0.1 if num_layers > 1 else 0.0,
        )

        self.fc = nn.Sequential(
            nn.Linear(hidden_size, 16),
            nn.ReLU(),
            nn.Linear(16, output_size),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        output, _ = self.lstm(x)

        # Use the final time step.
        last_output = output[:, -1, :]

        return self.fc(last_output)


# ---------------------------------------------------------------------------
# Synthetic training data
# ---------------------------------------------------------------------------

def _generate_training_data() -> tuple[torch.Tensor, torch.Tensor]:
    """
    Generate deterministic temporal sensor patterns.

    Each sequence contains:
        temperature
        humidity
        battery level

    The target is the next sensor state.
    """

    rng = np.random.default_rng(RANDOM_SEED)

    sequences: list[np.ndarray] = []
    targets: list[np.ndarray] = []

    for _ in range(TRAIN_SEQUENCES):
        start_temperature = rng.uniform(18.0, 30.0)
        start_humidity = rng.uniform(40.0, 80.0)
        start_battery = rng.uniform(70.0, 100.0)

        rows = []

        temperature = start_temperature
        humidity = start_humidity
        battery = start_battery

        # Generate a temporal sequence.
        for step in range(SEQUENCE_LENGTH + 1):
            temperature += rng.normal(0.0, 0.35)
            humidity += rng.normal(0.0, 0.8)
            battery -= rng.uniform(0.05, 0.30)

            # Keep synthetic values within sensible ranges.
            temperature = float(np.clip(temperature, 5.0, 45.0))
            humidity = float(np.clip(humidity, 10.0, 100.0))
            battery = float(np.clip(battery, 0.0, 100.0))

            rows.append(
                [
                    temperature,
                    humidity,
                    battery,
                ]
            )

        rows_array = np.asarray(rows, dtype=np.float32)

        # First 12 readings are input.
        sequences.append(rows_array[:SEQUENCE_LENGTH])

        # 13th reading is the prediction target.
        targets.append(rows_array[SEQUENCE_LENGTH])

    x = torch.tensor(np.asarray(sequences), dtype=torch.float32)
    y = torch.tensor(np.asarray(targets), dtype=torch.float32)

    return x, y


# ---------------------------------------------------------------------------
# Normalization
# ---------------------------------------------------------------------------

_FEATURE_MIN = torch.tensor(
    [5.0, 10.0, 0.0],
    dtype=torch.float32,
)

_FEATURE_MAX = torch.tensor(
    [45.0, 100.0, 100.0],
    dtype=torch.float32,
)


def _normalize(x: torch.Tensor) -> torch.Tensor:
    return (x - _FEATURE_MIN) / (_FEATURE_MAX - _FEATURE_MIN)


def _denormalize(x: torch.Tensor) -> torch.Tensor:
    return x * (_FEATURE_MAX - _FEATURE_MIN) + _FEATURE_MIN


# ---------------------------------------------------------------------------
# Train model
# ---------------------------------------------------------------------------

def _train_model() -> SensorLSTM:
    torch.manual_seed(RANDOM_SEED)
    np.random.seed(RANDOM_SEED)

    x, y = _generate_training_data()

    x_normalized = _normalize(x)
    y_normalized = _normalize(y)

    model = SensorLSTM()

    optimizer = torch.optim.Adam(
        model.parameters(),
        lr=LEARNING_RATE,
    )

    loss_function = nn.MSELoss()

    model.train()

    for _ in range(EPOCHS):
        optimizer.zero_grad()

        prediction = model(x_normalized)

        loss = loss_function(
            prediction,
            y_normalized,
        )

        loss.backward()
        optimizer.step()

    model.eval()

    return model


# ---------------------------------------------------------------------------
# Get singleton model
# ---------------------------------------------------------------------------

def _get_model() -> SensorLSTM:
    global _model

    if _model is not None:
        return _model

    with _lock:
        if _model is None:
            _model = _train_model()

    return _model


# ---------------------------------------------------------------------------
# Public prediction function
# ---------------------------------------------------------------------------

def predict_next_sensor_state(
    readings: list[dict[str, float]],
) -> LSTMPrediction:
    """
    Predict the next sensor state from historical readings.

    Expected reading format:

    {
        "temperature": 24.5,
        "humidity": 61.0,
        "battery_level": 92.0
    }

    At least SEQUENCE_LENGTH readings are required.
    """

    if len(readings) < SEQUENCE_LENGTH:
        raise ValueError(
            f"LSTM requires at least {SEQUENCE_LENGTH} sensor readings; "
            f"received {len(readings)}."
        )

    values = []

    for reading in readings[-SEQUENCE_LENGTH:]:
        values.append(
            [
                float(reading.get("temperature", 0.0)),
                float(reading.get("humidity", 0.0)),
                float(reading.get("battery_level", 100.0)),
            ]
        )

    sequence = torch.tensor(
        [values],
        dtype=torch.float32,
    )

    sequence_normalized = _normalize(sequence)

    model = _get_model()

    with torch.no_grad():
        prediction_normalized = model(sequence_normalized)

    prediction = _denormalize(prediction_normalized[0])

    predicted_temperature = float(
        torch.clamp(prediction[0], 5.0, 45.0)
    )

    predicted_humidity = float(
        torch.clamp(prediction[1], 10.0, 100.0)
    )

    predicted_battery = float(
        torch.clamp(prediction[2], 0.0, 100.0)
    )

    # Compare the predicted state with the latest observed state.
    latest = sequence[0, -1]

    differences = torch.tensor(
        [
            abs(predicted_temperature - float(latest[0])),
            abs(predicted_humidity - float(latest[1])),
            abs(predicted_battery - float(latest[2])),
        ],
        dtype=torch.float32,
    )

    # Normalize the differences so they can be combined.
    normalized_difference = differences / torch.tensor(
        [40.0, 90.0, 100.0],
        dtype=torch.float32,
    )

    anomaly_score = float(
        torch.clamp(
            normalized_difference.mean() * 100.0,
            0.0,
            100.0,
        )
    )

    # Confidence decreases as the prediction moves further away from the
    # latest observed state.
    prediction_confidence = float(
        np.clip(
            1.0 - (anomaly_score / 150.0),
            0.50,
            0.99,
        )
    )

    return LSTMPrediction(
        predicted_temperature=round(predicted_temperature, 2),
        predicted_humidity=round(predicted_humidity, 2),
        predicted_battery_level=round(predicted_battery, 2),
        anomaly_score=round(anomaly_score, 2),
        prediction_confidence=round(prediction_confidence, 2),
    )


# ---------------------------------------------------------------------------
# Simple health check
# ---------------------------------------------------------------------------

def health_check() -> dict[str, object]:
    """
    Train/load the model and return basic information.
    """

    model = _get_model()

    parameter_count = sum(
        parameter.numel()
        for parameter in model.parameters()
    )

    return {
        "model": "LSTM",
        "framework": "PyTorch",
        "features": FEATURES,
        "sequence_length": SEQUENCE_LENGTH,
        "training_sequences": TRAIN_SEQUENCES,
        "epochs": EPOCHS,
        "parameter_count": parameter_count,
        "device": "cpu",
        "status": "ready",
    }