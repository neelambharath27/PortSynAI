from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictException, NotFoundException
from app.core.rbac import require_role
from app.core.security import hash_password
from app.database.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.user import UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])

admin_only = require_role(UserRole.ADMINISTRATOR)


@router.get("", response_model=list[UserOut], dependencies=[Depends(admin_only)])
def list_users(db: Session = Depends(get_db)) -> list[User]:
    return list(db.scalars(select(User).order_by(User.created_at.desc())))


@router.post("", response_model=UserOut, status_code=201, dependencies=[Depends(admin_only)])
def create_user(payload: UserCreate, db: Session = Depends(get_db)) -> User:
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing:
        raise ConflictException("A user with this email already exists")

    user = User(
        name=payload.name,
        email=payload.email,
        role=payload.role,
        phone=payload.phone,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserOut, dependencies=[Depends(admin_only)])
def get_user(user_id: str, db: Session = Depends(get_db)) -> User:
    user = db.get(User, user_id)
    if not user:
        raise NotFoundException("User not found")
    return user


@router.put("/{user_id}", response_model=UserOut, dependencies=[Depends(admin_only)])
def update_user(user_id: str, payload: UserUpdate, db: Session = Depends(get_db)) -> User:
    user = db.get(User, user_id)
    if not user:
        raise NotFoundException("User not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204, dependencies=[Depends(admin_only)])
def delete_user(user_id: str, db: Session = Depends(get_db)) -> None:
    user = db.get(User, user_id)
    if not user:
        raise NotFoundException("User not found")
    db.delete(user)
    db.commit()
