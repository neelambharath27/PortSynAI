from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import CredentialsException
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from app.database.session import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import LoginRequest, RefreshRequest, TokenResponse
from app.schemas.user import UserOut

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == payload.email))

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if user.role != payload.role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"This account does not hold the '{payload.role.value}' role",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated"
        )

    access_token = create_access_token(user.id, user.role.value)
    refresh_token = create_refresh_token(user.id, user.role.value)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserOut.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> TokenResponse:
    try:
        decoded = decode_token(payload.refresh_token)
    except ValueError as exc:
        raise CredentialsException("Invalid or expired refresh token") from exc

    if decoded.get("type") != "refresh":
        raise CredentialsException("Expected a refresh token")

    user = db.get(User, decoded.get("sub"))
    if user is None or not user.is_active:
        raise CredentialsException("User not found or inactive")

    access_token = create_access_token(user.id, user.role.value)
    new_refresh_token = create_refresh_token(user.id, user.role.value)

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        user=UserOut.model_validate(user),
    )


@router.post("/logout", response_model=dict)
def logout(current_user: User = Depends(get_current_user)) -> dict:
    # Stateless JWT: logout is handled client-side by discarding tokens.
    # Kept as a real endpoint so audit logging can hook in later.
    return {"detail": "Logged out successfully"}


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
