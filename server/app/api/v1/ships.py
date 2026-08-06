from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictException, NotFoundException
from app.core.rbac import require_role
from app.database.session import get_db
from app.dependencies import get_current_user
from app.models.enums import UserRole
from app.models.ship import Ship
from app.schemas.ship import ShipCreate, ShipOut, ShipUpdate

router = APIRouter(prefix="/ships", tags=["Ships"])

admin_or_operator = require_role(UserRole.ADMINISTRATOR, UserRole.PORT_OPERATOR)


@router.get("", response_model=list[ShipOut], dependencies=[Depends(get_current_user)])
def list_ships(db: Session = Depends(get_db)) -> list[Ship]:
    return list(db.scalars(select(Ship).order_by(Ship.name)))


@router.post("", response_model=ShipOut, status_code=201, dependencies=[Depends(admin_or_operator)])
def create_ship(payload: ShipCreate, db: Session = Depends(get_db)) -> Ship:
    existing = db.scalar(select(Ship).where(Ship.imo_number == payload.imo_number))
    if existing:
        raise ConflictException("A ship with this IMO number already exists")

    ship = Ship(**payload.model_dump())
    db.add(ship)
    db.commit()
    db.refresh(ship)
    return ship


@router.get("/{ship_id}", response_model=ShipOut, dependencies=[Depends(get_current_user)])
def get_ship(ship_id: str, db: Session = Depends(get_db)) -> Ship:
    ship = db.get(Ship, ship_id)
    if not ship:
        raise NotFoundException("Ship not found")
    return ship


@router.put("/{ship_id}", response_model=ShipOut, dependencies=[Depends(admin_or_operator)])
def update_ship(ship_id: str, payload: ShipUpdate, db: Session = Depends(get_db)) -> Ship:
    ship = db.get(Ship, ship_id)
    if not ship:
        raise NotFoundException("Ship not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(ship, field, value)

    db.commit()
    db.refresh(ship)
    return ship


@router.delete("/{ship_id}", status_code=204, dependencies=[Depends(admin_or_operator)])
def delete_ship(ship_id: str, db: Session = Depends(get_db)) -> None:
    ship = db.get(Ship, ship_id)
    if not ship:
        raise NotFoundException("Ship not found")
    db.delete(ship)
    db.commit()
