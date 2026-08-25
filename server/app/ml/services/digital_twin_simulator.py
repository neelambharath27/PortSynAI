"""Digital Twin telemetry simulator.

Real IoT sensor feeds (temperature/humidity probes, battery telemetry, door
contact sensors, GPS modules) aren't available for this project, so — same
approach as `tracking_simulator.py` for GPS position — this module simulates
one: on a fixed interval it generates a new, physically-plausible
`SensorReading` for every container (a random walk around a cargo-type-aware
baseline rather than pure noise, so the timeline looks like a real sensor
rather than static), derives a health indicator from it, and broadcasts a
twin snapshot to any connected WebSocket client.

`ConnectionManager` is reused from `tracking_simulator` rather than
duplicated — same pub/sub shape, no reason to maintain two copies.
"""

import asyncio
import random
from datetime import datetime, timezone

from sqlalchemy import select

from app.database.session import SessionLocal
from app.models.container import Container
from app.models.enums import ContainerStatus, DoorStatus, MovementStatus
from app.models.port import Port
from app.models.sensor_reading import SensorReading
from app.models.ship import Ship
from app.services.tracking_simulator import ConnectionManager

TICK_SECONDS = 5.0
MAX_HISTORY_HOURS_DEFAULT = 24
MAX_HISTORY_POINTS = 500

# Ideal / warning / critical temperature bands per cargo type. Cargo not
# listed falls back to the "ambient ok" ("general") tuple below. Bands are
# (ideal_low, ideal_high, warn_low, warn_high) — outside ideal is a warning,
# outside warn is critical.
TEMPERATURE_BANDS: dict[str, tuple[float, float, float, float]] = {
    "Perishables": (2.0, 8.0, -1.0, 12.0),
    "Chemicals": (5.0, 25.0, 0.0, 35.0),
    "Electronics": (5.0, 30.0, -5.0, 40.0),
    "general": (-10.0, 40.0, -20.0, 50.0),
}

# Ideal / warning humidity ceiling per cargo type (moisture-sensitive cargo
# cares about an upper bound far more than a lower one).
HUMIDITY_CEILING: dict[str, tuple[float, float]] = {
    "Electronics": (50.0, 75.0),
    "Perishables": (65.0, 85.0),
    "Chemicals": (60.0, 80.0),
    "general": (70.0, 90.0),
}

BATTERY_WARN_PCT = 25.0
BATTERY_CRITICAL_PCT = 10.0


def _temperature_band(cargo_type: str) -> tuple[float, float, float, float]:
    return TEMPERATURE_BANDS.get(cargo_type, TEMPERATURE_BANDS["general"])


def _humidity_ceiling(cargo_type: str) -> tuple[float, float]:
    return HUMIDITY_CEILING.get(cargo_type, HUMIDITY_CEILING["general"])


def compute_health(reading: SensorReading, cargo_type: str) -> dict:
    """Derive a 0-100 health score + status + human-readable reasons from a
    single sensor reading. Pure function so it's easy to unit test and reuse
    for both the live snapshot and the history timeline."""

    if reading is None:
        return {"status": "no_data", "score": 0, "reasons": ["No sensor data recorded yet"]}

    score = 100
    reasons: list[str] = []

    ideal_low, ideal_high, warn_low, warn_high = _temperature_band(cargo_type)
    if reading.temperature < warn_low or reading.temperature > warn_high:
        score -= 45
        reasons.append(f"Temperature {reading.temperature:.1f}°C is critically out of range")
    elif reading.temperature < ideal_low or reading.temperature > ideal_high:
        score -= 20
        reasons.append(f"Temperature {reading.temperature:.1f}°C is outside the ideal range")

    humidity_ideal, humidity_critical = _humidity_ceiling(cargo_type)
    if reading.humidity > humidity_critical:
        score -= 30
        reasons.append(f"Humidity {reading.humidity:.0f}% is critically high")
    elif reading.humidity > humidity_ideal:
        score -= 15
        reasons.append(f"Humidity {reading.humidity:.0f}% is above the ideal ceiling")

    if reading.battery_level <= BATTERY_CRITICAL_PCT:
        score -= 35
        reasons.append(f"Battery critically low ({reading.battery_level:.0f}%)")
    elif reading.battery_level <= BATTERY_WARN_PCT:
        score -= 15
        reasons.append(f"Battery low ({reading.battery_level:.0f}%)")

    if not reading.gps_valid:
        score -= 25
        reasons.append("GPS signal lost")

    if reading.door_status == DoorStatus.OPEN and reading.movement_status == MovementStatus.MOVING:
        score -= 40
        reasons.append("Door open while container is in motion")

    score = max(0, min(100, score))
    if score >= 80:
        status = "healthy"
    elif score >= 50:
        status = "warning"
    else:
        status = "critical"

    if not reasons:
        reasons.append("All sensor readings within normal range")

    return {"status": status, "score": score, "reasons": reasons}


def _generate_next_reading(container: Container, previous: SensorReading | None) -> SensorReading:
    ideal_low, ideal_high, _, _ = _temperature_band(container.cargo_type)
    baseline_temp = (ideal_low + ideal_high) / 2
    humidity_ideal, _ = _humidity_ceiling(container.cargo_type)

    if previous is None:
        temperature = round(baseline_temp + random.uniform(-1.5, 1.5), 2)
        humidity = round(max(5.0, min(95.0, humidity_ideal - 10 + random.uniform(-5, 5))), 1)
        battery = round(random.uniform(70.0, 100.0), 1)
    else:
        # Random walk toward the cargo baseline, with an occasional larger
        # jolt so the timeline realistically shows the odd anomaly instead
        # of a perfectly smooth line.
        drift = random.uniform(-0.6, 0.6)
        if random.random() < 0.04:
            drift += random.choice([-1, 1]) * random.uniform(4, 9)
        pull_to_baseline = (baseline_temp - previous.temperature) * 0.05
        temperature = round(previous.temperature + drift + pull_to_baseline, 2)

        humidity_drift = random.uniform(-2.5, 2.5)
        if random.random() < 0.04:
            humidity_drift += random.choice([-1, 1]) * random.uniform(10, 20)
        humidity = round(max(5.0, min(98.0, previous.humidity + humidity_drift)), 1)

        # Containers freshly (re)deployed after a clearance get a serviced
        # battery; otherwise it drains slowly, same "keeps the demo moving"
        # philosophy as the tracking simulator's arrival/redeploy logic.
        if container.status == ContainerStatus.CLEARED:
            battery = round(random.uniform(92.0, 100.0), 1)
        else:
            battery = round(max(1.0, previous.battery_level - random.uniform(0.05, 0.35)), 1)

    movement_status = (
        MovementStatus.MOVING
        if container.status == ContainerStatus.MOVING and random.random() < 0.85
        else MovementStatus.STATIONARY
    )

    door_open_bias = 0.06 if container.status in (ContainerStatus.DELAYED, ContainerStatus.IDLE) else 0.015
    if previous is not None and previous.door_status == DoorStatus.OPEN:
        # Doors that just opened are likely to close again soon rather than
        # staying open indefinitely.
        door_status = DoorStatus.OPEN if random.random() < 0.35 else DoorStatus.CLOSED
    else:
        door_status = DoorStatus.OPEN if random.random() < door_open_bias else DoorStatus.CLOSED

    if previous is not None and not previous.gps_valid:
        gps_valid = random.random() < 0.6  # signal tends to recover within a few ticks
    else:
        gps_valid = random.random() > 0.015

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


def _latest_readings_by_container(db) -> dict[str, SensorReading]:
    """One query for the latest reading per container, instead of N+1."""
    rows = db.scalars(
        select(SensorReading).order_by(SensorReading.container_id, SensorReading.recorded_at.desc())
    )
    latest: dict[str, SensorReading] = {}
    for row in rows:
        if row.container_id not in latest:
            latest[row.container_id] = row
    return latest


def build_twin_snapshot(db) -> dict:
    containers = list(db.scalars(select(Container)))
    ports = {p.id: p for p in db.scalars(select(Port))}
    ships = {s.id: s for s in db.scalars(select(Ship))}
    latest_by_container = _latest_readings_by_container(db)

    twins = []
    for container in containers:
        reading = latest_by_container.get(container.id)
        health = compute_health(reading, container.cargo_type)
        origin = ports.get(container.origin_port_id)
        destination = ports.get(container.destination_port_id)
        ship = ships.get(container.ship_id)

        twins.append(
            {
                "container_id": container.id,
                "container_code": container.container_code,
                "status": container.status.value,
                "cargo_type": container.cargo_type,
                "lat": round(container.current_lat, 5),
                "lng": round(container.current_lng, 5),
                "ship_name": ship.name if ship else None,
                "origin_port": origin.name if origin else None,
                "destination_port": destination.name if destination else None,
                "sensor": (
                    {
                        "temperature": reading.temperature,
                        "humidity": reading.humidity,
                        "battery_level": reading.battery_level,
                        "door_status": reading.door_status.value,
                        "movement_status": reading.movement_status.value,
                        "gps_valid": reading.gps_valid,
                        "recorded_at": reading.recorded_at,
                    }
                    if reading
                    else None
                ),
                "health": health,
                "updated_at": reading.recorded_at if reading else container.updated_at,
            }
        )

    return {
        "type": "twin_snapshot",
        "server_time": datetime.now(timezone.utc),
        "twins": twins,
    }


manager = ConnectionManager()


def _tick_once() -> dict:
    db = SessionLocal()
    try:
        containers = list(db.scalars(select(Container)))
        latest_by_container = _latest_readings_by_container(db)

        for container in containers:
            previous = latest_by_container.get(container.id)
            db.add(_generate_next_reading(container, previous))

        db.commit()
        return build_twin_snapshot(db)
    finally:
        db.close()


async def simulation_loop() -> None:
    while True:
        try:
            snapshot = await asyncio.to_thread(_tick_once)
            if manager.active_count > 0:
                await manager.broadcast(snapshot)
        except Exception as exc:  # pragma: no cover - defensive, keep loop alive
            print(f"[digital_twin_simulator] tick failed: {exc}")
        await asyncio.sleep(TICK_SECONDS)
