from contextlib import asynccontextmanager
import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables and seed demo data on startup.
    init_db()

    # Start the dummy GPS/tracking simulator.
    tracking_task = asyncio.create_task(tracking_simulation_loop())

    # Start the Digital Twin sensor simulator.
    digital_twin_task = asyncio.create_task(digital_twin_simulation_loop())

    yield

    tracking_task.cancel()
    digital_twin_task.cancel()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "Backend API for the Hybrid AI Framework for Smart Port Container "
        "Tracking, Anomaly Detection and Secure Cargo Clearance Using "
        "Digital Twin and Explainable AI."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)

app.add_api_websocket_route(
    "/ws/digital-twin/{container_id}",
    digital_twin_websocket,
)


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