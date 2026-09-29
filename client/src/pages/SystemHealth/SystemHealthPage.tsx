import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ServerStackIcon,
  CircleStackIcon,
  CpuChipIcon,
  ShieldCheckIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

import {
  fetchSystemHealth,
  type HealthService,
  type HealthStatus,
  type SystemHealth,
} from "../../services/systemHealthService";

function statusLabel(status: HealthStatus): string {
  switch (status) {
    case "operational":
      return "Operational";
    case "degraded":
      return "Degraded";
    case "down":
      return "Down";
    default:
      return status;
  }
}

function statusClasses(status: HealthStatus): string {
  switch (status) {
    case "operational":
      return "bg-green-50 text-green-700 border-green-200";
    case "degraded":
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
    case "down":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
}

function StatusIcon({ status }: { status: HealthStatus }) {
  if (status === "operational") {
    return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
  }

  if (status === "degraded") {
    return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />;
  }

  return <XCircleIcon className="h-5 w-5 text-red-600" />;
}

function ServiceIcon({ service }: { service: string }) {
  const normalized = service.toLowerCase();

  if (normalized.includes("postgres")) {
    return <CircleStackIcon className="h-6 w-6" />;
  }

  if (
    normalized.includes("lstm") ||
    normalized.includes("xgboost") ||
    normalized.includes("isolation") ||
    normalized.includes("cargo")
  ) {
    return <CpuChipIcon className="h-6 w-6" />;
  }

  if (
    normalized.includes("security") ||
    normalized.includes("audit")
  ) {
    return <ShieldCheckIcon className="h-6 w-6" />;
  }

  return <ServerStackIcon className="h-6 w-6" />;
}

function ServiceCard({ service }: { service: HealthService }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
            <ServiceIcon service={service.service} />
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-gray-900">
              {service.service}
            </h3>

            <div className="mt-2 flex items-center gap-2">
              <StatusIcon status={service.status} />
              <span className="text-sm font-medium text-gray-700">
                {statusLabel(service.status)}
              </span>
            </div>
          </div>
        </div>

        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(
            service.status
          )}`}
        >
          {statusLabel(service.status)}
        </span>
      </div>

      <div className="mt-4 border-t border-gray-100 pt-4">
        <p className="text-sm leading-6 text-gray-600">
          {service.message}
        </p>

        {typeof service.response_ms === "number" && (
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
            <ClockIcon className="h-4 w-4" />
            Response time:{" "}
            <span className="font-semibold text-gray-700">
              {service.response_ms.toFixed(2)} ms
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function SystemHealthPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const loadHealth = useCallback(async (manual = false) => {
    if (manual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const data = await fetchSystemHealth();
      setHealth(data);
      setLastRefresh(new Date());
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to load system health information.";

      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

  const summary = useMemo(() => {
    if (!health) {
      return {
        operational: 0,
        degraded: 0,
        down: 0,
        total: 0,
      };
    }

    return health.services.reduce(
      (acc, service) => {
        acc.total += 1;

        if (service.status === "operational") {
          acc.operational += 1;
        } else if (service.status === "degraded") {
          acc.degraded += 1;
        } else if (service.status === "down") {
          acc.down += 1;
        }

        return acc;
      },
      {
        operational: 0,
        degraded: 0,
        down: 0,
        total: 0,
      }
    );
  }, [health]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-56 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-4 w-96 max-w-full animate-pulse rounded bg-gray-100" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-xl bg-gray-100"
            />
          ))}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-44 animate-pulse rounded-xl bg-gray-100"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <ServerStackIcon className="h-8 w-8 text-gray-700" />

            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              System Health
            </h1>
          </div>

          <p className="mt-2 max-w-3xl text-sm text-gray-600">
            Monitor the availability and response status of PortSynAI core
            backend, database, AI, inspection, and security services.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadHealth(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ArrowPathIcon
            className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <XCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

            <div>
              <h2 className="text-sm font-semibold text-red-800">
                System Health Request Failed
              </h2>

              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Overall status */}
      {health && (
        <>
          <div
            className={`rounded-2xl border p-6 ${statusClasses(
              health.status
            )}`}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
                  <StatusIcon status={health.status} />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider opacity-70">
                    Overall System Status
                  </p>

                  <h2 className="mt-1 text-2xl font-bold">
                    {statusLabel(health.status)}
                  </h2>

                  <p className="mt-1 text-sm opacity-80">
                    {summary.operational} of {summary.total} services are
                    operational.
                  </p>
                </div>
              </div>

              <div className="text-left md:text-right">
                <p className="text-xs font-semibold uppercase tracking-wider opacity-70">
                  Health Check Timestamp
                </p>

                <p className="mt-1 text-sm font-medium">
                  {new Date(health.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-500">
                Total Services
              </p>

              <p className="mt-2 text-3xl font-bold text-gray-900">
                {summary.total}
              </p>
            </div>

            <div className="rounded-xl border border-green-200 bg-green-50 p-5">
              <p className="text-sm font-medium text-green-700">
                Operational
              </p>

              <p className="mt-2 text-3xl font-bold text-green-800">
                {summary.operational}
              </p>
            </div>

            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5">
              <p className="text-sm font-medium text-yellow-700">
                Degraded
              </p>

              <p className="mt-2 text-3xl font-bold text-yellow-800">
                {summary.degraded}
              </p>
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50 p-5">
              <p className="text-sm font-medium text-red-700">
                Down
              </p>

              <p className="mt-2 text-3xl font-bold text-red-800">
                {summary.down}
              </p>
            </div>
          </div>

          {/* Service grid */}
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                Service Status
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Current health reported by the PortSynAI backend.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {health.services.map((service) => (
                <ServiceCard
                  key={`${service.service}-${service.status}`}
                  service={service}
                />
              ))}
            </div>
          </div>

          {/* Footer information */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 text-sm text-gray-500 md:flex-row md:items-center md:justify-between">
              <p>
                System health is retrieved from the live backend API.
              </p>

              <p>
                Last frontend refresh:{" "}
                <span className="font-medium text-gray-700">
                  {lastRefresh
                    ? lastRefresh.toLocaleTimeString()
                    : "Not available"}
                </span>
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}