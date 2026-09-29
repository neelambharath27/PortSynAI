import { Routes, Route } from "react-router-dom";
import { PublicLayout } from "../layouts/PublicLayout";
import { AuthLayout } from "../layouts/AuthLayout";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import { RoleBasedRoute } from "./RoleBasedRoute";

import { LandingPage } from "../pages/Landing/LandingPage";
import { LoginPage } from "../pages/Auth/LoginPage";
import { DashboardPage } from "../pages/Dashboard/DashboardPage";
import { LiveTrackingPage } from "../pages/LiveTracking/LiveTrackingPage";
import { DigitalTwinPage } from "../pages/DigitalTwin/DigitalTwinPage";
import { AIPredictionPage } from "../pages/AIPrediction/AIPredictionPage";
import { AnomalyDetectionPage } from "../pages/AnomalyDetection/AnomalyDetectionPage";
import { CargoInspectionPage } from "../pages/CargoInspection/CargoInspectionPage";
import { RiskAssessmentPage } from "../pages/RiskAssessment/RiskAssessmentPage";
import { ExplainableAIPage } from "../pages/ExplainableAI/ExplainableAIPage";
import { BlockchainPage } from "../pages/Blockchain/BlockchainPage";
import { AlertsPage } from "../pages/Alerts/AlertsPage";
import { ReportsPage } from "../pages/Reports/ReportsPage";
import { AdminPage } from "../pages/Admin/AdminPage";
import { AuditTrailPage } from "../pages/AuditTrail/AuditTrailPage";
import { SettingsPage } from "../pages/Settings/SettingsPage";
import { UnauthorizedPage } from "../pages/Unauthorized/UnauthorizedPage";
import { SystemHealthPage } from "../pages/SystemHealth/SystemHealthPage";
import { NotFoundPage } from "../pages/NotFoundPage";

// Keep in sync with `roles` in utils/navConfig.ts.
// This list controls which authenticated roles can access
// the common dashboard routes.
const ALL_ROLES = [
  "administrator",
  "port_operator",
  "customs_officer",
  "security_officer",
] as const;

export function AppRoutes() {
  return (
    <Routes>
      {/* Public marketing site */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
      </Route>

      {/* Authentication */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Protected application shell */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>

          {/* Common dashboard routes */}
          <Route
            element={
              <RoleBasedRoute allowedRoles={[...ALL_ROLES]} />
            }
          >
            <Route
              path="/dashboard"
              element={<DashboardPage />}
            />

            <Route
              path="/dashboard/alerts"
              element={<AlertsPage />}
            />

            <Route
              path="/dashboard/settings"
              element={<SettingsPage />}
            />

            <Route
              path="/dashboard/unauthorized"
              element={<UnauthorizedPage />}
            />
          </Route>

          {/* Live Tracking */}
          <Route
            element={
              <RoleBasedRoute
                allowedRoles={[
                  "administrator",
                  "port_operator",
                  "security_officer",
                ]}
              />
            }
          >
            <Route
              path="/dashboard/tracking"
              element={<LiveTrackingPage />}
            />
          </Route>

          {/* Digital Twin + AI Prediction */}
          <Route
            element={
              <RoleBasedRoute
                allowedRoles={[
                  "administrator",
                  "port_operator",
                ]}
              />
            }
          >
            <Route
              path="/dashboard/digital-twin"
              element={<DigitalTwinPage />}
            />

            <Route
              path="/dashboard/prediction"
              element={<AIPredictionPage />}
            />
          </Route>

          {/* Anomaly Detection */}
          <Route
            element={
              <RoleBasedRoute
                allowedRoles={[
                  "administrator",
                  "security_officer",
                ]}
              />
            }
          >
            <Route
              path="/dashboard/anomalies"
              element={<AnomalyDetectionPage />}
            />
          </Route>

          {/* Cargo Inspection */}
          <Route
            element={
              <RoleBasedRoute
                allowedRoles={[
                  "administrator",
                  "customs_officer",
                  "security_officer",
                ]}
              />
            }
          >
            <Route
              path="/dashboard/inspection"
              element={<CargoInspectionPage />}
            />
          </Route>

          {/* Risk + Explainability + Blockchain */}
          <Route
            element={
              <RoleBasedRoute
                allowedRoles={[
                  "administrator",
                  "customs_officer",
                ]}
              />
            }
          >
            <Route
              path="/dashboard/risk"
              element={<RiskAssessmentPage />}
            />

            <Route
              path="/dashboard/explainability"
              element={<ExplainableAIPage />}
            />

            <Route
              path="/dashboard/blockchain"
              element={<BlockchainPage />}
            />
          </Route>

          {/* Reports */}
          <Route
            element={
              <RoleBasedRoute
                allowedRoles={[
                  "administrator",
                  "port_operator",
                  "customs_officer",
                ]}
              />
            }
          >
            <Route
              path="/dashboard/reports"
              element={<ReportsPage />}
            />
          </Route>

          {/* Administrator Control Center */}
          <Route
            element={
              <RoleBasedRoute
                allowedRoles={["administrator"]}
              />
            }
          >
            <Route
              path="/dashboard/admin"
              element={<AdminPage />}
            />

            <Route
              path="/dashboard/audit-trail"
              element={<AuditTrailPage />}
            />

            <Route
              path="/dashboard/system-health"
              element={<SystemHealthPage />}
            />
          </Route>

        </Route>
      </Route>

      {/* 404 */}
      <Route
        path="*"
        element={<NotFoundPage />}
      />
    </Routes>
  );
}