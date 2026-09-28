from contextlib import asynccontextmanager
import asyncio
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.api.v1.digital_twin import digital_twin_websocket
from app.config import settings
from app.database.init_db import init_db
from app.services.tracking_simulator import (
    simulation_loop as tracking_simulation_loop,
)
from app.services.digital_twin_simulator import (
    simulation_loop as digital_twin_simulation_loop,
)


# ============================================================
# Storage directory
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

configured_storage = Path(getattr(settings, "STORAGE_DIR", "storage"))

if configured_storage.is_absolute():
    STORAGE_DIR = configured_storage
else:
    STORAGE_DIR = BASE_DIR / configured_storage

STORAGE_DIR = STORAGE_DIR.resolve()

# Make sure the storage directory exists before FastAPI mounts it.
STORAGE_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# Application lifespan
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables and seed demo data on startup.
    init_db()

    # Start the dummy GPS/tracking simulator.
    tracking_task = asyncio.create_task(
        tracking_simulation_loop()
    )

    # Start the Digital Twin sensor simulator.
    digital_twin_task = asyncio.create_task(
        digital_twin_simulation_loop()
    )

    yield

    # Stop background tasks on shutdown.
    tracking_task.cancel()
    digital_twin_task.cancel()


# ============================================================
# FastAPI application
# ============================================================

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "Backend API for the Hybrid AI Framework for Smart Port "
        "Container Tracking, Anomaly Detection and Secure Cargo "
        "Clearance Using Digital Twin and Explainable AI."
    ),
    version="1.0.0",
    lifespan=lifespan,
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# Static file storage
# ============================================================
#
# Uploaded X-ray files are stored like:
#
# server/storage/inspections/<container_id>/<filename>.png
#
# They are exposed through:
#
# http://127.0.0.1:8000/storage/inspections/...
#

app.mount(
    "/storage",
    StaticFiles(directory=str(STORAGE_DIR)),
    name="storage",
)


# ============================================================
# API routes
# ============================================================

app.include_router(
    api_router,
    prefix=settings.API_V1_PREFIX,
)


# ============================================================
# Digital Twin WebSocket
# ============================================================

app.add_api_websocket_route(
    "/ws/digital-twin/{container_id}",
    digital_twin_websocket,
)


# ============================================================
# Health / root
# ============================================================

@app.get("/", tags=["Health"])
def root() -> dict:
    return {
        "service": settings.PROJECT_NAME,
        "status": "online",
    }


@app.get("/health", tags=["Health"])
def health() -> dict:
    return {
        "status": "ok",
    }