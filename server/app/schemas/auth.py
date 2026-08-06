from pydantic import BaseModel, EmailStr

from app.models.enums import UserRole
from app.schemas.user import UserOut


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: UserRole


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut
