from fastapi import APIRouter

from app.api.v1 import (
    auth,
    users,
    ports,
    ships,
    containers,
    alerts,
    admin,
    tracking,
    dashboard,
    digital_twin,
    cargo_inspection,
    risk_assessment,
    prediction,
)


api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(ports.router)
api_router.include_router(ships.router)
api_router.include_router(containers.router)
api_router.include_router(tracking.router)
api_router.include_router(dashboard.router)
api_router.include_router(alerts.router)
api_router.include_router(admin.router)
api_router.include_router(digital_twin.router)
api_router.include_router(cargo_inspection.router)
api_router.include_router(risk_assessment.router)
api_router.include_router(prediction.router)