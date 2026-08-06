import random
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.dependencies import get_current_user
from app.models.alert import Alert
from app.models.clearance import Clearance
from app.models.container import Container
from app.models.enums import ClearanceStatus, ContainerStatus, InspectionStatus, RiskLevel
from app.models.inspection import Inspection
from app.models.risk_score import RiskScore
from app.models.ship import Ship
from app.schemas.dashboard import DashboardSummary

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _counts(db: Session) -> dict:
    by_status = dict(
        db.execute(
            select(Container.status, func.count(Container.id)).group_by(Container.status)
        ).all()
    )
    total = sum(by_status.values())

    inspection_pending = db.scalar(
        select(func.count(Inspection.id)).where(Inspection.status == InspectionStatus.PENDING)
    ) or 0

    today = datetime.now(timezone.utc).date()
    today_shipments = db.scalar(
        select(func.count(Ship.id)).where(func.date(Ship.eta) == today)
    ) or 0

    return {
        "total_containers": total,
        "moving": by_status.get(ContainerStatus.MOVING, 0),
        "delayed": by_status.get(ContainerStatus.DELAYED, 0),
        "high_risk": by_status.get(ContainerStatus.HIGH_RISK, 0),
        "cleared": by_status.get(ContainerStatus.CLEARED, 0),
        "inspection_pending": inspection_pending,
        "today_shipments": today_shipments,
    }


def _container_traffic(total_containers: int) -> list[dict]:
    """Last 7 days of container throughput.

    There's no historical time-series table backing this yet (that arrives
    with the reporting phase), so this is a deterministic, date-seeded
    simulation scaled to the current fleet size — consistent across repeated
    calls on the same day rather than randomly jumping around on refresh.
    """
    baseline = max(total_containers, 20)
    points = []
    today = datetime.now(timezone.utc).date()
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        rnd = random.Random(day.toordinal())
        value = int(baseline * rnd.uniform(0.55, 0.95))
        points.append({"label": day.strftime("%a"), "value": value})
    return points


def _monthly_report(total_containers: int) -> list[dict]:
    baseline = max(total_containers, 20) * 4.3  # rough weeks-per-month scale
    points = []
    today = datetime.now(timezone.utc).date()
    for i in range(5, -1, -1):
        year = today.year
        month = today.month - i
        while month <= 0:
            month += 12
            year -= 1
        rnd = random.Random(year * 100 + month)
        value = int(baseline * rnd.uniform(0.7, 1.15))
        label = datetime(year, month, 1).strftime("%b")
        points.append({"label": label, "value": value})
    return points


def _clearance_distribution(db: Session) -> dict:
    rows = dict(
        db.execute(
            select(Clearance.status, func.count(Clearance.id)).group_by(Clearance.status)
        ).all()
    )
    return {
        "approved": rows.get(ClearanceStatus.APPROVED, 0),
        "pending": rows.get(ClearanceStatus.PENDING, 0),
        "rejected": rows.get(ClearanceStatus.REJECTED, 0),
    }


def _risk_distribution(db: Session) -> dict:
    rows = dict(
        db.execute(
            select(RiskScore.risk_level, func.count(RiskScore.id)).group_by(RiskScore.risk_level)
        ).all()
    )
    return {
        "low": rows.get(RiskLevel.LOW, 0),
        "medium": rows.get(RiskLevel.MEDIUM, 0),
        "high": rows.get(RiskLevel.HIGH, 0),
    }


def _recent_alerts(db: Session) -> list[dict]:
    alerts = list(db.scalars(select(Alert).order_by(Alert.created_at.desc()).limit(5)))
    return [
        {
            "id": a.id,
            "type": a.type,
            "severity": a.severity.value,
            "message": a.message,
            "is_read": a.is_read,
            "created_at": a.created_at,
        }
        for a in alerts
    ]


def _recent_activity(db: Session) -> list[dict]:
    items: list[dict] = []

    clearances = db.scalars(
        select(Clearance).order_by(Clearance.timestamp.desc()).limit(6)
    )
    for c in clearances:
        container = db.get(Container, c.container_id)
        code = container.container_code if container else c.container_id[:8]
        verb = {
            ClearanceStatus.APPROVED: "Clearance approved for",
            ClearanceStatus.REJECTED: "Clearance rejected for",
            ClearanceStatus.PENDING: "Clearance submitted for",
        }[c.status]
        items.append(
            {
                "id": f"clearance-{c.id}",
                "message": f"{verb} {code}",
                "category": "blockchain",
                "timestamp": c.timestamp,
            }
        )

    inspections = db.scalars(
        select(Inspection).order_by(Inspection.created_at.desc()).limit(6)
    )
    for insp in inspections:
        container = db.get(Container, insp.container_id)
        code = container.container_code if container else insp.container_id[:8]
        verb = {
            InspectionStatus.PASSED: "Inspection passed for",
            InspectionStatus.FLAGGED: "Inspection flagged issues in",
            InspectionStatus.PENDING: "Inspection queued for",
        }[insp.status]
        items.append(
            {
                "id": f"inspection-{insp.id}",
                "message": f"{verb} {code}",
                "category": "inspection",
                "timestamp": insp.created_at,
            }
        )

    risk_scores = db.scalars(
        select(RiskScore).order_by(RiskScore.computed_at.desc()).limit(6)
    )
    for rs in risk_scores:
        container = db.get(Container, rs.container_id)
        code = container.container_code if container else rs.container_id[:8]
        items.append(
            {
                "id": f"risk-{rs.id}",
                "message": f"Risk score computed for {code} — {rs.risk_level.value.upper()} ({rs.final_score})",
                "category": "risk",
                "timestamp": rs.computed_at,
            }
        )

    items.sort(key=lambda x: x["timestamp"], reverse=True)
    return items[:8]


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
) -> dict:
    counts = _counts(db)
    return {
        "counts": counts,
        "container_traffic": _container_traffic(counts["total_containers"]),
        "monthly_report": _monthly_report(counts["total_containers"]),
        "clearance_distribution": _clearance_distribution(db),
        "risk_distribution": _risk_distribution(db),
        "recent_alerts": _recent_alerts(db),
        "recent_activity": _recent_activity(db),
    }
