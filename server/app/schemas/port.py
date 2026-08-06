from pydantic import BaseModel, ConfigDict


class PortBase(BaseModel):
    name: str
    code: str
    country: str
    latitude: float
    longitude: float


class PortCreate(PortBase):
    pass


class PortUpdate(BaseModel):
    name: str | None = None
    country: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class PortOut(PortBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
