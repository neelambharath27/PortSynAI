"""Runs a cargo inspection's YOLO inference as a background task and pushes
stage-by-stage progress to whichever WebSocket client(s) are subscribed to
that specific inspection_id — unlike the tracking/twin/risk simulators,
this isn't a broadcast-to-everyone loop, it's a per-job event stream, since
each inspection is a one-off upload rather than continuously-live telemetry.
"""

import asyncio
from datetime import datetime, timezone

from fastapi import WebSocket
from sqlalchemy import select

from app.database.session import SessionLocal
from app.models.container import Container
from app.models.enums import InspectionStatus, ThreatLevel
from app.models.inspection import Inspection
from app.services.yolo_inference import YOLOInferenceService


class InspectionJobRegistry:
    def __init__(self) -> None:
        self._sockets: dict[str, set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def subscribe(self, inspection_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._sockets.setdefault(inspection_id, set()).add(websocket)

    async def unsubscribe(self, inspection_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            sockets = self._sockets.get(inspection_id)
            if sockets:
                sockets.discard(websocket)
                if not sockets:
                    self._sockets.pop(inspection_id, None)

    async def push(self, inspection_id: str, payload: dict) -> None:
        async with self._lock:
            targets = list(self._sockets.get(inspection_id, ()))
        dead = []
        for socket in targets:
            try:
                await socket.send_json(payload)
            except Exception:
                dead.append(socket)
        if dead:
            async with self._lock:
                for socket in dead:
                    self._sockets.get(inspection_id, set()).discard(socket)


registry = InspectionJobRegistry()

STAGES = [
    ("uploading", 20, "Image received and stored"),
    ("preprocessing", 45, "Normalizing image for inference"),
    ("running_inference", 75, "Running YOLOv8 detection"),
    ("postprocessing", 95, "Scoring detections and building report"),
]


async def run_inspection_job(inspection_id: str) -> None:
    for stage, progress, message in STAGES:
        await registry.push(
            inspection_id,
            {
                "type": "inspection_progress",
                "inspection_id": inspection_id,
                "stage": stage,
                "progress": progress,
                "message": message,
                "result": None,
            },
        )
        await asyncio.sleep(0.35 if stage != "running_inference" else 0.7)

    db = SessionLocal()
    try:
        inspection = db.get(Inspection, inspection_id)
        if inspection is None:
            return
        container = db.get(Container, inspection.container_id)

        detections, processing_ms = await asyncio.to_thread(
            YOLOInferenceService.detect, container.cargo_type if container else "General"
        )
        overall = YOLOInferenceService.overall_threat_level(detections)

        inspection.detected_objects = [
            {
                "label": d.label,
                "category": d.category,
                "confidence": d.confidence,
                "threat_level": d.threat_level.value,
                "bbox": d.bbox,
            }
            for d in detections
        ]
        inspection.threat_level = overall
        inspection.processing_ms = processing_ms
        inspection.status = (
            InspectionStatus.FLAGGED
            if overall in (ThreatLevel.HIGH, ThreatLevel.CRITICAL, ThreatLevel.MEDIUM)
            else InspectionStatus.PASSED
        )
        db.commit()
        db.refresh(inspection)

        from app.schemas.inspection import InspectionOut  # local import avoids a cycle

        result_payload = InspectionOut.model_validate(
            {
                **{c.name: getattr(inspection, c.name) for c in inspection.__table__.columns},
                "detected_objects": inspection.detected_objects,
                "inspector_name": None,
            }
        ).model_dump(mode="json")

        await registry.push(
            inspection_id,
            {
                "type": "inspection_progress",
                "inspection_id": inspection_id,
                "stage": "complete",
                "progress": 100,
                "message": f"Inspection complete — {overall.value} threat level",
                "result": result_payload,
            },
        )
    finally:
        db.close()
