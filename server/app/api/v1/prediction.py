from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.container import Container
from app.models.sensor_reading import SensorReading
from app.ml.lstm.service import predict_next_sensor_state


router = APIRouter(
    prefix="/prediction",
    tags=["AI Prediction"],
)


class PredictionOut(BaseModel):
    container_id: str
    container_code: str

    current_temperature: float
    predicted_temperature: float

    current_humidity: float
    predicted_humidity: float

    current_battery_level: float
    predicted_battery_level: float

    anomaly_score: float
    prediction_confidence: float

    generated_at: datetime


@router.get(
    "/container/{container_id}",
    response_model=PredictionOut,
)
def predict_container(
    container_id: str,
    db: Session = Depends(get_db),
) -> PredictionOut:

    # ---------------------------------------------------------
    # 1. Find the container
    # ---------------------------------------------------------
    container = db.get(Container, container_id)

    if not container:
        raise HTTPException(
            status_code=404,
            detail="Container not found",
        )

    # ---------------------------------------------------------
    # 2. Get the latest 12 sensor readings
    # ---------------------------------------------------------
    readings = db.scalars(
        select(SensorReading)
        .where(SensorReading.container_id == container_id)
        .order_by(SensorReading.recorded_at.desc())
        .limit(12)
    ).all()

    if len(readings) < 12:
        raise HTTPException(
            status_code=400,
            detail="At least 12 sensor readings are required for LSTM prediction.",
        )

    # Reverse so readings are in chronological order
    readings = list(reversed(readings))

    # ---------------------------------------------------------
    # 3. Prepare data for the LSTM model
    # ---------------------------------------------------------
    model_input = [
        {
            "temperature": reading.temperature,
            "humidity": reading.humidity,
            "battery_level": reading.battery_level,
        }
        for reading in readings
    ]

    # ---------------------------------------------------------
    # 4. Run LSTM prediction
    # ---------------------------------------------------------
    prediction = predict_next_sensor_state(model_input)

    # ---------------------------------------------------------
    # 5. Get the latest actual sensor reading
    # ---------------------------------------------------------
    latest = readings[-1]

    # ---------------------------------------------------------
    # 6. Return prediction result
    # ---------------------------------------------------------
    return PredictionOut(
        container_id=container.id,
        container_code=container.container_code,

        current_temperature=latest.temperature,
        predicted_temperature=prediction.predicted_temperature,

        current_humidity=latest.humidity,
        predicted_humidity=prediction.predicted_humidity,

        current_battery_level=latest.battery_level,
        predicted_battery_level=prediction.predicted_battery_level,

        anomaly_score=prediction.anomaly_score,
        prediction_confidence=prediction.prediction_confidence,

        generated_at=datetime.now(timezone.utc),
    )