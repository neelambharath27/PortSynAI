from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import ShipStatus


class ShipBase(BaseModel):
    name: str
    imo_number: str
    port_id: str | None = None
    status: ShipStatus = ShipStatus.EN_ROUTE
    eta: datetime | None = None
    capacity: int = 0


class ShipCreate(ShipBase):
    pass


class ShipUpdate(BaseModel):
    name: str | None = None
    port_id: str | None = None
    status: ShipStatus | None = None
    eta: datetime | None = None
    capacity: int | None = None


class ShipOut(ShipBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
