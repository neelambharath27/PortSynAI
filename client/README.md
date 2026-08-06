# PortSynAI — Smart Port Intelligence Platform (Frontend)

**Hybrid AI Framework for Smart Port Container Tracking, Anomaly Detection and
Secure Cargo Clearance Using Digital Twin and Explainable AI**

This is the **Phase 1 frontend foundation** for the B.Tech major project. It
contains the project scaffolding, design system, layouts, navigation,
authentication flow, and landing page. AI/ML modules, live data, and the
FastAPI backend are **not yet connected** — they arrive in later phases per
the approved roadmap.

---

## Tech Stack

- React 19 + TypeScript + Vite
- Tailwind CSS 3 (custom navy/cyan maritime design tokens)
- Framer Motion (animations)
- React Router v7 (routing)
- TanStack React Query (server-state, wired but unused until backend lands)
- Heroicons

## Getting Started

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`.

To create a production build:

```bash
npm run build
npm run preview
```

## Demo Login

The login page uses a **mock JWT auth service** (`src/services/authService.ts`)
until the FastAPI backend is generated in a later phase. Any password works.
Pick a role card on the login page — the account and permissions switch
automatically:

| Role | Email |
|---|---|
| Administrator | admin@portsynai.io |
| Port Operator | operator@portsynai.io |
| Customs Officer | customs@portsynai.io |
| Security Officer | security@portsynai.io |

## What's included in Phase 1

- ✅ Vite + React + TypeScript project, configured Tailwind design system
- ✅ Full folder structure (components, pages, layouts, hooks, services, contexts, routes, types, utils)
- ✅ Theme context with dark/light mode (defaults to dark)
- ✅ Auth context + mock JWT login flow, role-based route guarding
- ✅ Toast notification system
- ✅ Public Navbar, dashboard Sidebar (role-filtered, collapsible), Topbar, Footer
- ✅ Landing page: animated hero (shipping lanes, radar sweep, moving container ships, digital twin preview card), overview, features, AI technology stack, advantages, contact CTA
- ✅ Login page with role selector
- ✅ Dashboard shell with welcome view and quick-access module links
- ✅ Functional Settings page (theme, language, notifications)
- ✅ Placeholder pages (with phase labels) for all remaining modules, so every route in the sidebar is already navigable

## What's next (Phase 2+)

Dashboard analytics (KPI cards + charts), Live Tracking map, Digital Twin,
AI Prediction, Anomaly Detection, Cargo Inspection, Risk Assessment,
Explainable AI, Blockchain Clearance, Alerts, Reports, Admin Panel — followed
by the FastAPI backend, PostgreSQL schema, and AI model integration.

## Folder Structure

```
client/src/
├── components/    # ui, layout, charts, map, dashboard, forms, shared
├── pages/         # one folder per module/page
├── layouts/        # PublicLayout, AuthLayout, DashboardLayout
├── hooks/
├── services/       # API/service layer (currently mocked)
├── contexts/        # Theme, Auth, Notification
├── routes/          # AppRoutes, ProtectedRoute, RoleBasedRoute
├── types/
├── utils/
└── data/
```
