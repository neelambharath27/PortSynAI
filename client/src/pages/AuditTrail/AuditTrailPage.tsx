import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  ClockIcon,
  DocumentMagnifyingGlassIcon,
  ServerStackIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";

import {
  fetchAuditLogs,
  type AuditLog,
} from "../../services/auditService";

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

  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days = Math.floor(hours / 24);

  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function formatLabel(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function metadataPreview(
  metadata: Record<string, unknown>,
): string {
  const entries = Object.entries(metadata);

  if (entries.length === 0) {
    return "No metadata";
  }

  return entries
    .slice(0, 3)
    .map(([key, value]) => {
      let formatted = "";

      if (
        typeof value === "object" &&
        value !== null
      ) {
        try {
          formatted = JSON.stringify(value);
        } catch {
          formatted = String(value);
        }
      } else {
        formatted = String(value);
      }

      return `${formatLabel(key)}: ${formatted}`;
    })
    .join(" • ");
}

function entityTone(entityType: string): string {
  const value = entityType.toLowerCase();

  if (value.includes("clearance")) {
    return "bg-emerald-100 text-emerald-700 border border-emerald-200";
  }

  if (value.includes("inspection")) {
    return "bg-amber-100 text-amber-700 border border-amber-200";
  }

  if (
    value.includes("risk") ||
    value.includes("anomaly") ||
    value.includes("prediction")
  ) {
    return "bg-violet-100 text-violet-700 border border-violet-200";
  }

  return "bg-slate-100 text-slate-700 border border-slate-200";
}

export function AuditTrailPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(
    async (showRefreshing = false) => {
      try {
        setError(null);

        if (showRefreshing) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const data = await fetchAuditLogs(100);
        setLogs(data);
      } catch (err) {
        console.error("Failed to load audit logs", err);
        setError(
          "Unable to load audit logs. Administrator access is required.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const actionOptions = useMemo(() => {
    return Array.from(
      new Set(logs.map((log) => log.action)),
    ).sort();
  }, [logs]);

  const entityOptions = useMemo(() => {
    return Array.from(
      new Set(logs.map((log) => log.entity_type)),
    ).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const actionMatches =
        actionFilter === "all" ||
        log.action === actionFilter;

      const entityMatches =
        entityFilter === "all" ||
        log.entity_type === entityFilter;

      return actionMatches && entityMatches;
    });
  }, [logs, actionFilter, entityFilter]);

  const todayCount = useMemo(() => {
    const today = new Date();

    return logs.filter((log) => {
      const date = new Date(log.created_at);

      return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
      );
    }).length;
  }, [logs]);

  const clearanceCount = useMemo(
    () =>
      logs.filter((log) =>
        log.entity_type
          .toLowerCase()
          .includes("clearance"),
      ).length,
    [logs],
  );

  const aiCount = useMemo(
    () =>
      logs.filter((log) => {
        const value = `${log.action} ${log.entity_type}`
          .toLowerCase();

        return (
          value.includes("risk") ||
          value.includes("anomaly") ||
          value.includes("prediction") ||
          value.includes("inspection")
        );
      }).length,
    [logs],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-slate-900 p-2.5">
            <DocumentMagnifyingGlassIcon className="h-7 w-7 text-white" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Audit Trail
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Review administrator audit events and system activity.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadLogs(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ArrowPathIcon
            className={`h-5 w-5 ${
              refreshing ? "animate-spin" : ""
            }`}
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

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Events"
          value={logs.length}
          icon={ServerStackIcon}
          iconClass="bg-slate-100 text-slate-700"
        />

        <SummaryCard
          title="Today"
          value={todayCount}
          icon={ClockIcon}
          iconClass="bg-blue-100 text-blue-600"
        />

        <SummaryCard
          title="Clearance Events"
          value={clearanceCount}
          icon={DocumentMagnifyingGlassIcon}
          iconClass="bg-emerald-100 text-emerald-600"
        />

        <SummaryCard
          title="AI / Security Events"
          value={aiCount}
          icon={UserCircleIcon}
          iconClass="bg-violet-100 text-violet-600"
        />
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Action
            </label>

            <select
              value={actionFilter}
              onChange={(event) =>
                setActionFilter(event.target.value)
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >
              <option value="all">All Actions</option>

              {actionOptions.map((action) => (
                <option key={action} value={action}>
                  {formatLabel(action)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Entity Type
            </label>

            <select
              value={entityFilter}
              onChange={(event) =>
                setEntityFilter(event.target.value)
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >
              <option value="all">All Entities</option>

              {entityOptions.map((entity) => (
                <option key={entity} value={entity}>
                  {formatLabel(entity)}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              setActionFilter("all");
              setEntityFilter("all");
            }}
            className="h-[42px] rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              System Audit Events
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {filteredLogs.length} event
              {filteredLogs.length === 1 ? "" : "s"} shown
            </p>
          </div>

          <span className="hidden rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 sm:inline-flex">
            Administrator Audit
          </span>
        </div>

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
              Loading audit logs...
            </div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
            <div className="rounded-full bg-slate-100 p-4">
              <DocumentMagnifyingGlassIcon className="h-8 w-8 text-slate-400" />
            </div>

            <h3 className="mt-4 text-base font-semibold text-slate-900">
              No audit events found
            </h3>

            <p className="mt-1 max-w-md text-sm text-slate-500">
              No audit records match the current filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <TableHeader>Time</TableHeader>
                  <TableHeader>User</TableHeader>
                  <TableHeader>Action</TableHeader>
                  <TableHeader>Entity</TableHeader>
                  <TableHeader>Entity ID</TableHeader>
                  <TableHeader>Details</TableHeader>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="text-sm font-medium text-slate-700">
                        {timeAgo(log.created_at)}
                      </div>

                      <div className="mt-1 text-xs text-slate-400">
                        {formatDate(log.created_at)}
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center gap-2">
                        <UserCircleIcon className="h-5 w-5 text-slate-400" />

                        <span className="font-mono text-xs text-slate-600">
                          {log.user_id
                            ? log.user_id
                            : "System"}
                        </span>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                        {formatLabel(log.action)}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${entityTone(
                          log.entity_type,
                        )}`}
                      >
                        {formatLabel(log.entity_type)}
                      </span>
                    </td>

                    <td className="max-w-[180px] px-5 py-4">
                      <span
                        title={log.entity_id ?? ""}
                        className="block truncate font-mono text-xs text-slate-500"
                      >
                        {log.entity_id ?? "—"}
                      </span>
                    </td>

                    <td className="min-w-[320px] px-5 py-4">
                      <span
                        title={metadataPreview(log.log_metadata)}
                        className="block max-w-[420px] truncate text-sm text-slate-600"
                      >
                        {metadataPreview(log.log_metadata)}
                      </span>
                    </td>
                  </tr>
                ))}
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
  icon: typeof ServerStackIcon;
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
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
      {children}
    </th>
  );
}