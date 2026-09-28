import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  BellAlertIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/outline";

import {
  fetchAlerts,
  markAlertRead,
  type Alert,
  type AlertSeverity,
} from "../../services/alertService";

type SeverityFilter = "all" | AlertSeverity;

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function timeAgo(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function extractContainerCode(alert: Alert): string {
  const codeMatch = alert.message.match(/\b[A-Z]{4}\d{6,8}\b/);

  if (codeMatch) {
    return codeMatch[0];
  }

  if (alert.container_id) {
    return alert.container_id.slice(0, 8).toUpperCase();
  }

  return "System";
}

function formatAlertType(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function severityClasses(severity: AlertSeverity): {
  badge: string;
  icon: string;
} {
  switch (severity) {
    case "critical":
      return {
        badge: "bg-red-100 text-red-700 border border-red-200",
        icon: "text-red-600",
      };

    case "warning":
      return {
        badge: "bg-amber-100 text-amber-700 border border-amber-200",
        icon: "text-amber-600",
      };

    default:
      return {
        badge: "bg-blue-100 text-blue-700 border border-blue-200",
        icon: "text-blue-600",
      };
  }
}

function SeverityIcon({
  severity,
  className,
}: {
  severity: AlertSeverity;
  className?: string;
}) {
  if (severity === "critical") {
    return <ShieldExclamationIcon className={className} />;
  }

  if (severity === "warning") {
    return <ExclamationTriangleIcon className={className} />;
  }

  return <InformationCircleIcon className={className} />;
}

export function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [severityFilter, setSeverityFilter] =
    useState<SeverityFilter>("all");
  const [containerFilter, setContainerFilter] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAlerts = useCallback(async (showRefreshing = false) => {
    try {
      setError(null);

      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await fetchAlerts(false);
      setAlerts(data);
    } catch (err) {
      console.error("Failed to load alerts", err);
      setError("Unable to load alerts from the server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadAlerts();

    const interval = window.setInterval(() => {
      void loadAlerts(true);
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadAlerts]);

  const containerOptions = useMemo(() => {
    const values = alerts.map(extractContainerCode);
    return Array.from(new Set(values)).sort();
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const severityMatches =
        severityFilter === "all" || alert.severity === severityFilter;

      const containerMatches =
        containerFilter === "all" ||
        extractContainerCode(alert) === containerFilter;

      const unreadMatches = !unreadOnly || !alert.is_read;

      return severityMatches && containerMatches && unreadMatches;
    });
  }, [alerts, severityFilter, containerFilter, unreadOnly]);

  const totalCount = alerts.length;

  const criticalCount = alerts.filter(
    (alert) => alert.severity === "critical",
  ).length;

  const warningCount = alerts.filter(
    (alert) => alert.severity === "warning",
  ).length;

  const infoCount = alerts.filter(
    (alert) => alert.severity === "info",
  ).length;

  const unreadCount = alerts.filter((alert) => !alert.is_read).length;

  const handleMarkRead = async (alertId: string) => {
    try {
      const updated = await markAlertRead(alertId);

      setAlerts((current) =>
        current.map((alert) =>
          alert.id === updated.id ? updated : alert,
        ),
      );
    } catch (err) {
      console.error("Failed to mark alert as read", err);
      setError("Unable to mark the alert as read.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-900 p-2.5">
              <BellAlertIcon className="h-7 w-7 text-white" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Real-time Alerts
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Monitor security, sensor, movement, risk and system alerts.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadAlerts(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ArrowPathIcon
            className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Total Alerts"
          value={totalCount}
          icon={BellAlertIcon}
          iconClass="bg-slate-100 text-slate-700"
        />

        <SummaryCard
          title="Critical"
          value={criticalCount}
          icon={ShieldExclamationIcon}
          iconClass="bg-red-100 text-red-600"
        />

        <SummaryCard
          title="Warning"
          value={warningCount}
          icon={ExclamationTriangleIcon}
          iconClass="bg-amber-100 text-amber-600"
        />

        <SummaryCard
          title="Info"
          value={infoCount}
          icon={InformationCircleIcon}
          iconClass="bg-blue-100 text-blue-600"
        />

        <SummaryCard
          title="Unread"
          value={unreadCount}
          icon={ClockIcon}
          iconClass="bg-violet-100 text-violet-600"
        />
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Severity
            </label>

            <select
              value={severityFilter}
              onChange={(event) =>
                setSeverityFilter(
                  event.target.value as SeverityFilter,
                )
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Container
            </label>

            <select
              value={containerFilter}
              onChange={(event) =>
                setContainerFilter(event.target.value)
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >
              <option value="all">All Containers</option>

              {containerOptions.map((container) => (
                <option key={container} value={container}>
                  {container}
                </option>
              ))}
            </select>
          </div>

          <label className="flex h-[42px] cursor-pointer items-center gap-3 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(event) =>
                setUnreadOnly(event.target.checked)
              }
              className="h-4 w-4 rounded border-slate-300"
            />

            Unread only
          </label>

          <button
            type="button"
            onClick={() => {
              setSeverityFilter("all");
              setContainerFilter("all");
              setUnreadOnly(false);
            }}
            className="h-[42px] rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Recent Security Alerts
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {filteredAlerts.length} alert
              {filteredAlerts.length === 1 ? "" : "s"} shown
            </p>
          </div>

          <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            Auto-refresh: 15s
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
              Loading alerts...
            </div>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
            <div className="rounded-full bg-slate-100 p-4">
              <BellAlertIcon className="h-8 w-8 text-slate-400" />
            </div>

            <h3 className="mt-4 text-base font-semibold text-slate-900">
              No alerts found
            </h3>

            <p className="mt-1 max-w-md text-sm text-slate-500">
              No alerts match the current filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <TableHeader>Severity</TableHeader>
                  <TableHeader>Container</TableHeader>
                  <TableHeader>Alert</TableHeader>
                  <TableHeader>Time</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader align="right">Action</TableHeader>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredAlerts.map((alert) => {
                  const styles = severityClasses(alert.severity);
                  const containerCode =
                    extractContainerCode(alert);

                  return (
                    <tr
                      key={alert.id}
                      className={`transition hover:bg-slate-50 ${
                        !alert.is_read ? "bg-blue-50/30" : ""
                      }`}
                    >
                      {/* Severity */}
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex items-center gap-2">
                          <SeverityIcon
                            severity={alert.severity}
                            className={`h-5 w-5 ${styles.icon}`}
                          />

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${styles.badge}`}
                          >
                            {alert.severity}
                          </span>
                        </div>
                      </td>

                      {/* Container */}
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="font-mono text-sm font-semibold text-slate-900">
                          {containerCode}
                        </div>

                        {alert.container_id && (
                          <div
                            title={alert.container_id}
                            className="mt-1 max-w-[140px] truncate text-xs text-slate-400"
                          >
                            ID: {alert.container_id}
                          </div>
                        )}
                      </td>

                      {/* Alert */}
                      <td className="min-w-[320px] px-5 py-4">
                        <div className="flex items-start gap-3">
                          <CheckCircleIcon
                            className={`mt-0.5 h-5 w-5 ${
                              alert.is_read
                                ? "text-slate-300"
                                : "text-blue-500"
                            }`}
                          />

                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {formatAlertType(alert.type)}
                            </div>

                            <div className="mt-1 text-sm leading-6 text-slate-600">
                              {alert.message}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Time */}
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="text-sm font-medium text-slate-700">
                          {timeAgo(alert.created_at)}
                        </div>

                        <div className="mt-1 text-xs text-slate-400">
                          {formatDate(alert.created_at)}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="whitespace-nowrap px-5 py-4">
                        {alert.is_read ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            <CheckCircleIcon className="h-4 w-4" />
                            Read
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                            <span className="h-2 w-2 rounded-full bg-blue-600" />
                            Unread
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        {!alert.is_read && (
                          <button
                            type="button"
                            onClick={() =>
                              void handleMarkRead(alert.id)
                            }
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                          >
                            Mark as Read
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  iconClass,
}: {
  title: string;
  value: number;
  icon: typeof BellAlertIcon;
  iconClass: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>

        <div className={`rounded-xl p-3 ${iconClass}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function TableHeader({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}