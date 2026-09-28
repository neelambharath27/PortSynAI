import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  CircleStackIcon,
  ClockIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  UsersIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

import {
  fetchAdminAuditLogs,
  fetchAdminUsers,
  type AdminUser,
  type AuditLogSummary,
} from "../../services/adminService";

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function formatRole(role: string): string {
  return role
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusClass(active: boolean): string {
  return active
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : "bg-red-50 text-red-700 ring-red-200";
}

function actionClass(action: string): string {
  if (action.includes("REJECT")) {
    return "text-red-700";
  }

  if (action.includes("APPROV")) {
    return "text-emerald-700";
  }

  if (action.includes("DECISION")) {
    return "text-blue-700";
  }

  return "text-slate-700";
}

export function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [logs, setLogs] = useState<AuditLogSummary[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAdminData = useCallback(async (initial = false) => {
    try {
      if (initial) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError(null);

      const [userData, logData] = await Promise.all([
        fetchAdminUsers(),
        fetchAdminAuditLogs(100),
      ]);

      setUsers(userData);
      setLogs(logData);
    } catch (err) {
      console.error("Failed to load admin data", err);
      setError(
        "Unable to load administrator data. Please check your session and backend service.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadAdminData(true);
  }, [loadAdminData]);

  const statistics = useMemo(() => {
    const activeUsers = users.filter((user) => user.is_active).length;
    const inactiveUsers = users.length - activeUsers;

    const administratorCount = users.filter(
      (user) => user.role === "administrator",
    ).length;

    const securityEvents = logs.filter(
      (log) =>
        log.action.includes("ALERT") ||
        log.action.includes("ANOMALY") ||
        log.action.includes("INSPECTION") ||
        log.action.includes("REJECT"),
    ).length;

    const clearanceEvents = logs.filter(
      (log) =>
        log.action.includes("CLEARANCE") ||
        log.entity_type === "clearance",
    ).length;

    const recentEvents = logs.filter(
      (log) =>
        Date.now() - new Date(log.created_at).getTime() <
        24 * 60 * 60 * 1000,
    ).length;

    return {
      totalUsers: users.length,
      activeUsers,
      inactiveUsers,
      administratorCount,
      totalLogs: logs.length,
      clearanceEvents,
      securityEvents,
      recentEvents,
    };
  }, [users, logs]);

  const roleDistribution = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const user of users) {
      counts[user.role] = (counts[user.role] ?? 0) + 1;
    }

    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [users]);

  const recentLogs = logs.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-600">
            System Administration
          </p>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Admin Control Center
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Monitor users, security activity, system events, and platform
            operations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadAdminData(false)}
          disabled={loading || refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ArrowPathIcon
            className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Admin data unavailable</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <ArrowPathIcon className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-3 text-sm text-slate-500">
            Loading administration data...
          </p>
        </div>
      ) : (
        <>
          {/* System overview */}
          <section>
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-slate-900">
                System Overview
              </h2>
              <p className="text-sm text-slate-500">
                Current administrator-level platform statistics.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Total Users"
                value={statistics.totalUsers}
                subtitle={`${statistics.activeUsers} active`}
                icon={UsersIcon}
              />

              <StatCard
                title="Audit Events"
                value={statistics.totalLogs}
                subtitle={`${statistics.recentEvents} in last 24h`}
                icon={ClockIcon}
              />

              <StatCard
                title="Clearance Events"
                value={statistics.clearanceEvents}
                subtitle="Recorded decisions"
                icon={ShieldCheckIcon}
              />

              <StatCard
                title="Security Events"
                value={statistics.securityEvents}
                subtitle="Alerts / inspections / rejects"
                icon={ExclamationTriangleIcon}
              />
            </div>
          </section>

          {/* Service health */}
          <section>
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-slate-900">
                Service Health
              </h2>
              <p className="text-sm text-slate-500">
                Application components currently represented by the platform.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <ServiceCard
                name="FastAPI Backend"
                status="Operational"
                icon={CpuChipIcon}
              />

              <ServiceCard
                name="PostgreSQL"
                status="Connected"
                icon={CircleStackIcon}
              />

              <ServiceCard
                name="AI / ML Engine"
                status="Available"
                icon={CpuChipIcon}
              />

              <ServiceCard
                name="Security & Audit"
                status="Active"
                icon={ShieldCheckIcon}
              />
            </div>
          </section>

          {/* Users + roles */}
          <section className="grid gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-slate-900">
                      User Management
                    </h2>
                    <p className="text-sm text-slate-500">
                      Administrator-visible platform accounts.
                    </p>
                  </div>

                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {users.length} users
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <TableHeader>Name</TableHeader>
                      <TableHeader>Email</TableHeader>
                      <TableHeader>Role</TableHeader>
                      <TableHeader>Status</TableHeader>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-5 py-3 text-sm font-medium text-slate-900">
                          {user.name}
                        </td>

                        <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">
                          {user.email}
                        </td>

                        <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">
                          {formatRole(user.role)}
                        </td>

                        <td className="whitespace-nowrap px-5 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClass(
                              user.is_active,
                            )}`}
                          >
                            {user.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {users.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-5 py-8 text-center text-sm text-slate-500"
                        >
                          No users returned by the administrator API.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Role distribution */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <UsersIcon className="h-6 w-6 text-blue-600" />

                <div>
                  <h2 className="font-semibold text-slate-900">
                    Role Distribution
                  </h2>
                  <p className="text-sm text-slate-500">
                    Current account roles
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {roleDistribution.map(([role, count]) => {
                  const percentage =
                    statistics.totalUsers > 0
                      ? Math.round((count / statistics.totalUsers) * 100)
                      : 0;

                  return (
                    <div key={role}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">
                          {formatRole(role)}
                        </span>

                        <span className="text-slate-500">
                          {count} ({percentage}%)
                        </span>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}

                {roleDistribution.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No role information available.
                  </p>
                )}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <MiniMetric
                  label="Administrators"
                  value={statistics.administratorCount}
                />

                <MiniMetric
                  label="Inactive"
                  value={statistics.inactiveUsers}
                />
              </div>
            </div>
          </section>

          {/* Recent audit events */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Recent System Activity
                  </h2>
                  <p className="text-sm text-slate-500">
                    Latest events from the administrator audit stream.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Live data
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <TableHeader>Time</TableHeader>
                    <TableHeader>Action</TableHeader>
                    <TableHeader>Entity</TableHeader>
                    <TableHeader>Details</TableHeader>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {recentLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-500">
                        {formatDate(log.created_at)}
                      </td>

                      <td
                        className={`whitespace-nowrap px-5 py-3 text-sm font-semibold ${actionClass(
                          log.action,
                        )}`}
                      >
                        {log.action}
                      </td>

                      <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">
                        {log.entity_type}
                      </td>

                      <td className="max-w-md px-5 py-3 text-xs text-slate-500">
                        <div className="truncate">
                          {JSON.stringify(log.log_metadata)}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {recentLogs.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-8 text-center text-sm text-slate-500"
                      >
                        No recent system events.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Security status */}
          <section className="grid gap-4 md:grid-cols-3">
            <SecurityStatus
              title="Authentication"
              description="Protected administrator route"
              status="Protected"
              icon={ShieldCheckIcon}
            />

            <SecurityStatus
              title="Audit Logging"
              description="System events are recorded"
              status="Active"
              icon={ClockIcon}
            />

            <SecurityStatus
              title="Unauthorized Access"
              description="Role-based access control"
              status="Enforced"
              icon={XCircleIcon}
            />
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: typeof UsersIcon;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>

        <div className="rounded-lg bg-blue-50 p-3">
          <Icon className="h-6 w-6 text-blue-600" />
        </div>
      </div>
    </div>
  );
}

function ServiceCard({
  name,
  status,
  icon: Icon,
}: {
  name: string;
  status: string;
  icon: typeof CpuChipIcon;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-slate-100 p-3">
          <Icon className="h-6 w-6 text-slate-700" />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {name}
          </p>

          <div className="mt-1 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-emerald-700">
              {status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityStatus({
  title,
  description,
  status,
  icon: Icon,
}: {
  title: string;
  description: string;
  status: string;
  icon: typeof ShieldCheckIcon;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
      <Icon className="h-7 w-7 text-emerald-600" />

      <div>
        <p className="font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-600">{description}</p>
        <p className="mt-1 text-xs font-bold text-emerald-700">{status}</p>
      </div>
    </div>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </th>
  );
}