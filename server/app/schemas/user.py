from pydantic import BaseModel, EmailStr, ConfigDict

from app.models.enums import UserRole


class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: UserRole
    phone: str | None = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None


class UserOut(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    is_active: bool
