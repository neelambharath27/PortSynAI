from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictException, NotFoundException
from app.core.rbac import require_role
from app.database.session import get_db
from app.dependencies import get_current_user
from app.models.container import Container
from app.models.enums import ContainerStatus, UserRole
from app.schemas.container import ContainerCreate, ContainerOut, ContainerUpdate

router = APIRouter(prefix="/containers", tags=["Containers"])

can_write = require_role(UserRole.ADMINISTRATOR, UserRole.PORT_OPERATOR)


@router.get("", response_model=list[ContainerOut], dependencies=[Depends(get_current_user)])
def list_containers(
    db: Session = Depends(get_db),
    status: ContainerStatus | None = None,
    search: str | None = Query(default=None, description="Match against container code"),
    limit: int = Query(default=50, le=200),
    offset: int = 0,
) -> list[Container]:
    stmt = select(Container)
    if status:
        stmt = stmt.where(Container.status == status)
    if search:
        stmt = stmt.where(Container.container_code.ilike(f"%{search}%"))
    stmt = stmt.order_by(Container.updated_at.desc()).offset(offset).limit(limit)
    return list(db.scalars(stmt))


@router.get("/stats/summary", dependencies=[Depends(get_current_user)])
def container_summary(db: Session = Depends(get_db)) -> dict:
    total = db.scalar(select(func.count(Container.id))) or 0
    by_status = dict(
        db.execute(
            select(Container.status, func.count(Container.id)).group_by(Container.status)
        ).all()
    )
    return {
        "total_containers": total,
        "moving": by_status.get(ContainerStatus.MOVING, 0),
        "delayed": by_status.get(ContainerStatus.DELAYED, 0),
        "high_risk": by_status.get(ContainerStatus.HIGH_RISK, 0),
        "cleared": by_status.get(ContainerStatus.CLEARED, 0),
        "idle": by_status.get(ContainerStatus.IDLE, 0),
    }


@router.post("", response_model=ContainerOut, status_code=201, dependencies=[Depends(can_write)])
def create_container(payload: ContainerCreate, db: Session = Depends(get_db)) -> Container:
    existing = db.scalar(
        select(Container).where(Container.container_code == payload.container_code)
    )
    if existing:
        raise ConflictException("A container with this code already exists")

    container = Container(**payload.model_dump())
    db.add(container)
    db.commit()
    db.refresh(container)
    return container


@router.get("/{container_id}", response_model=ContainerOut, dependencies=[Depends(get_current_user)])
def get_container(container_id: str, db: Session = Depends(get_db)) -> Container:
    container = db.get(Container, container_id)
    if not container:
        raise NotFoundException("Container not found")
    return container


@router.put("/{container_id}", response_model=ContainerOut, dependencies=[Depends(can_write)])
def update_container(
    container_id: str, payload: ContainerUpdate, db: Session = Depends(get_db)
) -> Container:
    container = db.get(Container, container_id)
    if not container:
        raise NotFoundException("Container not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(container, field, value)

    db.commit()
    db.refresh(container)
    return container


@router.delete("/{container_id}", status_code=204, dependencies=[Depends(can_write)])
def delete_container(container_id: str, db: Session = Depends(get_db)) -> None:
    container = db.get(Container, container_id)
    if not container:
        raise NotFoundException("Container not found")
    db.delete(container)
    db.commit()
