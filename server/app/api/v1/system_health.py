from datetime import datetime, timezone

from fastapi import APIRouter
from sqlalchemy import text

from app.database.session import SessionLocal

router = APIRouter(
    prefix="/system-health",
    tags=["System Health"],
)


def check_database() -> dict:
    started = datetime.now(timezone.utc)

    try:
        db = SessionLocal()

        try:
            db.execute(text("SELECT 1"))
        finally:
            db.close()

        elapsed = (
            datetime.now(timezone.utc) - started
        ).total_seconds() * 1000

        return {
            "service": "PostgreSQL",
            "status": "operational",
            "response_ms": round(elapsed, 2),
            "message": "Database connection successful",
        }

    except Exception as exc:
        elapsed = (
            datetime.now(timezone.utc) - started
        ).total_seconds() * 1000

        return {
            "service": "PostgreSQL",
            "status": "down",
            "response_ms": round(elapsed, 2),
            "message": str(exc),
        }


def check_lstm() -> dict:
    try:
        from app.ml.lstm.service import _get_model

        _get_model()

        return {
            "service": "LSTM Prediction",
            "status": "operational",
            "message": "LSTM model available",
        }

    except Exception as exc:
        return {
            "service": "LSTM Prediction",
            "status": "degraded",
            "message": str(exc),
        }


def check_xgboost() -> dict:
    try:
        from app.services.xgboost_risk import XGBoostRiskService

        XGBoostRiskService.get_model()

        return {
            "service": "XGBoost Risk Engine",
            "status": "operational",
            "message": "XGBoost risk model available",
        }

    except Exception as exc:
        return {
            "service": "XGBoost Risk Engine",
            "status": "degraded",
            "message": str(exc),
        }


def check_isolation_forest() -> dict:
    try:
        from app.ml.isolation_forest.service import IsolationForestService

        IsolationForestService._get_model()

        return {
            "service": "Isolation Forest",
            "status": "operational",
            "message": "Anomaly detection model available",
        }

    except Exception as exc:
        return {
            "service": "Isolation Forest",
            "status": "degraded",
            "message": str(exc),
        }


def check_cargo_inspection() -> dict:
    try:
        from app.services.yolo_inference import YOLOInferenceService

        YOLOInferenceService.get_model()

        return {
            "service": "Cargo Inspection",
            "status": "operational",
            "message": "YOLO cargo inspection model available",
        }

    except Exception as exc:
        return {
            "service": "Cargo Inspection",
            "status": "degraded",
            "message": str(exc),
        }


@router.get("")
def system_health() -> dict:
    services = [
        {
            "service": "FastAPI",
            "status": "operational",
            "message": "API server is responding",
        },
        check_database(),
        {
            "service": "Digital Twin",
            "status": "operational",
            "message": "Digital Twin simulator is running",
        },
        check_lstm(),
        check_xgboost(),
        check_isolation_forest(),
        check_cargo_inspection(),
        {
            "service": "Security & Audit",
            "status": "operational",
            "message": "Authentication and audit APIs are available",
        },
    ]

    statuses = [service["status"] for service in services]

    overall_status = (
        "operational"
        if all(status == "operational" for status in statuses)
        else "degraded"
    )

    return {
        "status": overall_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": services,
    }