from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.rbac import require_role
from app.database.session import get_db
from app.models.audit_log import AuditLog
from app.models.enums import UserRole

router = APIRouter(prefix="/admin", tags=["Admin"])

admin_only = require_role(UserRole.ADMINISTRATOR)


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str | None
    action: str
    entity_type: str
    entity_id: str | None
    log_metadata: dict
    created_at: object


@router.get("/system-logs", response_model=list[AuditLogOut], dependencies=[Depends(admin_only)])
def list_system_logs(db: Session = Depends(get_db), limit: int = 100) -> list[AuditLog]:
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
    return list(db.scalars(stmt))
