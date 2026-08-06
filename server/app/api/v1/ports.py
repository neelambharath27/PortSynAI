from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictException, NotFoundException
from app.core.rbac import require_role
from app.database.session import get_db
from app.dependencies import get_current_user
from app.models.enums import UserRole
from app.models.port import Port
from app.schemas.port import PortCreate, PortOut, PortUpdate

router = APIRouter(prefix="/ports", tags=["Ports"])

admin_only = require_role(UserRole.ADMINISTRATOR)


@router.get("", response_model=list[PortOut], dependencies=[Depends(get_current_user)])
def list_ports(db: Session = Depends(get_db)) -> list[Port]:
    return list(db.scalars(select(Port).order_by(Port.name)))


@router.post("", response_model=PortOut, status_code=201, dependencies=[Depends(admin_only)])
def create_port(payload: PortCreate, db: Session = Depends(get_db)) -> Port:
    existing = db.scalar(select(Port).where(Port.code == payload.code))
    if existing:
        raise ConflictException("A port with this code already exists")

    port = Port(**payload.model_dump())
    db.add(port)
    db.commit()
    db.refresh(port)
    return port


@router.get("/{port_id}", response_model=PortOut, dependencies=[Depends(get_current_user)])
def get_port(port_id: str, db: Session = Depends(get_db)) -> Port:
    port = db.get(Port, port_id)
    if not port:
        raise NotFoundException("Port not found")
    return port


@router.put("/{port_id}", response_model=PortOut, dependencies=[Depends(admin_only)])
def update_port(port_id: str, payload: PortUpdate, db: Session = Depends(get_db)) -> Port:
    port = db.get(Port, port_id)
    if not port:
        raise NotFoundException("Port not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(port, field, value)

    db.commit()
    db.refresh(port)
    return port


@router.delete("/{port_id}", status_code=204, dependencies=[Depends(admin_only)])
def delete_port(port_id: str, db: Session = Depends(get_db)) -> None:
    port = db.get(Port, port_id)
    if not port:
        raise NotFoundException("Port not found")
    db.delete(port)
    db.commit()
