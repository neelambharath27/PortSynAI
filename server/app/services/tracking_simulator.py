"""
Dummy GPS API / live tracking simulator.

Since real port GPS/AIS feeds aren't available for this project, this module
simulates one: on a fixed interval it nudges every "moving" container a
small step toward its destination port along a great-circle bearing, jitters
its speed/heading slightly for realism, periodically records a waypoint into
that container's route history, and broadcasts a live snapshot of every
container to any connected WebSocket client.

This is intentionally written with plain synchronous SQLAlchemy calls inside
a worker thread for simplicity. A production system would move this to a
proper async worker / message queue.
"""

import asyncio
import json
import math
import random
from datetime import datetime, timedelta, timezone

from fastapi import WebSocket
from sqlalchemy import select

from app.database.session import SessionLocal
from app.models.container import Container
from app.models.enums import ContainerStatus
from app.models.port import Port
from app.models.route import Route
from app.models.ship import Ship


TICK_SECONDS = 3.0
EARTH_RADIUS_KM = 6371.0
ARRIVAL_THRESHOLD_KM = 15.0
MAX_WAYPOINTS_PER_CONTAINER = 60

# Compress simulation time so the demo remains visually active.
SIMULATION_ACCELERATION = 60


def haversine_km(
    lat1: float,
    lng1: float,
    lat2: float,
    lng2: float,
) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)

    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1)
        * math.cos(phi2)
        * math.sin(d_lambda / 2) ** 2
    )

    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a))


def bearing_deg(
    lat1: float,
    lng1: float,
    lat2: float,
    lng2: float,
) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_lambda = math.radians(lng2 - lng1)

    x = math.sin(d_lambda) * math.cos(phi2)

    y = (
        math.cos(phi1) * math.sin(phi2)
        - math.sin(phi1)
        * math.cos(phi2)
        * math.cos(d_lambda)
    )

    return (math.degrees(math.atan2(x, y)) + 360) % 360


def step_toward(
    lat: float,
    lng: float,
    target_lat: float,
    target_lng: float,
    step_km: float,
):
    """Move a point toward its destination by step_km."""

    distance = haversine_km(
        lat,
        lng,
        target_lat,
        target_lng,
    )

    heading = bearing_deg(
        lat,
        lng,
        target_lat,
        target_lng,
    )

    if distance <= step_km:
        return target_lat, target_lng, heading

    fraction = step_km / distance

    new_lat = lat + (target_lat - lat) * fraction
    new_lng = lng + (target_lng - lng) * fraction

    return new_lat, new_lng, heading


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()

        async with self._lock:
            self._connections.add(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self._connections.discard(websocket)

    async def broadcast(self, payload: dict) -> None:
        message = json.dumps(
            payload,
            default=str,
        )

        dead: list[WebSocket] = []

        async with self._lock:
            targets = list(self._connections)

        for connection in targets:
            try:
                await connection.send_text(message)
            except Exception:
                dead.append(connection)

        if dead:
            async with self._lock:
                for connection in dead:
                    self._connections.discard(connection)

    @property
    def active_count(self) -> int:
        return len(self._connections)


manager = ConnectionManager()

_tick_counter = 0

# Cached snapshot used by REST and WebSocket clients.
_latest_snapshot: dict | None = None


def _advance_container(
    db,
    container: Container,
    ports_by_id: dict[str, Port],
) -> None:
    destination = ports_by_id.get(
        container.destination_port_id
    )

    if not destination:
        return

    distance_remaining = haversine_km(
        container.current_lat,
        container.current_lng,
        destination.latitude,
        destination.longitude,
    )

    if distance_remaining <= ARRIVAL_THRESHOLD_KM:
        # Arrived at destination.
        # Immediately assign another port so the demo continues moving.
        container.status = ContainerStatus.CLEARED

        container.origin_port_id = (
            container.destination_port_id
        )

        other_ports = [
            port
            for port in ports_by_id.values()
            if port.id != container.origin_port_id
        ]

        if other_ports:
            next_port = random.choice(other_ports)

            container.destination_port_id = next_port.id
            container.status = ContainerStatus.MOVING

        return

    # Convert knots to km/h.
    speed_kmh = max(container.speed, 8.0) * 1.852

    # Accelerate the demo simulation.
    step_km = (
        speed_kmh
        / 3600
        * TICK_SECONDS
        * SIMULATION_ACCELERATION
    )

    new_lat, new_lng, heading = step_toward(
        container.current_lat,
        container.current_lng,
        destination.latitude,
        destination.longitude,
        step_km,
    )

    container.current_lat = new_lat
    container.current_lng = new_lng
    container.heading = round(heading, 1)

    container.speed = round(
        max(
            4.0,
            min(
                28.0,
                container.speed
                + random.uniform(-0.8, 0.8),
            ),
        ),
        1,
    )


def _record_waypoint(
    db,
    container: Container,
    ports_by_id: dict[str, Port],
) -> None:
    route = db.scalar(
        select(Route).where(
            Route.container_id == container.id
        )
    )

    if route is None:
        route = Route(
            container_id=container.id,
            waypoints=[],
            predicted_route=[],
        )
        db.add(route)

    waypoints = list(route.waypoints or [])

    waypoints.append(
        {
            "lat": container.current_lat,
            "lng": container.current_lng,
            "timestamp": datetime.now(
                timezone.utc
            ).isoformat(),
        }
    )

    route.waypoints = waypoints[
        -MAX_WAYPOINTS_PER_CONTAINER:
    ]

    route.delay_probability = round(
        random.uniform(0.02, 0.35),
        2,
    )

    destination = ports_by_id.get(
        container.destination_port_id
    )

    if destination:
        distance_remaining = haversine_km(
            container.current_lat,
            container.current_lng,
            destination.latitude,
            destination.longitude,
        )

        speed_kmh = (
            max(container.speed, 6.0)
            * 1.852
            * SIMULATION_ACCELERATION
        )

        hours_remaining = (
            distance_remaining / speed_kmh
            if speed_kmh
            else 0
        )

        route.eta_predicted = (
            datetime.now(timezone.utc)
            + timedelta(hours=hours_remaining)
        )


def build_snapshot(db) -> dict:
    containers = list(
        db.scalars(
            select(Container)
        )
    )

    ports = {
        port.id: port
        for port in db.scalars(
            select(Port)
        )
    }

    ships = {
        ship.id: ship
        for ship in db.scalars(
            select(Ship)
        )
    }

    items = []

    for container in containers:
        destination = ports.get(
            container.destination_port_id
        )

        origin = ports.get(
            container.origin_port_id
        )

        ship = ships.get(
            container.ship_id
        )

        distance_remaining = None
        eta = None

        if (
            destination
            and container.status
            == ContainerStatus.MOVING
        ):
            distance_remaining = round(
                haversine_km(
                    container.current_lat,
                    container.current_lng,
                    destination.latitude,
                    destination.longitude,
                ),
                1,
            )

            speed_kmh = (
                max(container.speed, 6.0)
                * 1.852
                * SIMULATION_ACCELERATION
            )

            hours_remaining = (
                distance_remaining / speed_kmh
                if speed_kmh
                else 0
            )

            eta = (
                datetime.now(timezone.utc)
                + timedelta(
                    hours=hours_remaining
                )
            )

        items.append(
            {
                "id": container.id,
                "container_code": container.container_code,
                "status": container.status.value,
                "cargo_type": container.cargo_type,
                "lat": round(
                    container.current_lat,
                    5,
                ),
                "lng": round(
                    container.current_lng,
                    5,
                ),
                "speed": container.speed,
                "heading": container.heading,
                "origin_port": (
                    origin.name
                    if origin
                    else None
                ),
                "destination_port": (
                    destination.name
                    if destination
                    else None
                ),
                "ship_name": (
                    ship.name
                    if ship
                    else None
                ),
                "eta": eta,
                "distance_remaining_km": (
                    distance_remaining
                ),
                "updated_at": container.updated_at,
            }
        )

    return {
        "type": "tracking_snapshot",
        "server_time": datetime.now(
            timezone.utc
        ),
        "containers": items,
    }


def _tick_once() -> dict:
    global _tick_counter
    global _latest_snapshot

    _tick_counter += 1

    db = SessionLocal()

    try:
        ports_by_id = {
            port.id: port
            for port in db.scalars(
                select(Port)
            )
        }

        moving = list(
            db.scalars(
                select(Container).where(
                    Container.status
                    == ContainerStatus.MOVING
                )
            )
        )

        for container in moving:
            _advance_container(
                db,
                container,
                ports_by_id,
            )

            # Record a waypoint every third tick.
            if _tick_counter % 3 == 0:
                _record_waypoint(
                    db,
                    container,
                    ports_by_id,
                )

        db.commit()

        # Build the snapshot once and cache it.
        snapshot = build_snapshot(db)

        _latest_snapshot = snapshot

        return snapshot

    finally:
        db.close()


async def simulation_loop() -> None:
    """
    Continuously update the tracking simulation.

    Database work runs in a worker thread so that the async
    event loop remains responsive.
    """

    while True:
        try:
            snapshot = await asyncio.to_thread(
                _tick_once
            )

            if manager.active_count > 0:
                await manager.broadcast(
                    snapshot
                )

        except Exception as exc:
            print(
                f"[tracking_simulator] tick failed: {exc}"
            )

        await asyncio.sleep(
            TICK_SECONDS
        )


def get_current_snapshot() -> dict | None:
    """
    Return the latest cached tracking snapshot.

    REST and WebSocket endpoints use this instead of
    rebuilding the complete snapshot on every request.
    """

    return _latest_snapshot