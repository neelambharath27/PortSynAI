from datetime import datetime

from pydantic import BaseModel


class ContainerLiveOut(BaseModel):
    id: str
    container_code: str
    status: str
    cargo_type: str
    lat: float
    lng: float
    speed: float
    heading: float
    origin_port: str | None = None
    destination_port: str | None = None
    ship_name: str | None = None
    eta: datetime | None = None
    distance_remaining_km: float | None = None
    updated_at: datetime


class TrackingSnapshot(BaseModel):
    type: str = "tracking_snapshot"
    server_time: datetime
    containers: list[ContainerLiveOut]


class RouteWaypoint(BaseModel):
    lat: float
    lng: float
    timestamp: datetime


class RouteHistoryOut(BaseModel):
    container_id: str
    container_code: str
    waypoints: list[RouteWaypoint]
    eta_predicted: datetime | None = None
    delay_probability: float
