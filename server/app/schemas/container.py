from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import ContainerStatus


class ContainerBase(BaseModel):
    container_code: str
    ship_id: str | None = None
    origin_port_id: str | None = None
    destination_port_id: str | None = None
    current_lat: float = 0.0
    current_lng: float = 0.0
    speed: float = 0.0
    heading: float = 0.0
    status: ContainerStatus = ContainerStatus.MOVING
    cargo_type: str = "General"
    weight_kg: float = 0.0


class ContainerCreate(ContainerBase):
    pass


class ContainerUpdate(BaseModel):
    ship_id: str | None = None
    current_lat: float | None = None
    current_lng: float | None = None
    speed: float | None = None
    heading: float | None = None
    status: ContainerStatus | None = None
    cargo_type: str | None = None
    weight_kg: float | None = None


class ContainerOut(ContainerBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: datetime
    updated_at: datetime
