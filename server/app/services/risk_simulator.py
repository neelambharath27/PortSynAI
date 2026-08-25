"""Periodic risk rescoring loop, same shape as tracking_simulator.py /
digital_twin_simulator.py: every tick it recomputes risk for a rotating
subset of containers (a real system would trigger this on new sensor/GPS/
inspection events rather than a timer, but polling-by-timer keeps this
consistent with the rest of the platform's simulated-live-data approach)
and broadcasts the latest state to any connected WebSocket client.
"""

import asyncio
import random
from datetime import datetime, timezone

from sqlalchemy import select

from app.database.session import SessionLocal
from app.models.container import Container
from app.models.risk_score import RiskScore
from app.services.risk_engine import assess_container
from app.services.tracking_simulator import ConnectionManager

TICK_SECONDS = 8.0
CONTAINERS_PER_TICK = 6

manager = ConnectionManager()


def _latest_scores_by_container(db) -> dict[str, RiskScore]:
    rows = db.scalars(select(RiskScore).order_by(RiskScore.container_id, RiskScore.computed_at.desc()))
    latest: dict[str, RiskScore] = {}
    for row in rows:
        if row.container_id not in latest:
            latest[row.container_id] = row
    return latest


def build_risk_snapshot(db, limit: int | None = None) -> dict:
    containers = {c.id: c for c in db.scalars(select(Container))}
    latest = _latest_scores_by_container(db)

    items = []
    for container_id, score in latest.items():
        container = containers.get(container_id)
        if not container:
            continue
        items.append(
            {
                "id": score.id,
                "container_id": container.id,
                "container_code": container.container_code,
                "gps_score": score.gps_score,
                "rfid_score": score.rfid_score,
                "sensor_score": score.sensor_score,
                "manifest_score": score.manifest_score,
                "yolo_score": score.yolo_score,
                "delay_score": score.delay_score,
                "final_score": score.final_score,
                "risk_level": score.risk_level.value,
                "confidence": score.confidence,
                "recommendation": score.recommendation,
                "risk_factors": score.risk_factors,
                "computed_at": score.computed_at,
            }
        )

    items.sort(key=lambda x: x["final_score"], reverse=True)
    if limit:
        items = items[:limit]

    return {
        "type": "risk_snapshot",
        "server_time": datetime.now(timezone.utc),
        "assessments": items,
    }


def _tick_once() -> dict:
    db = SessionLocal()
    try:
        containers = list(db.scalars(select(Container)))
        sample = random.sample(containers, k=min(CONTAINERS_PER_TICK, len(containers)))
        for container in sample:
            assess_container(db, container)
        db.commit()
        return build_risk_snapshot(db)
    finally:
        db.close()


async def simulation_loop() -> None:
    while True:
        try:
            snapshot = await asyncio.to_thread(_tick_once)
            if manager.active_count > 0:
                await manager.broadcast(snapshot)
        except Exception as exc:  # pragma: no cover - defensive, keep loop alive
            print(f"[risk_simulator] tick failed: {exc}")
        await asyncio.sleep(TICK_SECONDS)
