"""Digital Twin telemetry simulator.

Real IoT sensor feeds are not available for this project, so this module
simulates sensor readings for every container.

The simulator:
- Generates temperature, humidity and battery telemetry.
- Simulates door, movement and GPS status.
- Calculates container health.
- Provides current GPS coordinates.
- Calculates remaining distance to the destination port.
- Calculates an estimated arrival time (ETA).
- Broadcasts Digital Twin snapshots to connected WebSocket clients.
"""

import asyncio
import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.database.session import SessionLocal
from app.models.container import Container
from app.models.enums import ContainerStatus, DoorStatus, MovementStatus
from app.models.port import Port
from app.models.sensor_reading import SensorReading
from app.models.ship import Ship
from app.services.tracking_simulator import (
    ConnectionManager,
    SIMULATION_ACCELERATION,
    haversine_km,
)


# ---------------------------------------------------------------------------
# Simulator configuration
# ---------------------------------------------------------------------------

TICK_SECONDS = 5.0
MAX_HISTORY_HOURS_DEFAULT = 24
MAX_HISTORY_POINTS = 500


# ---------------------------------------------------------------------------
# Temperature limits by cargo type
# ---------------------------------------------------------------------------

TEMPERATURE_BANDS: dict[str, tuple[float, float, float, float]] = {
    "Perishables": (2.0, 8.0, -1.0, 12.0),
    "Chemicals": (5.0, 25.0, 0.0, 35.0),
    "Electronics": (5.0, 30.0, -5.0, 40.0),
    "general": (-10.0, 40.0, -20.0, 50.0),
}


# ---------------------------------------------------------------------------
# Humidity limits by cargo type
# ---------------------------------------------------------------------------

HUMIDITY_CEILING: dict[str, tuple[float, float]] = {
    "Electronics": (50.0, 75.0),
    "Perishables": (65.0, 85.0),
    "Chemicals": (60.0, 80.0),
    "general": (70.0, 90.0),
}


# ---------------------------------------------------------------------------
# Battery limits
# ---------------------------------------------------------------------------

BATTERY_WARN_PCT = 25.0
BATTERY_CRITICAL_PCT = 10.0


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def _temperature_band(
    cargo_type: str | None,
) -> tuple[float, float, float, float]:
    """Return temperature limits for a cargo type."""

    return TEMPERATURE_BANDS.get(
        cargo_type or "general",
        TEMPERATURE_BANDS["general"],
    )


def _humidity_ceiling(
    cargo_type: str | None,
) -> tuple[float, float]:
    """Return humidity limits for a cargo type."""

    return HUMIDITY_CEILING.get(
        cargo_type or "general",
        HUMIDITY_CEILING["general"],
    )


# ---------------------------------------------------------------------------
# Health calculation
# ---------------------------------------------------------------------------

def compute_health(
    reading: SensorReading | None,
    cargo_type: str | None,
) -> dict:
    """Calculate a 0-100 health score and status."""

    if reading is None:
        return {
            "status": "no_data",
            "score": 0,
            "reasons": ["No sensor data recorded yet"],
        }

    score = 100
    reasons: list[str] = []

    # ---------------------------------------------------------------
    # Temperature
    # ---------------------------------------------------------------

    ideal_low, ideal_high, warn_low, warn_high = _temperature_band(
        cargo_type
    )

    if (
        reading.temperature < warn_low
        or reading.temperature > warn_high
    ):
        score -= 45
        reasons.append(
            f"Temperature {reading.temperature:.1f}°C "
            "is critically out of range"
        )

    elif (
        reading.temperature < ideal_low
        or reading.temperature > ideal_high
    ):
        score -= 20
        reasons.append(
            f"Temperature {reading.temperature:.1f}°C "
            "is outside the ideal range"
        )

    # ---------------------------------------------------------------
    # Humidity
    # ---------------------------------------------------------------

    humidity_ideal, humidity_critical = _humidity_ceiling(
        cargo_type
    )

    if reading.humidity > humidity_critical:
        score -= 30
        reasons.append(
            f"Humidity {reading.humidity:.0f}% "
            "is critically high"
        )

    elif reading.humidity > humidity_ideal:
        score -= 15
        reasons.append(
            f"Humidity {reading.humidity:.0f}% "
            "is above the ideal ceiling"
        )

    # ---------------------------------------------------------------
    # Battery
    # ---------------------------------------------------------------

    if reading.battery_level <= BATTERY_CRITICAL_PCT:
        score -= 35
        reasons.append(
            f"Battery critically low "
            f"({reading.battery_level:.0f}%)"
        )

    elif reading.battery_level <= BATTERY_WARN_PCT:
        score -= 15
        reasons.append(
            f"Battery low "
            f"({reading.battery_level:.0f}%)"
        )

    # ---------------------------------------------------------------
    # GPS
    # ---------------------------------------------------------------

    if not reading.gps_valid:
        score -= 25
        reasons.append("GPS signal lost")

    # ---------------------------------------------------------------
    # Door
    # ---------------------------------------------------------------

    if (
        reading.door_status == DoorStatus.OPEN
        and reading.movement_status == MovementStatus.MOVING
    ):
        score -= 40
        reasons.append(
            "Door open while container is in motion"
        )

    # ---------------------------------------------------------------
    # Final score
    # ---------------------------------------------------------------

    score = max(0, min(100, score))

    if score >= 80:
        status = "healthy"
    elif score >= 50:
        status = "warning"
    else:
        status = "critical"

    if not reasons:
        reasons.append(
            "All sensor readings within normal range"
        )

    return {
        "status": status,
        "score": score,
        "reasons": reasons,
    }


# ---------------------------------------------------------------------------
# Generate next simulated sensor reading
# ---------------------------------------------------------------------------

def _generate_next_reading(
    container: Container,
    previous: SensorReading | None,
) -> SensorReading:

    ideal_low, ideal_high, _, _ = _temperature_band(
        container.cargo_type
    )

    baseline_temp = (
        ideal_low + ideal_high
    ) / 2

    humidity_ideal, _ = _humidity_ceiling(
        container.cargo_type
    )

    # ---------------------------------------------------------------
    # First reading
    # ---------------------------------------------------------------

    if previous is None:

        temperature = round(
            baseline_temp + random.uniform(-1.5, 1.5),
            2,
        )

        humidity = round(
            max(
                5.0,
                min(
                    95.0,
                    humidity_ideal
                    - 10
                    + random.uniform(-5, 5),
                ),
            ),
            1,
        )

        battery = round(
            random.uniform(70.0, 100.0),
            1,
        )

    # ---------------------------------------------------------------
    # Subsequent readings
    # ---------------------------------------------------------------

    else:

        # Temperature random walk
        drift = random.uniform(-0.6, 0.6)

        if random.random() < 0.04:
            drift += (
                random.choice([-1, 1])
                * random.uniform(4, 9)
            )

        pull_to_baseline = (
            baseline_temp
            - previous.temperature
        ) * 0.05

        temperature = round(
            previous.temperature
            + drift
            + pull_to_baseline,
            2,
        )

        # Humidity random walk
        humidity_drift = random.uniform(
            -2.5,
            2.5,
        )

        if random.random() < 0.04:
            humidity_drift += (
                random.choice([-1, 1])
                * random.uniform(10, 20)
            )

        humidity = round(
            max(
                5.0,
                min(
                    98.0,
                    previous.humidity
                    + humidity_drift,
                ),
            ),
            1,
        )

        # Battery
        if container.status == ContainerStatus.CLEARED:

            battery = round(
                random.uniform(92.0, 100.0),
                1,
            )

        else:

            battery = round(
                max(
                    1.0,
                    previous.battery_level
                    - random.uniform(0.05, 0.35),
                ),
                1,
            )

    # ---------------------------------------------------------------
    # Movement
    # ---------------------------------------------------------------

    movement_status = (
        MovementStatus.MOVING
        if (
            container.status == ContainerStatus.MOVING
            and random.random() < 0.85
        )
        else MovementStatus.STATIONARY
    )

    # ---------------------------------------------------------------
    # Door
    # ---------------------------------------------------------------

    door_open_bias = (
        0.06
        if container.status
        in (
            ContainerStatus.DELAYED,
            ContainerStatus.IDLE,
        )
        else 0.015
    )

    if (
        previous is not None
        and previous.door_status == DoorStatus.OPEN
    ):

        door_status = (
            DoorStatus.OPEN
            if random.random() < 0.35
            else DoorStatus.CLOSED
        )

    else:

        door_status = (
            DoorStatus.OPEN
            if random.random() < door_open_bias
            else DoorStatus.CLOSED
        )

    # ---------------------------------------------------------------
    # GPS
    # ---------------------------------------------------------------

    if (
        previous is not None
        and not previous.gps_valid
    ):

        gps_valid = random.random() < 0.6

    else:

        gps_valid = random.random() > 0.015

    # ---------------------------------------------------------------
    # Return new reading
    # ---------------------------------------------------------------

    return SensorReading(
        container_id=container.id,
        temperature=temperature,
        humidity=humidity,
        battery_level=battery,
        door_status=door_status,
        movement_status=movement_status,
        gps_valid=gps_valid,
        recorded_at=datetime.now(timezone.utc),
    )


# ---------------------------------------------------------------------------
# Latest sensor readings
# ---------------------------------------------------------------------------

def _latest_readings_by_container(
    db,
) -> dict[str, SensorReading]:
    """Get the latest sensor reading for every container."""

    rows = db.scalars(
        select(SensorReading).order_by(
            SensorReading.container_id,
            SensorReading.recorded_at.desc(),
        )
    )

    latest: dict[str, SensorReading] = {}

    for row in rows:

        if row.container_id not in latest:
            latest[row.container_id] = row

    return latest


# ---------------------------------------------------------------------------
# Digital Twin snapshot
# ---------------------------------------------------------------------------

def build_twin_snapshot(db) -> dict:
    """Build the complete Digital Twin snapshot."""

    containers = list(
        db.scalars(
            select(Container)
        )
    )

    ports = {
        p.id: p
        for p in db.scalars(
            select(Port)
        )
    }

    ships = {
        s.id: s
        for s in db.scalars(
            select(Ship)
        )
    }

    latest_by_container = (
        _latest_readings_by_container(db)
    )

    twins = []

    # ===============================================================
    # Process every container
    # ===============================================================

    for container in containers:

        reading = latest_by_container.get(
            container.id
        )

        health = compute_health(
            reading,
            container.cargo_type,
        )

        origin = ports.get(
            container.origin_port_id
        )

        destination = ports.get(
            container.destination_port_id
        )

        ship = ships.get(
            container.ship_id
        )

        # -----------------------------------------------------------
        # Distance and ETA
        # -----------------------------------------------------------

        distance_remaining = None
        eta = None

        if (
            destination is not None
            and container.current_lat is not None
            and container.current_lng is not None
            and destination.latitude is not None
            and destination.longitude is not None
        ):

            distance_remaining = round(
                haversine_km(
                    float(container.current_lat),
                    float(container.current_lng),
                    float(destination.latitude),
                    float(destination.longitude),
                ),
                1,
            )

            # Container speed is stored in knots.
            # Convert knots to km/h.
            container_speed_knots = float(
                getattr(container, "speed", 0) or 0
            )

            speed_kmh = (
                max(
                    container_speed_knots,
                    6.0,
                )
                * 1.852
            )

            # Apply simulator acceleration.
            speed_kmh *= SIMULATION_ACCELERATION

            if speed_kmh > 0:

                hours_remaining = (
                    distance_remaining
                    / speed_kmh
                )

                eta = (
                    datetime.now(timezone.utc)
                    + timedelta(
                        hours=hours_remaining
                    )
                )

        # -----------------------------------------------------------
        # Build twin
        # -----------------------------------------------------------

        twins.append(
            {
                "container_id": container.id,

                "container_code": (
                    container.container_code
                ),
		"rfid_status": "active",
		"rfid_tag": f"RFID-{container.container_code}",

                "status": (
                    container.status.value
                ),

                "risk_level": (
                    health["status"]
                ),

                "health_score": float(
                    health["score"]
                ),

                "cargo_type": (
                    container.cargo_type
                ),

                "lat": round(
                    float(container.current_lat),
                    5,
                )
                if container.current_lat is not None
                else None,

                "lng": round(
                    float(container.current_lng),
                    5,
                )
                if container.current_lng is not None
                else None,

                "ship_name": (
                    ship.name
                    if ship
                    else None
                ),

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

                # NEW
                "eta": eta,

                # NEW
                "distance_remaining_km": (
                    distance_remaining
                ),

                "sensor": (
                    {
                        "temperature": (
                            reading.temperature
                        ),

                        "humidity": (
                            reading.humidity
                        ),

                        "battery_level": (
                            reading.battery_level
                        ),

                        "door_status": (
                            reading.door_status.value
                        ),

                        "movement_status": (
                            reading.movement_status.value
                        ),

                        "gps_valid": (
                            reading.gps_valid
                        ),

                        "recorded_at": (
                            reading.recorded_at
                        ),
                    }
                    if reading
                    else None
                ),

                "health": health,

                "updated_at": (
                    reading.recorded_at
                    if reading
                    else container.updated_at
                ),
            }
        )

    # ===============================================================
    # Complete snapshot
    # ===============================================================

    return {
        "type": "twin_snapshot",

        "server_time": (
            datetime.now(timezone.utc)
        ),

        "twins": twins,
    }


# ---------------------------------------------------------------------------
# WebSocket connection manager
# ---------------------------------------------------------------------------

manager = ConnectionManager()


# ---------------------------------------------------------------------------
# One simulation tick
# ---------------------------------------------------------------------------

def _tick_once() -> dict:
    """Generate new sensor readings and return a fresh snapshot."""

    db = SessionLocal()

    try:

        containers = list(
            db.scalars(
                select(Container)
            )
        )

        latest_by_container = (
            _latest_readings_by_container(db)
        )

        for container in containers:

            previous = latest_by_container.get(
                container.id
            )

            db.add(
                _generate_next_reading(
                    container,
                    previous,
                )
            )

        db.commit()

        return build_twin_snapshot(db)

    finally:

        db.close()


# ---------------------------------------------------------------------------
# Background simulation loop
# ---------------------------------------------------------------------------

async def simulation_loop() -> None:
    """Continuously update Digital Twin telemetry."""

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

            # Keep the simulator alive if one tick fails.
            print(
                "[digital_twin_simulator] "
                f"tick failed: {exc}"
            )

        await asyncio.sleep(
            TICK_SECONDS
        )