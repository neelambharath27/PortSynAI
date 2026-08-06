# PortSynAI — Smart Port Intelligence Platform

**Hybrid AI Framework for Smart Port Container Tracking, Anomaly Detection
and Secure Cargo Clearance Using Digital Twin and Explainable AI**

B.Tech major project. Full architecture, phased roadmap, and per-phase
READMEs live alongside this file.

```
smart-port-platform/
├── client/     # React + TypeScript + Vite frontend  → see client/README.md
├── server/     # FastAPI + PostgreSQL backend         → see server/README.md
└── docker-compose.yml
```

## Quick Start (Docker — recommended)

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000 (docs at `/docs`)
- PostgreSQL: localhost:5432

## Quick Start (manual)

**Backend:**
```bash
cd server
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend** (in a second terminal):
```bash
cd client
npm install
npm run dev
```

## Demo Login

| Role | Email | Password |
|---|---|---|
| Administrator | admin@portsynai.io | portsynai123 |
| Port Operator | operator@portsynai.io | portsynai123 |
| Customs Officer | customs@portsynai.io | portsynai123 |
| Security Officer | security@portsynai.io | portsynai123 |

## Progress

- ✅ **Phase 1 — Frontend Foundation**: Vite + React + TypeScript scaffold,
  Tailwind design system, layouts, routing, landing page, login page,
  dashboard shell. See `client/README.md`.
- ✅ **Phase 2 — Backend Foundation**: FastAPI + PostgreSQL, JWT auth, RBAC,
  full 14-table schema (Alembic-migrated), CRUD APIs for users/ports/ships/
  containers/alerts, connected end-to-end to the React frontend. See
  `server/README.md`.
- ✅ **Phase 3 — Live Container Tracking**: Leaflet + OpenStreetMap map with
  animated, color-coded container markers; a dummy GPS simulator on the
  backend that moves containers in real time over a WebSocket feed (REST
  fallback if the socket drops); search by container ID; status filters;
  route history with a map polyline + timeline; live ETA and distance
  remaining. See `server/README.md` for the simulator design.
- ✅ **Phase 4 — Dashboard Analytics**: 7 live KPI cards (total, moving,
  delayed, high risk, cleared, inspection pending, today's shipments), 4
  Chart.js visualizations (container traffic, cargo clearance, risk
  distribution, monthly reports) themed for both dark and light mode, a
  recent-alerts feed with mark-as-read, and a recent-activity timeline —
  all backed by a single `/dashboard/summary` endpoint refetched every 15s.
- ⏳ **Phase 5+**: Digital Twin, AI Prediction, Anomaly Detection, Cargo
  Inspection, Risk Assessment, Explainable AI, Blockchain Clearance,
  Reports, Admin Panel — per the approved roadmap.

See the architecture document delivered at the start of this project for
the full database schema, API design, and roadmap.
