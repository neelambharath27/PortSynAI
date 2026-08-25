import { useEffect, useState } from "react";
import {
  CubeTransparentIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../services/api";

interface DigitalTwin {
  container_id: string;
  container_code: string;
  ship_name: string;
  status: string;
  risk_level: string;
  health_score: number;
}

export function DigitalTwinPage() {
  const [twins, setTwins] = useState<DigitalTwin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDigitalTwins() {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get<{ twins: DigitalTwin[] }>("/digital-twin");

      setTwins(response.data.twins);
    } catch (err) {
      console.error("Failed to load Digital Twins:", err);
      setError("Unable to load Digital Twin data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDigitalTwins();
  }, []);

  const getRiskClass = (risk: string) => {
    const value = risk.toLowerCase();

    if (value.includes("high") || value.includes("critical")) {
      return "border-red-500/30 bg-red-500/10 text-red-400";
    }

    if (value.includes("medium")) {
      return "border-yellow-500/30 bg-yellow-500/10 text-yellow-400";
    }

    return "border-green-500/30 bg-green-500/10 text-green-400";
  };

  const getStatusClass = (status: string) => {
    const value = status.toLowerCase();

    if (
      value.includes("alert") ||
      value.includes("critical") ||
      value.includes("danger")
    ) {
      return "text-red-400";
    }

    if (value.includes("warning") || value.includes("delay")) {
      return "text-yellow-400";
    }

    return "text-green-400";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10">
              <CubeTransparentIcon className="h-6 w-6 text-cyan-400" />
            </div>

            <div>
              <h1 className="font-display text-2xl font-semibold text-white">
                Digital Twin
              </h1>

              <p className="mt-1 text-sm text-ink-500">
                Live digital representation of monitored containers.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={loadDigitalTwins}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowPathIcon
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-white/10 bg-navy-900/40">
          <div className="text-center">
            <ArrowPathIcon className="mx-auto h-8 w-8 animate-spin text-cyan-400" />
            <p className="mt-3 text-sm text-ink-500">
              Loading Digital Twin data...
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />

            <div>
              <h3 className="font-medium text-red-400">
                Digital Twin unavailable
              </h3>

              <p className="mt-1 text-sm text-ink-500">
                {error}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadDigitalTwins}
            className="mt-4 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-navy-950 hover:bg-cyan-400"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && twins.length === 0 && (
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-navy-900/40">
          <div className="text-center">
            <CubeTransparentIcon className="mx-auto h-10 w-10 text-ink-500" />

            <h3 className="mt-4 text-lg font-medium text-white">
              No Digital Twins Found
            </h3>

            <p className="mt-2 text-sm text-ink-500">
              No container Digital Twin records are currently available.
            </p>
          </div>
        </div>
      )}

      {/* Digital Twin data */}
      {!loading && !error && twins.length > 0 && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-navy-900/40 p-5">
              <p className="text-sm text-ink-500">Total Containers</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {twins.length}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-navy-900/40 p-5">
              <p className="text-sm text-ink-500">Healthy Containers</p>
              <p className="mt-2 text-3xl font-semibold text-green-400">
                {
                  twins.filter(
                    (twin) =>
                      twin.health_score >= 80 &&
                      !twin.risk_level.toLowerCase().includes("high") &&
                      !twin.risk_level.toLowerCase().includes("critical"),
                  ).length
                }
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-navy-900/40 p-5">
              <p className="text-sm text-ink-500">High Risk</p>
              <p className="mt-2 text-3xl font-semibold text-red-400">
                {
                  twins.filter((twin) => {
                    const risk = twin.risk_level.toLowerCase();
                    return (
                      risk.includes("high") || risk.includes("critical")
                    );
                  }).length
                }
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-navy-900/40">
            <div className="border-b border-white/10 px-6 py-4">
              <h2 className="font-display text-lg font-semibold text-white">
                Container Digital Twins
              </h2>

              <p className="mt-1 text-sm text-ink-500">
                Real-time container health, status and risk information.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px]">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-ink-500">
                    <th className="px-6 py-4 font-medium">
                      Container
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Ship
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Status
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Risk
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Health
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {twins.map((twin) => (
                    <tr
                      key={twin.container_id}
                      className="border-b border-white/5 transition hover:bg-white/[0.03]"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">
                          {twin.container_code}
                        </div>

                        <div className="mt-1 text-xs text-ink-500">
                          {twin.container_id}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm text-ink-500">
                        {twin.ship_name || "—"}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <CheckCircleIcon
                            className={`h-5 w-5 ${getStatusClass(
                              twin.status,
                            )}`}
                          />

                          <span
                            className={`text-sm font-medium ${getStatusClass(
                              twin.status,
                            )}`}
                          >
                            {twin.status || "Unknown"}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getRiskClass(
                            twin.risk_level,
                          )}`}
                        >
                          {twin.risk_level || "Unknown"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-cyan-400 transition-all"
                              style={{
                                width: `${Math.max(
                                  0,
                                  Math.min(100, twin.health_score),
                                )}%`,
                              }}
                            />
                          </div>

                          <span className="min-w-[40px] text-sm font-medium text-white">
                            {twin.health_score}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}