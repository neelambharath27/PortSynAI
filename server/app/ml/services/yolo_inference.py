"""YOLOv8 cargo X-ray inference service.

No trained weights or labeled X-ray dataset are available in this
environment, so `_MockYoloModel` below stands in for `ultralytics.YOLO`,
returning plausible, cargo-aware detections instead of running real
inference. The public surface (`YOLOInferenceService.detect`) is what the
rest of the app depends on — swapping in a real model later means
replacing `_MockYoloModel` with something that wraps
`ultralytics.YOLO("weights.pt")` and returns the same `Detection` shape;
nothing in `api/v1/cargo_inspection.py` would need to change.

The "model" is loaded once per process and cached (module-level singleton)
rather than per-request, per the performance requirement to cache the YOLO
model instead of reloading it on every inspection.
"""

from __future__ import annotations

import random
import time
from dataclasses import dataclass

from app.models.enums import ThreatLevel

# label -> (category, threat_level, base_probability_weight)
# Weights are deliberately skewed toward benign/no detection — a real cargo
# screening system flags contraband on a small minority of scans.
DETECTION_CATALOG: dict[str, tuple[str, ThreatLevel, float]] = {
    "Knife": ("Weapons", ThreatLevel.HIGH, 1.2),
    "Gun": ("Weapons", ThreatLevel.CRITICAL, 0.4),
    "Pistol": ("Weapons", ThreatLevel.CRITICAL, 0.4),
    "Rifle": ("Weapons", ThreatLevel.CRITICAL, 0.2),
    "Ammunition": ("Weapons", ThreatLevel.HIGH, 0.5),
    "Bomb": ("Explosives", ThreatLevel.CRITICAL, 0.08),
    "Grenade": ("Explosives", ThreatLevel.CRITICAL, 0.08),
    "Explosive Material": ("Explosives", ThreatLevel.CRITICAL, 0.1),
    "Cocaine": ("Drugs", ThreatLevel.HIGH, 0.5),
    "Heroin": ("Drugs", ThreatLevel.HIGH, 0.4),
    "Cannabis": ("Drugs", ThreatLevel.MEDIUM, 0.6),
    "Drug Package": ("Drugs", ThreatLevel.HIGH, 0.6),
    "Laptop": ("Electronics", ThreatLevel.NONE, 6.0),
    "Mobile": ("Electronics", ThreatLevel.NONE, 6.0),
    "Circuit Board": ("Electronics", ThreatLevel.NONE, 4.0),
    "Battery": ("Electronics", ThreatLevel.LOW, 4.0),
    "Steel Pipe": ("Metal Objects", ThreatLevel.LOW, 5.0),
    "Metal Rod": ("Metal Objects", ThreatLevel.NONE, 5.0),
    "Machine Parts": ("Metal Objects", ThreatLevel.NONE, 6.0),
}

# Cargo types get a higher chance of containing a contraband-category item,
# simulating a risk-informed screening prior rather than pure randomness.
CARGO_CONTRABAND_BIAS: dict[str, float] = {
    "Electronics": 1.0,
    "Machinery": 1.0,
    "Chemicals": 1.6,
    "Textiles": 1.3,
    "Perishables": 0.6,
    "Automotive": 1.0,
    "General": 1.4,
}

THREAT_RANK = {
    ThreatLevel.NONE: 0,
    ThreatLevel.LOW: 1,
    ThreatLevel.MEDIUM: 2,
    ThreatLevel.HIGH: 3,
    ThreatLevel.CRITICAL: 4,
}


@dataclass
class Detection:
    label: str
    category: str
    confidence: float
    threat_level: ThreatLevel
    bbox: list[float]  # [x, y, w, h] normalized 0-1


class _MockYoloModel:
    """Stand-in for `ultralytics.YOLO`. Real swap-in would implement the
    same `.predict(image_path) -> list[Detection]` method."""

    def __init__(self) -> None:
        # Simulates the (otherwise real) cost of loading weights onto a
        # device once at process start.
        self.loaded_at = time.monotonic()
        self.class_names = list(DETECTION_CATALOG.keys())

    def predict(self, cargo_type: str) -> list[Detection]:
        bias = CARGO_CONTRABAND_BIAS.get(cargo_type, 1.0)
        labels = list(DETECTION_CATALOG.keys())
        weights = []
        for label in labels:
            category, threat, base_weight = DETECTION_CATALOG[label]
            w = base_weight
            if threat in (ThreatLevel.MEDIUM, ThreatLevel.HIGH, ThreatLevel.CRITICAL):
                w *= bias
            weights.append(w)

        # Number of objects visible in a scan: usually 0-2, occasionally more.
        object_count = random.choices([0, 1, 2, 3, 4], weights=[30, 32, 22, 11, 5])[0]
        if object_count == 0:
            return []

        chosen = random.choices(labels, weights=weights, k=object_count)
        detections: list[Detection] = []
        for label in chosen:
            category, threat, _ = DETECTION_CATALOG[label]
            confidence = round(random.uniform(0.83, 0.99), 3)
            w = round(random.uniform(0.08, 0.28), 3)
            h = round(random.uniform(0.08, 0.28), 3)
            x = round(random.uniform(0.02, max(0.03, 0.96 - w)), 3)
            y = round(random.uniform(0.02, max(0.03, 0.96 - h)), 3)
            detections.append(
                Detection(
                    label=label,
                    category=category,
                    confidence=confidence,
                    threat_level=threat,
                    bbox=[x, y, w, h],
                )
            )
        return detections


class YOLOInferenceService:
    _model: _MockYoloModel | None = None

    @classmethod
    def get_model(cls) -> _MockYoloModel:
        if cls._model is None:
            cls._model = _MockYoloModel()
        return cls._model

    @classmethod
    def detect(cls, cargo_type: str) -> tuple[list[Detection], float]:
        """Returns (detections, processing_ms)."""
        started = time.monotonic()
        model = cls.get_model()
        detections = model.predict(cargo_type)
        # A real forward pass takes real time; simulate a realistic latency
        # so the progress bar / processing_ms field aren't instant-and-fake.
        time.sleep(random.uniform(0.15, 0.4))
        processing_ms = round((time.monotonic() - started) * 1000, 1)
        return detections, processing_ms

    @staticmethod
    def overall_threat_level(detections: list[Detection]) -> ThreatLevel:
        if not detections:
            return ThreatLevel.NONE
        return max((d.threat_level for d in detections), key=lambda t: THREAT_RANK[t])

    @staticmethod
    def yolo_risk_score(detections: list[Detection]) -> float:
        """0-100 contribution used as the `yolo_score` input to the Risk
        Assessment engine — the highest single-detection severity dominates,
        with a small bump for multiple flagged objects."""
        if not detections:
            return 0.0
        severities = {
            ThreatLevel.NONE: 0,
            ThreatLevel.LOW: 10,
            ThreatLevel.MEDIUM: 35,
            ThreatLevel.HIGH: 70,
            ThreatLevel.CRITICAL: 95,
        }
        peak = max(severities[d.threat_level] for d in detections)
        flagged_count = sum(1 for d in detections if severities[d.threat_level] >= 35)
        return round(min(100.0, peak + (flagged_count - 1) * 3), 1)
