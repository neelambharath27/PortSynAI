# PortSynAI — Backend (FastAPI)

Backend API for the **Hybrid AI Framework for Smart Port Container Tracking,
Anomaly Detection and Secure Cargo Clearance Using Digital Twin and
Explainable AI**.

This is the **Phase 2** deliverable: authentication, RBAC, core CRUD APIs,
and PostgreSQL integration. AI model endpoints (LSTM, Isolation Forest,
YOLOv8, XGBoost, SHAP) and the blockchain clearance layer arrive in later
phases per the approved roadmap.

---

## Tech Stack

- FastAPI + Uvicorn
- SQLAlchemy 2.0 (ORM)
- PostgreSQL 16
- Alembic (migrations)
- python-jose (JWT), passlib + bcrypt (password hashing)
- Pydantic v2 / pydantic-settings

## Getting Started (local, without Docker)

Requires PostgreSQL running locally.

```bash
cd server
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # edit DATABASE_URL / JWT_SECRET_KEY if needed

# Create the database + role (skip if they already exist)
psql -c "CREATE ROLE portsynai LOGIN PASSWORD 'portsynai_dev_pw';"
psql -c "CREATE DATABASE portsynai_db OWNER portsynai;"

# Apply migrations
alembic upgrade head

# Run the API (also seeds demo data on startup)
uvicorn app.main:app --reload
```

API available at `http://localhost:8000`. Interactive docs at
`http://localhost:8000/docs` (Swagger) and `http://localhost:8000/redoc`.

## Getting Started (Docker)

From the project root:

```bash
docker compose up --build
```

This starts PostgreSQL, the FastAPI backend (`:8000`), and the Vite
frontend dev server (`:5173`) together.

## Demo Accounts

Seeded automatically on first startup (`app/database/init_db.py`). Password
is the same for all four:

| Role | Email | Password |
|---|---|---|
| Administrator | admin@portsynai.io | portsynai123 |
| Port Operator | operator@portsynai.io | portsynai123 |
| Customs Officer | customs@portsynai.io | portsynai123 |
| Security Officer | security@portsynai.io | portsynai123 |

60 sample containers, 6 ships, and 4 ports are also seeded so the frontend
has real data to render immediately.

## Authentication Flow

1. `POST /api/v1/auth/login` with `{ email, password, role }` → returns
   `access_token` (30 min) + `refresh_token` (7 days) + the user profile.
2. Send `Authorization: Bearer <access_token>` on subsequent requests.
3. `POST /api/v1/auth/refresh` with `{ refresh_token }` issues a new token
   pair once the access token expires.
4. `GET /api/v1/auth/me` returns the authenticated user (used by the
   frontend to verify a stored session on page load).

Role is enforced **twice**: on the frontend (route guarding, hidden nav
items) and on the backend (`require_role(...)` dependency on every
protected endpoint) — the backend check is the actual security boundary.

## API Overview

| Domain | Endpoints |
|---|---|
| Auth | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` |
| Users | `GET/POST /users`, `GET/PUT/DELETE /users/{id}` — Administrator only |
| Ports | `GET /ports`, `GET /ports/{id}` (any authenticated user) · `POST/PUT/DELETE` — Administrator only |
| Ships | `GET /ships`, `GET /ships/{id}` (any authenticated user) · `POST/PUT/DELETE` — Administrator / Port Operator |
| Containers | `GET /containers` (filter by `status`, `search`, paginated) · `GET /containers/stats/summary` (dashboard KPIs) · `GET/POST/PUT/DELETE` |
| Live Tracking | `GET /tracking/live` (REST snapshot) · `GET /tracking/{id}/history` (route waypoints) · `WS /tracking/ws?token=` (live push feed) |
| Alerts | `GET /alerts` (filter `unread_only`), `PUT /alerts/{id}/read` |
| Admin | `GET /admin/system-logs` — Administrator only |

Full interactive schema: `/docs`.

## Database Schema

14 tables covering the full architecture: `users`, `ports`, `ships`,
`containers`, `routes`, `sensor_readings`, `anomalies`, `inspections`,
`risk_scores`, `shap_explanations`, `clearances`, `audit_logs`, `alerts`,
`manifests`. Only `users`, `ports`, `ships`, `containers`, and `alerts` are
wired to endpoints in Phase 2 — the remaining tables are already modeled
and migrated, ready for the AI/blockchain phases to populate.

## Live Tracking Simulator ("Dummy GPS API")

There's no real port GPS/AIS feed available for this project, so
`app/services/tracking_simulator.py` acts as one:

- Every 3 seconds, every container with status `moving` is nudged along a
  great-circle bearing toward its destination port (haversine distance +
  bearing calculation), with speed/heading jittered slightly for realism.
- Movement and ETA are both compressed by the same acceleration factor, so
  a multi-thousand-km voyage plays out over a watchable demo session instead
  of literal weeks.
- Roughly every third tick, the container's current position is appended to
  its `routes.waypoints` history (capped at the last 60 points).
- On arrival, a container briefly clears, then departs again on a new
  random leg — so a demo session never runs out of movement to watch.
- `GET /tracking/live` returns a REST snapshot (used for first paint).
- `WS /tracking/ws?token=<jwt>` pushes the same snapshot shape to every
  connected client after each tick — this is what the frontend map
  subscribes to for animated live movement.
- `GET /tracking/{container_id}/history` returns that container's recorded
  waypoints, predicted ETA, and delay probability.

## Migrations

```bash
# after changing a model:
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

## Project Structure

```
server/
├── app/
│   ├── main.py              # FastAPI app, CORS, router mounting
│   ├── config.py            # Settings (env-driven)
│   ├── dependencies.py      # get_current_user (JWT → User)
│   ├── core/
│   │   ├── security.py      # password hashing, JWT encode/decode
│   │   ├── rbac.py          # require_role() dependency factory
│   │   └── exceptions.py
│   ├── database/
│   │   ├── base.py          # SQLAlchemy DeclarativeBase
│   │   ├── session.py       # engine + get_db()
│   │   └── init_db.py       # create_all + demo data seeding
│   ├── models/               # SQLAlchemy ORM models (14 tables)
│   ├── schemas/               # Pydantic request/response models
│   └── api/v1/                 # route modules + aggregator router
├── alembic/                     # migrations
├── tests/
└── requirements.txt
```

## What's next (Phase 3+)

Dashboard analytics endpoints, Live Tracking WebSocket feed, Digital Twin
sensor endpoints, then the AI modules (LSTM, Isolation Forest, YOLOv8,
XGBoost, SHAP) and the mocked Hyperledger Fabric blockchain layer.
