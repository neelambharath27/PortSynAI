from datetime import datetime

from pydantic import BaseModel


class ContainerInfo(BaseModel):
    """Static/slow-changing container context shown on the info card."""

    container_id: str
    container_code: str
    ship_name: str | None = None
    source_port: str | None = None
    destination_port: str | None = None
    status: str
    speed: float
    eta: datetime | None = None
    last_updated: datetime


class SensorSnapshot(BaseModel):
    temperature: float
    humidity: float
    battery: float
    door_status: str
    gps_status: str
    rfid_status: str
    latitude: float
    longitude: float


class HealthBreakdown(BaseModel):
    score: float
    band: str  # excellent | good | warning | critical
    temperature_penalty: float
    humidity_penalty: float
    battery_penalty: float
    door_penalty: float


class TimelineEvent(BaseModel):
    id: str
    type: str
    message: str
    timestamp: datetime


class HistoryPoint(BaseModel):
    timestamp: datetime
    temperature: float
    humidity: float
    battery: float
    speed: float


class PositionPoint(BaseModel):
    lat: float
    lng: float
    timestamp: datetime


class ComponentHealth(BaseModel):
    """Green / yellow / red status for one monitored subsystem."""

    label: str
    status: str  # green | yellow | red
    detail: str


class AIRecommendationOut(BaseModel):
    action: str
    label: str
    reason: str
    severity: str  # info | warning | critical


class DigitalTwinState(BaseModel):
    """Full snapshot pushed on connect and broadcast on every tick."""

    type: str = "digital_twin_snapshot"
    container: ContainerInfo
    sensors: SensorSnapshot
    health: HealthBreakdown
    risk_level: str
    twin_synced: bool
    last_sync_time: datetime
    websocket_connected: bool
    sensor_status: str  # ok | degraded | offline
    timeline: list[TimelineEvent]
    history: list[HistoryPoint]
    destination: PositionPoint | None
    previous_path: list[PositionPoint]
    component_health: list[ComponentHealth]
    recommendation: AIRecommendationOut
    server_time: datetime


class DigitalTwinListItem(BaseModel):
    """Lightweight entry for the container picker on the Digital Twin page."""

    container_id: str
    container_code: str
    ship_name: str | None = None
    status: str
    risk_level: str
    health_score: float

class TwinContainerOption(BaseModel):
    """Lightweight container option for the Digital Twin picker."""

    container_id: str
    container_code: str
    ship_name: str | None = None
    status: str
    risk_level: str
    health_score: float


class TwinHistoryPoint(BaseModel):
    """One historical sensor reading for a container twin."""

    temperature: float
    humidity: float
    battery_level: float
    door_status: str
    movement_status: str
    gps_valid: bool
    health_status: str
    recorded_at: datetime


class TwinHistoryOut(BaseModel):
    """Historical sensor data for one container."""

    container_id: str
    container_code: str
    points: list[TwinHistoryPoint]


class TwinSummary(BaseModel):
    """Summary information for one container's digital twin."""

    container_id: str
    container_code: str
    ship_name: str | None = None
    status: str
    risk_level: str
    health_score: float


class TwinSnapshot(BaseModel):
    """Complete Digital Twin snapshot containing all container twins."""

    twins: list[TwinSummary]