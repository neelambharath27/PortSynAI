from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.database.session import get_db
from app.dependencies import get_current_user
from app.models.alert import Alert
from app.schemas.alert import AlertOut

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("", response_model=list[AlertOut], dependencies=[Depends(get_current_user)])
def list_alerts(db: Session = Depends(get_db), unread_only: bool = False) -> list[Alert]:
    stmt = select(Alert).order_by(Alert.created_at.desc())
    if unread_only:
        stmt = stmt.where(Alert.is_read.is_(False))
    return list(db.scalars(stmt))


@router.put("/{alert_id}/read", response_model=AlertOut, dependencies=[Depends(get_current_user)])
def mark_alert_read(alert_id: str, db: Session = Depends(get_db)) -> Alert:
    alert = db.get(Alert, alert_id)
    if not alert:
        raise NotFoundException("Alert not found")
    alert.is_read = True
    db.commit()
    db.refresh(alert)
    return alert
