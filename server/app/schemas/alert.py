from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import AlertSeverity


class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: str
    severity: AlertSeverity
    container_id: str | None
    message: str
    is_read: bool
    created_at: datetime
