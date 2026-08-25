from datetime import datetime, timezone

from fastapi import (
    APIRouter,
    Depends,
    File,
    Query,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.responses import FileResponse
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.core.rbac import require_role
from app.core.security import decode_token
from app.database.session import SessionLocal, get_db
from app.models.container import Container
from app.models.enums import InspectionStatus, ThreatLevel, UserRole
from app.models.inspection import Inspection
from app.models.user import User
from app.schemas.inspection import InspectionListItem, InspectionOut
from app.services.image_storage import report_disk_path, save_inspection_image
from app.services.inspection_jobs import registry, run_inspection_job
from app.services.pdf_report import build_inspection_report

router = APIRouter(prefix="/cargo-inspection", tags=["Cargo Inspection"])

can_access = require_role(UserRole.ADMINISTRATOR, UserRole.CUSTOMS_OFFICER, UserRole.SECURITY_OFFICER)


def _to_out(inspection: Inspection, inspector_name: str | None) -> InspectionOut:
    return InspectionOut(
        id=inspection.id,
        container_id=inspection.container_id,
        image_path=inspection.image_path,
        detected_objects=inspection.detected_objects or [],
        inspector_id=inspection.inspector_id,
        inspector_name=inspector_name,
        status=inspection.status,
        threat_level=inspection.threat_level,
        processing_ms=inspection.processing_ms,
        created_at=inspection.created_at,
    )


@router.post("/upload", response_model=InspectionOut, status_code=201)
async def upload_inspection(
    container_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(can_access),
) -> InspectionOut:
    container = db.get(Container, container_id)
    if not container:
        raise NotFoundException("Container not found")

    image_path = await save_inspection_image(container_id, file)

    inspection = Inspection(
        container_id=container_id,
        image_path=image_path,
        detected_objects=[],
        inspector_id=current_user.id,
        status=InspectionStatus.PENDING,
        threat_level=ThreatLevel.NONE,
        created_at=datetime.now(timezone.utc),
    )
    db.add(inspection)
    db.commit()
    db.refresh(inspection)

    # Kick off inference in the background; the client tracks progress over
    # /cargo-inspection/ws/{inspection_id} and this call returns immediately
    # with the PENDING record so the UI can show the upload succeeded.
    import asyncio

    asyncio.create_task(run_inspection_job(inspection.id))

    return _to_out(inspection, current_user.name)


@router.get("/history", response_model=list[InspectionListItem], dependencies=[Depends(can_access)])
def inspection_history(
    db: Session = Depends(get_db),
    container_id: str | None = None,
    status: InspectionStatus | None = None,
    threat_level: ThreatLevel | None = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
) -> list[dict]:
    stmt = select(Inspection).order_by(Inspection.created_at.desc())
    if container_id:
        stmt = stmt.where(Inspection.container_id == container_id)
    if status:
        stmt = stmt.where(Inspection.status == status)
    if threat_level:
        stmt = stmt.where(Inspection.threat_level == threat_level)
    stmt = stmt.offset(offset).limit(limit)
    inspections = list(db.scalars(stmt))

    container_ids = {i.container_id for i in inspections}
    inspector_ids = {i.inspector_id for i in inspections if i.inspector_id}
    containers = {
        c.id: c for c in db.scalars(select(Container).where(Container.id.in_(container_ids)))
    } if container_ids else {}
    inspectors = {
        u.id: u for u in db.scalars(select(User).where(User.id.in_(inspector_ids)))
    } if inspector_ids else {}

    return [
        {
            "id": i.id,
            "container_id": i.container_id,
            "container_code": containers[i.container_id].container_code
            if i.container_id in containers
            else None,
            "status": i.status,
            "threat_level": i.threat_level,
            "object_count": len(i.detected_objects or []),
            "inspector_name": inspectors[i.inspector_id].name if i.inspector_id in inspectors else None,
            "created_at": i.created_at,
        }
        for i in inspections
    ]


@router.get("/stats/summary", dependencies=[Depends(can_access)])
def inspection_summary(db: Session = Depends(get_db)) -> dict:
    total = db.scalar(select(func.count(Inspection.id))) or 0
    by_threat = dict(
        db.execute(
            select(Inspection.threat_level, func.count(Inspection.id)).group_by(Inspection.threat_level)
        ).all()
    )
    by_status = dict(
        db.execute(select(Inspection.status, func.count(Inspection.id)).group_by(Inspection.status)).all()
    )
    return {
        "total_inspections": total,
        "flagged": by_status.get(InspectionStatus.FLAGGED, 0),
        "passed": by_status.get(InspectionStatus.PASSED, 0),
        "pending": by_status.get(InspectionStatus.PENDING, 0),
        "by_threat_level": {level.value: count for level, count in by_threat.items()},
    }


@router.get("/{inspection_id}", response_model=InspectionOut, dependencies=[Depends(can_access)])
def get_inspection(inspection_id: str, db: Session = Depends(get_db)) -> InspectionOut:
    inspection = db.get(Inspection, inspection_id)
    if not inspection:
        raise NotFoundException("Inspection not found")
    inspector = db.get(User, inspection.inspector_id) if inspection.inspector_id else None
    return _to_out(inspection, inspector.name if inspector else None)


@router.get("/{inspection_id}/report", dependencies=[Depends(can_access)])
def get_inspection_report(inspection_id: str, db: Session = Depends(get_db)) -> FileResponse:
    inspection = db.get(Inspection, inspection_id)
    if not inspection:
        raise NotFoundException("Inspection not found")
    container = db.get(Container, inspection.container_id)
    inspector = db.get(User, inspection.inspector_id) if inspection.inspector_id else None

    report_path = report_disk_path(inspection_id)
    if not report_path.exists():
        build_inspection_report(inspection, container, inspector, report_path)

    return FileResponse(
        path=str(report_path),
        media_type="application/pdf",
        filename=f"inspection-{container.container_code if container else inspection_id}.pdf",
    )


def _authenticate_ws_user(token: str | None) -> User | None:
    if not token:
        return None
    try:
        payload = decode_token(token)
    except ValueError:
        return None
    if payload.get("type") != "access":
        return None
    db = SessionLocal()
    try:
        return db.get(User, payload.get("sub"))
    finally:
        db.close()


@router.websocket("/ws/{inspection_id}")
async def inspection_progress_ws(
    websocket: WebSocket, inspection_id: str, token: str | None = Query(default=None)
):
    user = _authenticate_ws_user(token)
    if not user or not user.is_active:
        await websocket.close(code=4401)
        return
    if user.role not in (UserRole.ADMINISTRATOR, UserRole.CUSTOMS_OFFICER, UserRole.SECURITY_OFFICER):
        await websocket.close(code=4403)
        return

    await registry.subscribe(inspection_id, websocket)
    try:
        # If the job already finished before the client connected (e.g. a
        # slow handshake), send the current state immediately instead of
        # leaving the client waiting for a progress event that already fired.
        db = SessionLocal()
        try:
            inspection = db.get(Inspection, inspection_id)
        finally:
            db.close()

        if inspection and inspection.status != InspectionStatus.PENDING:
            from app.schemas.inspection import InspectionOut

            await websocket.send_json(
                {
                    "type": "inspection_progress",
                    "inspection_id": inspection_id,
                    "stage": "complete",
                    "progress": 100,
                    "message": f"Inspection complete — {inspection.threat_level.value} threat level",
                    "result": InspectionOut.model_validate(
                        {
                            **{c.name: getattr(inspection, c.name) for c in inspection.__table__.columns},
                            "inspector_name": None,
                        }
                    ).model_dump(mode="json"),
                }
            )

        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await registry.unsubscribe(inspection_id, websocket)
