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
import { SettingsPage } from "../pages/Settings/SettingsPage";
import { UnauthorizedPage } from "../pages/Unauthorized/UnauthorizedPage";
import { NotFoundPage } from "../pages/NotFoundPage";

// Keep in sync with `roles` in utils/navConfig.ts — that file drives what
// the sidebar shows, this drives what the router actually allows. Both are
// checked against the backend's own `require_role` guards (defense in
// depth), so this list is not the only thing standing between a role and a
// page, but without it any authenticated user could reach any dashboard
// route directly via the URL bar regardless of what the sidebar hides.
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
          <Route element={<RoleBasedRoute allowedRoles={[...ALL_ROLES]} />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard/alerts" element={<AlertsPage />} />
            <Route path="/dashboard/settings" element={<SettingsPage />} />
            <Route path="/dashboard/unauthorized" element={<UnauthorizedPage />} />
          </Route>

          <Route
            element={
              <RoleBasedRoute
                allowedRoles={["administrator", "port_operator", "security_officer"]}
              />
            }
          >
            <Route path="/dashboard/tracking" element={<LiveTrackingPage />} />
          </Route>

          <Route
            element={
              <RoleBasedRoute allowedRoles={["administrator", "port_operator"]} />
            }
          >
            <Route path="/dashboard/digital-twin" element={<DigitalTwinPage />} />
            <Route path="/dashboard/prediction" element={<AIPredictionPage />} />
          </Route>

          <Route
            element={
              <RoleBasedRoute allowedRoles={["administrator", "security_officer"]} />
            }
          >
            <Route path="/dashboard/anomalies" element={<AnomalyDetectionPage />} />
          </Route>

          <Route
            element={
              <RoleBasedRoute
                allowedRoles={["administrator", "customs_officer", "security_officer"]}
              />
            }
          >
            <Route path="/dashboard/inspection" element={<CargoInspectionPage />} />
          </Route>

          <Route
            element={
              <RoleBasedRoute allowedRoles={["administrator", "customs_officer"]} />
            }
          >
            <Route path="/dashboard/risk" element={<RiskAssessmentPage />} />
            <Route path="/dashboard/explainability" element={<ExplainableAIPage />} />
            <Route path="/dashboard/blockchain" element={<BlockchainPage />} />
          </Route>

          <Route
            element={
              <RoleBasedRoute
                allowedRoles={["administrator", "port_operator", "customs_officer"]}
              />
            }
          >
            <Route path="/dashboard/reports" element={<ReportsPage />} />
          </Route>

          <Route element={<RoleBasedRoute allowedRoles={["administrator"]} />}>
            <Route path="/dashboard/admin" element={<AdminPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
