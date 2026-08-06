import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.database.base import Base
from app.database.session import engine, SessionLocal
from app.models.alert import Alert
from app.models.clearance import Clearance
from app.models.container import Container
from app.models.enums import (
    AlertSeverity,
    ClearanceStatus,
    ContainerStatus,
    InspectionStatus,
    RiskLevel,
    ShipStatus,
    UserRole,
)
from app.models.inspection import Inspection
from app.models.port import Port
from app.models.risk_score import RiskScore
from app.models.ship import Ship
from app.models.user import User

import app.models  # noqa: F401  ensures all models are registered on Base.metadata


DEMO_USERS = [
    {
        "name": "Ananya Rao",
        "email": "admin@portsynai.io",
        "role": UserRole.ADMINISTRATOR,
        "phone": "+91-98200-11001",
    },
    {
        "name": "Vikram Shah",
        "email": "operator@portsynai.io",
        "role": UserRole.PORT_OPERATOR,
        "phone": "+91-98200-11002",
    },
    {
        "name": "Meera Nair",
        "email": "customs@portsynai.io",
        "role": UserRole.CUSTOMS_OFFICER,
        "phone": "+91-98200-11003",
    },
    {
        "name": "Arjun Verma",
        "email": "security@portsynai.io",
        "role": UserRole.SECURITY_OFFICER,
        "phone": "+91-98200-11004",
    },
]

DEMO_PASSWORD = "portsynai123"

PORTS = [
    {"name": "Jawaharlal Nehru Port", "code": "INNSA", "country": "India", "latitude": 18.9490, "longitude": 72.9525},
    {"name": "Port of Singapore", "code": "SGSIN", "country": "Singapore", "latitude": 1.2644, "longitude": 103.8200},
    {"name": "Port of Rotterdam", "code": "NLRTM", "country": "Netherlands", "latitude": 51.9496, "longitude": 4.1453},
    {"name": "Jebel Ali Port", "code": "AEJEA", "country": "UAE", "latitude": 25.0118, "longitude": 55.0617},
]

CARGO_TYPES = ["General", "Electronics", "Machinery", "Textiles", "Chemicals", "Perishables", "Automotive"]


def init_db() -> None:
    """Ensure tables exist and seed baseline demo data.

    In production, schema changes should be applied via Alembic
    (`alembic upgrade head`) instead of relying on create_all(). create_all()
    is kept here as a zero-config convenience for local development so the
    API is usable immediately after `docker compose up` without a separate
    migration step; it is a no-op once Alembic has already created the
    tables.
    """
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()
    try:
        users = _seed_users(db)
        ports = _seed_ports(db)
        ships = _seed_ships(db, ports)
        containers = _seed_containers(db, ships, ports)
        _seed_inspections(db, containers, users)
        risk_scores = _seed_risk_scores(db, containers)
        _seed_clearances(db, containers, risk_scores, users)
        _seed_alerts(db, containers)
    finally:
        db.close()


def _seed_users(db: Session) -> list[User]:
    for entry in DEMO_USERS:
        existing = db.scalar(select(User).where(User.email == entry["email"]))
        if existing:
            continue
        db.add(
            User(
                name=entry["name"],
                email=entry["email"],
                role=entry["role"],
                phone=entry["phone"],
                password_hash=hash_password(DEMO_PASSWORD),
            )
        )
    db.commit()
    return list(db.scalars(select(User)))


def _seed_ports(db: Session) -> list[Port]:
    ports = []
    for entry in PORTS:
        existing = db.scalar(select(Port).where(Port.code == entry["code"]))
        if existing:
            ports.append(existing)
            continue
        port = Port(**entry)
        db.add(port)
        ports.append(port)
    db.commit()
    for p in ports:
        db.refresh(p)
    return ports


def _seed_ships(db: Session, ports: list[Port]) -> list[Ship]:
    existing_ships = list(db.scalars(select(Ship)))
    if existing_ships:
        return existing_ships

    ship_names = [
        "MV Horizon Voyager", "MV Pacific Sentinel", "MV Atlantic Pioneer",
        "MV Coral Navigator", "MV Silver Mariner", "MV Northern Star",
    ]
    ships = []
    for i, name in enumerate(ship_names):
        ship = Ship(
            name=name,
            imo_number=f"IMO{9000000 + i}",
            port_id=random.choice(ports).id,
            status=random.choice(list(ShipStatus)),
            eta=datetime.now(timezone.utc) + timedelta(hours=random.randint(2, 72)),
            capacity=random.randint(4000, 20000),
        )
        db.add(ship)
        ships.append(ship)
    db.commit()
    for s in ships:
        db.refresh(s)
    return ships


def _seed_containers(db: Session, ships: list[Ship], ports: list[Port]) -> list[Container]:
    existing = list(db.scalars(select(Container)))
    if existing:
        return existing

    statuses = (
        [ContainerStatus.MOVING] * 5
        + [ContainerStatus.DELAYED] * 2
        + [ContainerStatus.CLEARED] * 2
        + [ContainerStatus.HIGH_RISK] * 1
        + [ContainerStatus.IDLE] * 1
    )

    containers = []
    for i in range(60):
        origin, destination = random.sample(ports, 2)
        container = Container(
            container_code=f"MSKU{700000 + i}",
            ship_id=random.choice(ships).id,
            origin_port_id=origin.id,
            destination_port_id=destination.id,
            current_lat=origin.latitude + random.uniform(-3, 3),
            current_lng=origin.longitude + random.uniform(-3, 3),
            speed=round(random.uniform(0, 24), 1),
            heading=round(random.uniform(0, 359), 1),
            status=random.choice(statuses),
            cargo_type=random.choice(CARGO_TYPES),
            weight_kg=round(random.uniform(2000, 28000), 1),
        )
        db.add(container)
        containers.append(container)
    db.commit()
    for c in containers:
        db.refresh(c)
    return containers


def _seed_inspections(db: Session, containers: list[Container], users: list[User]) -> None:
    if db.scalar(select(Inspection.id).limit(1)):
        return

    inspectors = [u for u in users if u.role in (UserRole.CUSTOMS_OFFICER, UserRole.SECURITY_OFFICER)]
    sample_containers = random.sample(containers, k=min(30, len(containers)))
    detected_labels = ["Electronics", "Textiles", "Machinery Parts", "Documents", "Packaging"]

    for container in sample_containers:
        status = random.choices(
            [InspectionStatus.PENDING, InspectionStatus.PASSED, InspectionStatus.FLAGGED],
            weights=[0.3, 0.6, 0.1],
        )[0]
        detected = [
            {
                "label": random.choice(detected_labels),
                "confidence": round(random.uniform(0.82, 0.99), 3),
                "bbox": [
                    round(random.uniform(0, 0.6), 2),
                    round(random.uniform(0, 0.6), 2),
                    round(random.uniform(0.1, 0.3), 2),
                    round(random.uniform(0.1, 0.3), 2),
                ],
            }
            for _ in range(random.randint(1, 3))
        ]
        db.add(
            Inspection(
                container_id=container.id,
                image_path=None,
                detected_objects=detected,
                inspector_id=random.choice(inspectors).id if inspectors else None,
                status=status,
                created_at=datetime.now(timezone.utc) - timedelta(hours=random.randint(0, 240)),
            )
        )
    db.commit()


def _seed_risk_scores(db: Session, containers: list[Container]) -> list[RiskScore]:
    existing = list(db.scalars(select(RiskScore)))
    if existing:
        return existing

    scores = []
    sample_containers = random.sample(containers, k=min(45, len(containers)))
    for container in sample_containers:
        gps = round(random.uniform(0, 40), 1)
        rfid = round(random.uniform(0, 30), 1)
        sensor = round(random.uniform(0, 30), 1)
        manifest = round(random.uniform(0, 25), 1)
        yolo = round(random.uniform(0, 35), 1)
        final = round(min(100, (gps + rfid + sensor + manifest + yolo) / 1.6), 1)

        if final >= 65:
            level = RiskLevel.HIGH
        elif final >= 35:
            level = RiskLevel.MEDIUM
        else:
            level = RiskLevel.LOW

        score = RiskScore(
            container_id=container.id,
            gps_score=gps,
            rfid_score=rfid,
            sensor_score=sensor,
            manifest_score=manifest,
            yolo_score=yolo,
            final_score=final,
            risk_level=level,
            computed_at=datetime.now(timezone.utc) - timedelta(hours=random.randint(0, 240)),
        )
        db.add(score)
        scores.append(score)
    db.commit()
    for s in scores:
        db.refresh(s)
    return scores


def _seed_clearances(
    db: Session, containers: list[Container], risk_scores: list[RiskScore], users: list[User]
) -> None:
    if db.scalar(select(Clearance.id).limit(1)):
        return

    officers = [u for u in users if u.role == UserRole.CUSTOMS_OFFICER]
    risk_by_container = {rs.container_id: rs for rs in risk_scores}

    sample_containers = random.sample(containers, k=min(35, len(containers)))
    for container in sample_containers:
        status = random.choices(
            [ClearanceStatus.PENDING, ClearanceStatus.APPROVED, ClearanceStatus.REJECTED],
            weights=[0.35, 0.55, 0.10],
        )[0]
        risk_score = risk_by_container.get(container.id)
        timestamp = datetime.now(timezone.utc) - timedelta(hours=random.randint(0, 336))

        db.add(
            Clearance(
                container_id=container.id,
                risk_score_id=risk_score.id if risk_score else None,
                officer_id=random.choice(officers).id if officers and status != ClearanceStatus.PENDING else None,
                status=status,
                blockchain_hash=f"0x{random.getrandbits(128):032x}" if status != ClearanceStatus.PENDING else None,
                transaction_id=f"TXN-{random.randint(100000, 999999)}" if status != ClearanceStatus.PENDING else None,
                timestamp=timestamp,
            )
        )
    db.commit()


def _seed_alerts(db: Session, containers: list[Container]) -> None:
    if db.scalar(select(Alert.id).limit(1)):
        return

    templates = [
        ("gps_lost", AlertSeverity.CRITICAL, "GPS signal lost for container {code}"),
        ("high_risk", AlertSeverity.CRITICAL, "Container {code} flagged as high risk"),
        ("unauthorized_movement", AlertSeverity.WARNING, "Unauthorized movement detected for {code}"),
        ("dangerous_cargo", AlertSeverity.CRITICAL, "Dangerous cargo indicators found in {code}"),
        ("sensor_failure", AlertSeverity.WARNING, "Sensor failure reported on {code}"),
        ("blockchain_failure", AlertSeverity.WARNING, "Blockchain sync failed for clearance of {code}"),
        ("delay", AlertSeverity.INFO, "Container {code} delayed at customs"),
    ]

    sample_containers = random.sample(containers, k=min(20, len(containers)))
    for container in sample_containers:
        alert_type, severity, message_template = random.choice(templates)
        db.add(
            Alert(
                type=alert_type,
                severity=severity,
                container_id=container.id,
                message=message_template.format(code=container.container_code),
                is_read=random.random() < 0.4,
                created_at=datetime.now(timezone.utc) - timedelta(minutes=random.randint(1, 4000)),
            )
        )
    db.commit()


if __name__ == "__main__":
    init_db()
    print("Database initialized and seeded.")
