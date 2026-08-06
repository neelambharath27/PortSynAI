from fastapi import APIRouter

from app.api.v1 import auth, users, ports, ships, containers, alerts, admin, tracking, dashboard

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
