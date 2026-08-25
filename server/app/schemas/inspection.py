from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import InspectionStatus, ThreatLevel


class DetectionBox(BaseModel):
    """One YOLO detection: label + category + confidence + normalized bbox
    (x, y, width, height as fractions of image width/height, so the
    frontend can draw it at any render size)."""

    label: str
    category: str
    confidence: float
    threat_level: ThreatLevel
    bbox: list[float] = Field(min_length=4, max_length=4)


class InspectionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    container_id: str
    image_path: str | None
    detected_objects: list[DetectionBox]
    inspector_id: str | None
    inspector_name: str | None = None
    status: InspectionStatus
    threat_level: ThreatLevel
    processing_ms: float | None
    created_at: datetime


class InspectionListItem(BaseModel):
    """Lighter payload for the history table."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    container_id: str
    container_code: str | None = None
    status: InspectionStatus
    threat_level: ThreatLevel
    object_count: int
    inspector_name: str | None = None
    created_at: datetime


class InspectionProgress(BaseModel):
    type: str = "inspection_progress"
    inspection_id: str
    stage: str
    progress: int  # 0-100
    message: str
    result: InspectionOut | None = None
