from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.blockchain.service import BlockchainService
from app.core.rbac import require_role
from app.database.session import get_db
from app.dependencies import get_current_user
from app.models.audit_log import AuditLog
from app.models.clearance import Clearance
from app.models.container import Container
from app.models.enums import (
    ClearanceDecision,
    ClearanceStatus,
    InspectionStatus,
    UserRole,
)
from app.models.inspection import Inspection
from app.models.risk_score import RiskScore
from app.models.user import User
from app.schemas.clearance import ClearanceDecisionOut
from app.services.clearance_decision import ClearanceDecisionService


router = APIRouter(
    prefix="/clearance-decision",
    tags=["Clearance Decision"],
)


can_access = require_role(
    UserRole.ADMINISTRATOR,
    UserRole.CUSTOMS_OFFICER,
)


def _latest_inspection(
    db: Session,
    container_id: str,
) -> Inspection | None:
    return db.scalar(
        select(Inspection)
        .where(Inspection.container_id == container_id)
        .order_by(Inspection.created_at.desc())
    )


# ============================================================
# GET CURRENT AI CLEARANCE DECISION
# ============================================================

@router.get(
    "/{container_id}",
    response_model=ClearanceDecisionOut,
    dependencies=[Depends(get_current_user)],
)
def get_clearance_decision(
    container_id: str,
    db: Session = Depends(get_db),
) -> ClearanceDecisionOut:

    container = db.scalar(
        select(Container).where(Container.id == container_id)
    )

    if not container:
        raise HTTPException(
            status_code=404,
            detail="Container not found",
        )

    risk_score = db.scalar(
        select(RiskScore)
        .where(RiskScore.container_id == container_id)
        .order_by(RiskScore.computed_at.desc())
    )

    if not risk_score:
        raise HTTPException(
            status_code=404,
            detail="No risk assessment found for this container",
        )

    result = ClearanceDecisionService.decide(
        final_score=risk_score.final_score,
        risk_level=risk_score.risk_level,
    )

    return ClearanceDecisionOut(
        container_id=container.id,
        container_code=container.container_code,
        risk_score=result.risk_score,
        risk_level=result.risk_level,
        decision=result.decision,
        reason=result.reason,
    )


# ============================================================
# CREATE PENDING CLEARANCE DECISION
# ============================================================

@router.post(
    "/{container_id}/create",
    response_model=ClearanceDecisionOut,
    dependencies=[Depends(can_access)],
    status_code=201,
)
def create_clearance_decision(
    container_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClearanceDecisionOut:

    container = db.scalar(
        select(Container).where(Container.id == container_id)
    )

    if not container:
        raise HTTPException(
            status_code=404,
            detail="Container not found",
        )

    risk_score = db.scalar(
        select(RiskScore)
        .where(RiskScore.container_id == container_id)
        .order_by(RiskScore.computed_at.desc())
    )

    if not risk_score:
        raise HTTPException(
            status_code=404,
            detail="No risk assessment found for this container",
        )

    result = ClearanceDecisionService.decide(
        final_score=risk_score.final_score,
        risk_level=risk_score.risk_level,
    )

        # --------------------------------------------------------
    # PREVENT DUPLICATE ACTIVE CLEARANCE DECISIONS
    # --------------------------------------------------------
    # Reuse the latest pending clearance instead of creating
    # another active record for the same container.
    # --------------------------------------------------------

    existing_clearance = db.scalar(
        select(Clearance)
        .where(
            Clearance.container_id == container_id,
            Clearance.status == ClearanceStatus.PENDING,
        )
        .order_by(Clearance.timestamp.desc())
    )

    if existing_clearance:
        return ClearanceDecisionOut(
            container_id=container.id,
            container_code=container.container_code,
            risk_score=result.risk_score,
            risk_level=result.risk_level,
            decision=existing_clearance.decision,
            reason=(
                "An active pending clearance decision already exists "
                "for this container."
            ),
        )

    clearance = Clearance(
        container_id=container.id,
        risk_score_id=risk_score.id,
        officer_id=current_user.id,
        decision=result.decision,
        status=ClearanceStatus.PENDING,
    )

    db.add(clearance)
    db.flush()

    audit = AuditLog(
        user_id=current_user.id,
        action="CLEARANCE_DECISION_CREATED",
        entity_type="clearance",
        entity_id=clearance.id,
        log_metadata={
            "container_id": container.id,
            "container_code": container.container_code,
            "risk_score": result.risk_score,
            "risk_level": result.risk_level.value,
            "decision": result.decision.value,
            "status": ClearanceStatus.PENDING.value,
        },
    )

    db.add(audit)
    db.commit()
    db.refresh(clearance)

    return ClearanceDecisionOut(
        container_id=container.id,
        container_code=container.container_code,
        risk_score=result.risk_score,
        risk_level=result.risk_level,
        decision=result.decision,
        reason=result.reason,
    )


# ============================================================
# CUSTOMS OFFICER APPROVES CLEARANCE
# ============================================================

@router.post(
    "/{container_id}/approve",
    response_model=ClearanceDecisionOut,
    dependencies=[Depends(can_access)],
)
def approve_clearance(
    container_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClearanceDecisionOut:

    container = db.scalar(
        select(Container).where(Container.id == container_id)
    )

    if not container:
        raise HTTPException(
            status_code=404,
            detail="Container not found",
        )

    clearance = db.scalar(
        select(Clearance)
        .where(Clearance.container_id == container_id)
        .order_by(Clearance.timestamp.desc())
    )

    if not clearance:
        raise HTTPException(
            status_code=404,
            detail="No clearance decision found for this container",
        )

    if clearance.status != ClearanceStatus.PENDING:
        raise HTTPException(
            status_code=400,
            detail=f"Clearance is already {clearance.status.value}",
        )

    risk_score = db.scalar(
        select(RiskScore).where(
            RiskScore.id == clearance.risk_score_id
        )
    )

    if not risk_score:
        raise HTTPException(
            status_code=404,
            detail="Linked risk assessment not found",
        )

    # --------------------------------------------------------
    # HOLD GATE
    # --------------------------------------------------------
    # High-risk HOLD decisions cannot be approved through the
    # normal clearance approval endpoint.
    # --------------------------------------------------------

    if clearance.decision == ClearanceDecision.HOLD:
        raise HTTPException(
            status_code=400,
            detail=(
                "Clearance is on HOLD due to high risk "
                "and cannot be approved through this endpoint."
            ),
        )

    # --------------------------------------------------------
    # INSPECT GATE
    # --------------------------------------------------------

    if clearance.decision == ClearanceDecision.INSPECT:

        inspection = _latest_inspection(
            db,
            container_id,
        )

        if inspection is None:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Inspection required before clearance approval. "
                    "No cargo inspection exists for this container."
                ),
            )

        if inspection.status == InspectionStatus.PENDING:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Cargo inspection is still pending. "
                    "Wait for the inspection result before approval."
                ),
            )

        if inspection.status == InspectionStatus.FLAGGED:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Cargo inspection flagged this container. "
                    "Clearance approval is blocked pending officer review."
                ),
            )

        if inspection.status != InspectionStatus.PASSED:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Inspection status '{inspection.status.value}' "
                    "does not permit clearance approval."
                ),
            )

    # --------------------------------------------------------
    # 1. Update clearance status
    # --------------------------------------------------------

    clearance.status = ClearanceStatus.APPROVED
    clearance.officer_id = current_user.id

    # --------------------------------------------------------
    # 2. Record approval in blockchain prototype
    # --------------------------------------------------------

    blockchain_result = BlockchainService.record_clearance(
        clearance_id=clearance.id,
        container_id=container.id,
        container_code=container.container_code,
        risk_score=float(risk_score.final_score),
        risk_level=risk_score.risk_level.value,
        decision=clearance.decision.value,
        status=ClearanceStatus.APPROVED.value,
        officer_id=current_user.id,
        timestamp=clearance.timestamp,
    )

    clearance.transaction_id = blockchain_result["transaction_id"]
    clearance.blockchain_hash = blockchain_result["blockchain_hash"]

    # --------------------------------------------------------
    # 3. Create audit log
    # --------------------------------------------------------

    audit_metadata = {
        "container_id": container.id,
        "container_code": container.container_code,
        "risk_score": float(risk_score.final_score),
        "risk_level": risk_score.risk_level.value,
        "decision": clearance.decision.value,
        "status": ClearanceStatus.APPROVED.value,
        "transaction_id": clearance.transaction_id,
        "blockchain_hash": clearance.blockchain_hash,
    }

    # Include inspection evidence when INSPECT was required.
    if clearance.decision == ClearanceDecision.INSPECT:

        inspection = _latest_inspection(
            db,
            container_id,
        )

        if inspection:
            audit_metadata["inspection_id"] = inspection.id
            audit_metadata["inspection_status"] = (
                inspection.status.value
            )
            audit_metadata["inspection_threat_level"] = (
                inspection.threat_level.value
            )
            audit_metadata["inspection_object_count"] = len(
                inspection.detected_objects or []
            )

    audit = AuditLog(
        user_id=current_user.id,
        action="CLEARANCE_APPROVED",
        entity_type="clearance",
        entity_id=clearance.id,
        log_metadata=audit_metadata,
    )

    db.add(audit)

    # --------------------------------------------------------
    # 4. Commit clearance + blockchain + audit
    # --------------------------------------------------------

    db.commit()
    db.refresh(clearance)

    return ClearanceDecisionOut(
        container_id=container.id,
        container_code=container.container_code,
        risk_score=float(risk_score.final_score),
        risk_level=risk_score.risk_level,
        decision=clearance.decision,
        reason=(
            "Clearance approved by customs officer. "
            f"AI recommendation: {clearance.decision.value.upper()}. "
            "Blockchain audit record created."
        ),
    )


# ============================================================
# CUSTOMS OFFICER REJECTS CLEARANCE
# ============================================================

@router.post(
    "/{container_id}/reject",
    response_model=ClearanceDecisionOut,
    dependencies=[Depends(can_access)],
)
def reject_clearance(
    container_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClearanceDecisionOut:

    container = db.scalar(
        select(Container).where(Container.id == container_id)
    )

    if not container:
        raise HTTPException(
            status_code=404,
            detail="Container not found",
        )

    clearance = db.scalar(
        select(Clearance)
        .where(Clearance.container_id == container_id)
        .order_by(Clearance.timestamp.desc())
    )

    if not clearance:
        raise HTTPException(
            status_code=404,
            detail="No clearance decision found for this container",
        )

    if clearance.status != ClearanceStatus.PENDING:
        raise HTTPException(
            status_code=400,
            detail=f"Clearance is already {clearance.status.value}",
        )

    risk_score = db.scalar(
        select(RiskScore).where(
            RiskScore.id == clearance.risk_score_id
        )
    )

    if not risk_score:
        raise HTTPException(
            status_code=404,
            detail="Linked risk assessment not found",
        )

    clearance.status = ClearanceStatus.REJECTED
    clearance.officer_id = current_user.id

    audit = AuditLog(
        user_id=current_user.id,
        action="CLEARANCE_REJECTED",
        entity_type="clearance",
        entity_id=clearance.id,
        log_metadata={
            "container_id": container.id,
            "container_code": container.container_code,
            "risk_score": float(risk_score.final_score),
            "risk_level": risk_score.risk_level.value,
            "decision": clearance.decision.value,
            "status": ClearanceStatus.REJECTED.value,
        },
    )

    db.add(audit)
    db.commit()
    db.refresh(clearance)

    return ClearanceDecisionOut(
        container_id=container.id,
        container_code=container.container_code,
        risk_score=float(risk_score.final_score),
        risk_level=risk_score.risk_level,
        decision=clearance.decision,
        reason=(
            "Clearance rejected by customs officer. "
            f"AI recommendation: {clearance.decision.value.upper()}."
        ),
    )

# ============================================================
# GET BLOCKCHAIN CLEARANCE RECORD
# ============================================================

@router.get(
    "/{container_id}/record",
    dependencies=[Depends(get_current_user)],
)
def get_clearance_record(
    container_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    container = db.scalar(
        select(Container).where(Container.id == container_id)
    )

    if not container:
        raise HTTPException(
            status_code=404,
            detail="Container not found",
        )

    clearance = db.scalar(
        select(Clearance)
        .where(Clearance.container_id == container_id)
        .order_by(Clearance.timestamp.desc())
    )

    if not clearance:
        raise HTTPException(
            status_code=404,
            detail="No clearance record found for this container",
        )

    risk_score = db.scalar(
        select(RiskScore)
        .where(RiskScore.id == clearance.risk_score_id)
    )

    if not risk_score:
        raise HTTPException(
            status_code=404,
            detail="Linked risk assessment not found",
        )

    audit = db.scalar(
        select(AuditLog)
        .where(
            AuditLog.entity_type == "clearance",
            AuditLog.entity_id == clearance.id,
        )
        .order_by(AuditLog.created_at.desc())
    )

    return {
        "container_id": container.id,
        "container_code": container.container_code,
        "risk_score": float(risk_score.final_score),
        "risk_level": risk_score.risk_level.value,
        "decision": clearance.decision.value,
        "reason": (
            f"Risk score {float(risk_score.final_score):.1f} "
            f"maps to {clearance.decision.value.upper()}."
        ),
        "status": clearance.status.value,
        "transaction_id": clearance.transaction_id,
        "blockchain_hash": clearance.blockchain_hash,
        "officer_id": clearance.officer_id,
        "timestamp": clearance.timestamp,
        "audit_action": audit.action if audit else None,
        "audit_timestamp": audit.created_at if audit else None,
    }