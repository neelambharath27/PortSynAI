import enum


class UserRole(str, enum.Enum):
    ADMINISTRATOR = "administrator"
    PORT_OPERATOR = "port_operator"
    CUSTOMS_OFFICER = "customs_officer"
    SECURITY_OFFICER = "security_officer"


class ContainerStatus(str, enum.Enum):
    MOVING = "moving"
    DELAYED = "delayed"
    CLEARED = "cleared"
    HIGH_RISK = "high_risk"
    IDLE = "idle"


class DoorStatus(str, enum.Enum):
    CLOSED = "closed"
    OPEN = "open"


class MovementStatus(str, enum.Enum):
    MOVING = "moving"
    STATIONARY = "stationary"


class AnomalyType(str, enum.Enum):
    ROUTE_DEVIATION = "route_deviation"
    GPS_SPOOFING = "gps_spoofing"
    UNAUTHORIZED_STOP = "unauthorized_stop"
    DOOR_OPEN = "door_open"
    IDLE_CONTAINER = "idle_container"
    TEMPERATURE_ANOMALY = "temperature_anomaly"


class RiskLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class InspectionStatus(str, enum.Enum):
    PENDING = "pending"
    PASSED = "passed"
    FLAGGED = "flagged"

class ThreatLevel(str, enum.Enum):
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ClearanceStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class AlertSeverity(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class ShipStatus(str, enum.Enum):
    DOCKED = "docked"
    EN_ROUTE = "en_route"
    DEPARTING = "departing"

class TwinRiskLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"
    
class ConnectivityStatus(str, enum.Enum):
    CONNECTED = "connected"
    DEGRADED = "degraded"
    LOST = "lost"