import { useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  Battery100Icon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  ShieldExclamationIcon,
  SignalIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";

import {
  detectContainerAnomaly,
  fetchAnomalyContainers,
  fetchRecentAnomalies,
  type AnomalyContainer,
  type AnomalyResult,
  type RecentAnomaly,
} from "../../services/anomalyService";

function riskClasses(level: string) {
  switch (level.toLowerCase()) {
    case "high":
      return "border-red-200 bg-red-50 text-red-700";

    case "medium":
      return "border-amber-200 bg-amber-50 text-amber-700";

    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

function formatAnomalyType(value: string | null) {
  if (!value) return "None detected";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export function AnomalyDetectionPage() {
  const [containers, setContainers] = useState<AnomalyContainer[]>(
    [],
  );

  const [selectedContainerId, setSelectedContainerId] =
    useState("");

  const [result, setResult] = useState<AnomalyResult | null>(
    null,
  );

  const [recent, setRecent] = useState<RecentAnomaly[]>([]);

  const [loadingContainers, setLoadingContainers] = useState(true);
  const [loadingDetection, setLoadingDetection] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const [error, setError] = useState("");

  async function loadContainers() {
    try {
      setLoadingContainers(true);
      setError("");

      const rows = await fetchAnomalyContainers();

      setContainers(rows);

      if (!selectedContainerId && rows.length > 0) {
        setSelectedContainerId(rows[0].id);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ??
          err?.message ??
          "Unable to load containers.",
      );
    } finally {
      setLoadingContainers(false);
    }
  }

  async function loadRecent() {
    try {
      setLoadingRecent(true);

      const rows = await fetchRecentAnomalies(10);
      setRecent(rows);
    } catch {
      setRecent([]);
    } finally {
      setLoadingRecent(false);
    }
  }

  async function detect(containerId: string) {
    if (!containerId) return;

    try {
      setLoadingDetection(true);
      setError("");

      const data = await detectContainerAnomaly(containerId);

      setResult(data);

      await loadRecent();
    } catch (err: any) {
      setResult(null);

      setError(
        err?.response?.data?.detail ??
          err?.message ??
          "Unable to run anomaly detection.",
      );
    } finally {
      setLoadingDetection(false);
    }
  }

  useEffect(() => {
    void loadContainers();
    void loadRecent();
  }, []);

  useEffect(() => {
    if (selectedContainerId) {
      void detect(selectedContainerId);
    }
  }, [selectedContainerId]);

  async function handleRefresh() {
    await Promise.all([
      loadContainers(),
      loadRecent(),
      selectedContainerId
        ? detect(selectedContainerId)
        : Promise.resolve(),
    ]);
  }

  const selectedContainer = useMemo(
    () =>
      containers.find(
        (container) => container.id === selectedContainerId,
      ),
    [containers, selectedContainerId],
  );

  const statusIsAnomaly = result?.is_anomaly === true;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <ShieldExclamationIcon className="h-7 w-7 text-red-600" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Anomaly Detection
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Isolation Forest analysis of live container telemetry.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleRefresh()}
          disabled={
            loadingContainers ||
            loadingDetection ||
            loadingRecent
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowPathIcon className="h-5 w-5" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label
          htmlFor="anomaly-container"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Select Container
        </label>

        <div className="flex flex-col gap-3 lg:flex-row">
          <select
            id="anomaly-container"
            value={selectedContainerId}
            onChange={(event) =>
              setSelectedContainerId(event.target.value)
            }
            disabled={loadingContainers}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          >
            <option value="">
              {loadingContainers
                ? "Loading containers..."
                : "Select a container"}
            </option>

            {containers.map((container) => (
              <option key={container.id} value={container.id}>
                {container.container_code}
              </option>
            ))}
          </select>

          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <TruckIcon className="mr-2 h-5 w-5 text-slate-400" />
            {selectedContainer?.container_code ?? "No container selected"}
          </div>
        </div>
      </section>

      {loadingDetection && (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center text-sm text-slate-500 shadow-sm">
          Running Isolation Forest anomaly analysis...
        </div>
      )}

      {!loadingDetection && result && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div
              className={`rounded-2xl border p-5 shadow-sm ${
                statusIsAnomaly
                  ? "border-red-200 bg-red-50"
                  : "border-emerald-200 bg-emerald-50"
              }`}
            >
              <p className="text-sm font-medium text-slate-500">
                Detection Status
              </p>

              <div className="mt-3 flex items-center gap-3">
                {statusIsAnomaly ? (
                  <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
                ) : (
                  <CheckCircleIcon className="h-8 w-8 text-emerald-600" />
                )}

                <span
                  className={`text-2xl font-bold ${
                    statusIsAnomaly
                      ? "text-red-700"
                      : "text-emerald-700"
                  }`}
                >
                  {statusIsAnomaly ? "ANOMALY" : "NORMAL"}
                </span>
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Current telemetry classification.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Anomaly Score
              </p>

              <div className="mt-3 flex items-end gap-2">
                <span className="text-4xl font-bold text-slate-900">
                  {result.anomaly_score.toFixed(1)}
                </span>

                <span className="pb-1 text-sm text-slate-500">
                  / 100
                </span>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-slate-800 transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(0, result.anomaly_score),
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Risk & Confidence
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1.5 text-sm font-semibold uppercase ${riskClasses(
                    result.risk_level,
                  )}`}
                >
                  {result.risk_level}
                </span>

                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700">
                  {(result.confidence * 100).toFixed(0)}% confidence
                </span>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                Detected type:{" "}
                <span className="font-medium text-slate-700">
                  {formatAnomalyType(result.anomaly_type)}
                </span>
              </p>
            </div>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <SignalIcon className="h-6 w-6 text-primary-600" />

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Live Sensor State
                </h2>

                <p className="text-sm text-slate-500">
                  Latest telemetry used by the anomaly detector.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Temperature
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {result.sensor.temperature.toFixed(1)}°C
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Humidity
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {result.sensor.humidity.toFixed(1)}%
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <Battery100Icon className="h-5 w-5 text-slate-400" />

                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Battery
                  </p>
                </div>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {result.sensor.battery_level.toFixed(1)}%
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <MapPinIcon className="h-5 w-5 text-slate-400" />

                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    GPS
                  </p>
                </div>

                <p className="mt-2 text-lg font-bold text-slate-900">
                  {result.sensor.gps_valid
                    ? "VALID"
                    : "INVALID"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Door
                </p>

                <p className="mt-2 text-lg font-bold capitalize text-slate-900">
                  {result.sensor.door_status}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Movement
                </p>

                <p className="mt-2 text-lg font-bold capitalize text-slate-900">
                  {result.sensor.movement_status}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
              <ClockIcon className="h-4 w-4" />
              Reading: {formatDate(result.sensor.recorded_at)}
            </div>
          </section>
        </>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <ExclamationTriangleIcon className="h-6 w-6 text-amber-600" />

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Recent Anomalies
            </h2>

            <p className="text-sm text-slate-500">
              Latest anomaly events recorded by the detection service.
            </p>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          {loadingRecent ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Loading recent anomalies...
            </p>
          ) : recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No anomaly events recorded yet.
            </p>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3">Container</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Risk</th>
                  <th className="px-3 py-3">Confidence</th>
                  <th className="px-3 py-3">Detected</th>
                  <th className="px-3 py-3">State</th>
                </tr>
              </thead>

              <tbody>
                {recent.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-3 py-3 font-semibold text-slate-800">
                      {item.container_code}
                    </td>

                    <td className="px-3 py-3 text-slate-600">
                      {formatAnomalyType(item.anomaly_type)}
                    </td>

                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase ${riskClasses(
                          item.risk_level,
                        )}`}
                      >
                        {item.risk_level}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-slate-600">
                      {(item.confidence * 100).toFixed(0)}%
                    </td>

                    <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                      {formatDate(item.detected_at)}
                    </td>

                    <td className="px-3 py-3">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold uppercase text-slate-600">
                        {item.resolved ? "Resolved" : "Open"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}