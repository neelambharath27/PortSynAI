import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  CubeIcon,
  TruckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckBadgeIcon,
  MagnifyingGlassCircleIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../contexts/AuthContext";
import { ROLE_LABELS } from "../../types/auth";
import { fetchDashboardSummary } from "../../services/dashboardService";
import { KpiCard } from "../../components/dashboard/KpiCard";
import { AlertsFeed } from "../../components/dashboard/AlertsFeed";
import { ActivityFeed } from "../../components/dashboard/ActivityFeed";
import { ContainerTrafficChart } from "../../components/charts/ContainerTrafficChart";
import { CargoClearanceChart } from "../../components/charts/CargoClearanceChart";
import { RiskDistributionChart } from "../../components/charts/RiskDistributionChart";
import { MonthlyReportChart } from "../../components/charts/MonthlyReportChart";

export function DashboardPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: fetchDashboardSummary,
    refetchInterval: 15000,
  });

  const counts = data?.counts;

  return (
    <div className="space-y-6">
      {/* Greeting header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel relative overflow-hidden rounded-2xl p-6 lg:p-8"
      >
        <div className="pointer-events-none absolute inset-0 bg-grid-lines bg-[size:32px_32px] opacity-30" />
        <div className="relative">
          <p className="font-mono text-xs uppercase tracking-widest text-cyan-400">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-white lg:text-3xl">
            Welcome back, {user?.name?.split(" ")[0] ?? "Operator"}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-ink-300">
            You're signed in as{" "}
            <span className="text-cyan-400">
              {user ? ROLE_LABELS[user.role] : ""}
            </span>
            . Here's the live pulse on port operations.
          </p>
        </div>
      </motion.div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
        <KpiCard
          label="Total Containers"
          value={isLoading ? "—" : (counts?.total_containers ?? 0)}
          icon={CubeIcon}
          tone="default"
        />
        <KpiCard
          label="Moving"
          value={isLoading ? "—" : (counts?.moving ?? 0)}
          icon={TruckIcon}
          tone="info"
        />
        <KpiCard
          label="Delayed"
          value={isLoading ? "—" : (counts?.delayed ?? 0)}
          icon={ClockIcon}
          tone="warning"
        />
        <KpiCard
          label="High Risk"
          value={isLoading ? "—" : (counts?.high_risk ?? 0)}
          icon={ExclamationTriangleIcon}
          tone="danger"
        />
        <KpiCard
          label="Cleared"
          value={isLoading ? "—" : (counts?.cleared ?? 0)}
          icon={CheckBadgeIcon}
          tone="success"
        />
        <KpiCard
          label="Inspection Pending"
          value={isLoading ? "—" : (counts?.inspection_pending ?? 0)}
          icon={MagnifyingGlassCircleIcon}
          tone="warning"
        />
        <KpiCard
          label="Today's Shipments"
          value={isLoading ? "—" : (counts?.today_shipments ?? 0)}
          icon={CalendarDaysIcon}
          tone="info"
        />
      </div>

      {/* Charts */}
      {data && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ContainerTrafficChart data={data.container_traffic} />
          <CargoClearanceChart data={data.clearance_distribution} />
          <RiskDistributionChart data={data.risk_distribution} />
          <MonthlyReportChart data={data.monthly_report} />
        </div>
      )}

      {/* Alerts + activity */}
      {data && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AlertsFeed alerts={data.recent_alerts} />
          <ActivityFeed items={data.recent_activity} />
        </div>
      )}
    </div>
  );
}
