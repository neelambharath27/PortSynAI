import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
} from "react-leaflet";
import {
  CubeTransparentIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  SignalIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../services/api";

interface DigitalTwin {
  container_id: string;
  container_code: string;
  ship_name?: string | null;

  rfid_status?: string | null;
  rfid_tag?: string | null;

  status: string;
  risk_level: string;
  health_score: number;

  cargo_type?: string | null;

  lat?: number | null;
  lng?: number | null;

  origin_port?: string | null;
  destination_port?: string | null;

  eta?: string | null;
  distance_remaining_km?: number | null;
}

interface HistoryPoint {
  temperature: number;
  humidity: number;
  battery_level: number;
  door_status: string;
  movement_status: string;
  gps_valid: boolean;
  health_status: string;
  recorded_at: string;
}

interface HistoryResponse {
  container_id: string;
  container_code: string;
  points: HistoryPoint[];
}

export function DigitalTwinPage() {
  const [twins, setTwins] = useState<DigitalTwin[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [history, setHistory] = useState<HistoryPoint[]>([]);

  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadDigitalTwins() {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get<{ twins: DigitalTwin[] }>(
        "/digital-twin",
      );

      const list = response.data.twins;

      setTwins(list);

      if (
        list.length > 0 &&
        (!selectedId ||
          !list.some(
            (item) => item.container_id === selectedId,
          ))
      ) {
        setSelectedId(list[0].container_id);
      }
    } catch (err) {
      console.error(
        "Failed to load Digital Twins:",
        err,
      );

      setError(
        "Unable to load Digital Twin data.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory(containerId: string) {
    if (!containerId) return;

    try {
      setHistoryLoading(true);

      const response = await api.get<HistoryResponse>(
        `/digital-twin/${containerId}/history`,
        {
          params: {
            hours: 6,
          },
        },
      );

      setHistory(response.data.points || []);
    } catch (err) {
      console.error(
        "Failed to load sensor history:",
        err,
      );

      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    loadDigitalTwins();
  }, []);

  useEffect(() => {
    if (!selectedId) return;

    const timer = setTimeout(() => {
      loadHistory(selectedId);
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedId]);

  /*
   * Automatically refresh the Digital Twin every 30 seconds.
   */
  useEffect(() => {
    const timer = setInterval(() => {
      loadDigitalTwins();

      if (selectedId) {
        loadHistory(selectedId);
      }
    }, 30000);

    return () => clearInterval(timer);
  }, [selectedId]);

  const selectedTwin = useMemo(
    () =>
      twins.find(
        (twin) =>
          twin.container_id === selectedId,
      ),
    [twins, selectedId],
  );

  const latestReading = useMemo(() => {
    if (history.length === 0) return null;

    return history[history.length - 1];
  }, [history]);

  const averageTemperature = useMemo(() => {
    if (history.length === 0) return null;

    return (
      history.reduce(
        (sum, point) =>
          sum + point.temperature,
        0,
      ) / history.length
    );
  }, [history]);

  const averageHumidity = useMemo(() => {
    if (history.length === 0) return null;

    return (
      history.reduce(
        (sum, point) =>
          sum + point.humidity,
        0,
      ) / history.length
    );
  }, [history]);

  const getHealthBand = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 75) return "Good";
    if (score >= 50) return "Warning";
    return "Critical";
  };

  const getHealthClass = (score: number) => {
    if (score >= 90) return "text-green-400";
    if (score >= 75) return "text-cyan-400";
    if (score >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  const getRiskClass = (risk: string) => {
    const value = risk.toLowerCase();

    if (
      value.includes("high") ||
      value.includes("critical")
    ) {
      return "border-red-500/30 bg-red-500/10 text-red-400";
    }

    if (
      value.includes("medium") ||
      value.includes("warning")
    ) {
      return "border-yellow-500/30 bg-yellow-500/10 text-yellow-400";
    }

    if (value.includes("no_data")) {
      return "border-white/10 bg-white/5 text-ink-500";
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

    if (
      value.includes("warning") ||
      value.includes("delay")
    ) {
      return "text-yellow-400";
    }

    return "text-green-400";
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="mx-auto h-8 w-8 animate-spin text-cyan-400" />

          <p className="mt-3 text-sm text-ink-500">
            Loading Digital Twin data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

        <button
          type="button"
          onClick={() => {
            loadDigitalTwins();

            if (selectedId) {
              loadHistory(selectedId);
            }
          }}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
        >
          <ArrowPathIcon
            className={`h-4 w-4 ${
              loading ? "animate-spin" : ""
            }`}
          />

          Refresh
        </button>
      </div>

      {/* ERROR */}
      {error && (
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
        </div>
      )}

      {/* EMPTY */}
      {!error && twins.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 bg-navy-900/40 p-10 text-center">

          <CubeTransparentIcon className="mx-auto h-10 w-10 text-ink-500" />

          <h3 className="mt-4 text-lg font-medium text-white">
            No Digital Twins Found
          </h3>

          <p className="mt-2 text-sm text-ink-500">
            No container Digital Twin records are currently available.
          </p>

        </div>
      )}

      {/* MAIN */}
      {!error && twins.length > 0 && (
        <>
          {/* CONTAINER SELECTOR */}
          <div className="rounded-2xl border border-white/10 bg-navy-900/40 p-5">

            <label className="block text-sm font-medium text-ink-500">
              Select Container
            </label>

            <select
              value={selectedId}
              onChange={(event) =>
                setSelectedId(event.target.value)
              }
              className="mt-2 w-full max-w-xl rounded-lg border border-white/10 bg-navy-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
            >
              {twins.map((twin) => (
                <option
                  key={twin.container_id}
                  value={twin.container_id}
                >
                  {twin.container_code}

                  {twin.ship_name
                    ? ` — ${twin.ship_name}`
                    : ""}
                </option>
              ))}
            </select>

          </div>

          {selectedTwin && (
            <>
              {/* SELECTED CONTAINER */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">

                <InfoCard
                  title="Container"
                  value={selectedTwin.container_code}
                  icon={
                    <CubeTransparentIcon className="h-5 w-5 text-cyan-400" />
                  }
                />

                <InfoCard
                  title="Ship"
                  value={selectedTwin.ship_name || "—"}
                  icon={
                    <SignalIcon className="h-5 w-5 text-cyan-400" />
                  }
                />

                <InfoCard
                  title="Status"
                  value={selectedTwin.status}
                  valueClass={getStatusClass(
                    selectedTwin.status,
                  )}
                  icon={
                    <CheckCircleIcon className="h-5 w-5 text-green-400" />
                  }
                />

                <InfoCard
                  title="Risk"
                  value={selectedTwin.risk_level}
                  icon={
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                  }
                />

              </div>

              {/* HEALTH */}
              <div className="rounded-2xl border border-white/10 bg-navy-900/40 p-6">

                <div className="flex items-center justify-between">

                  <div>
                    <h2 className="font-display text-lg font-semibold text-white">
                      Digital Twin Health
                    </h2>

                    <p className="mt-1 text-sm text-ink-500">
                      Overall container health condition.
                    </p>
                  </div>

                  <span
                    className={`text-lg font-semibold ${getHealthClass(
                      selectedTwin.health_score,
                    )}`}
                  >
                    {getHealthBand(
                      selectedTwin.health_score,
                    )}
                  </span>

                </div>

                <div className="mt-6 flex items-end gap-2">

                  <span
                    className={`text-5xl font-semibold ${getHealthClass(
                      selectedTwin.health_score,
                    )}`}
                  >
                    {selectedTwin.health_score.toFixed(
                      1,
                    )}
                  </span>

                  <span className="mb-2 text-ink-500">
                    / 100
                  </span>

                </div>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">

                  <div
                    className="h-full rounded-full bg-cyan-400 transition-all duration-500"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(
                          100,
                          selectedTwin.health_score,
                        ),
                      )}%`,
                    }}
                  />

                </div>

                <div className="mt-4">

                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getRiskClass(
                      selectedTwin.risk_level,
                    )}`}
                  >
                    Risk: {selectedTwin.risk_level}
                  </span>

                </div>

              </div>

              {/* LIVE MAP */}
              <div className="rounded-2xl border border-white/10 bg-navy-900/40 p-6">

                <div className="mb-4">

                  <h2 className="font-display text-lg font-semibold text-white">
                    Live Container Map
                  </h2>

                  <p className="mt-1 text-sm text-ink-500">
                    Current container position and voyage information.
                  </p>

                </div>

                {selectedTwin.lat != null &&
                selectedTwin.lng != null ? (
                  <MapContainer
                    center={[
                      selectedTwin.lat,
                      selectedTwin.lng,
                    ]}
                    zoom={5}
                    scrollWheelZoom={false}
                    className="h-[400px] w-full rounded-xl"
                  >

                    <TileLayer
                      attribution="&copy; OpenStreetMap contributors"
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <Marker
                      position={[
                        selectedTwin.lat,
                        selectedTwin.lng,
                      ]}
                    >

                      <Popup>

                        <strong>
                          {selectedTwin.container_code}
                        </strong>

                        <br />

                        Ship:{" "}
                        {selectedTwin.ship_name ||
                          "Unknown"}

                        <br />

                        Status:{" "}
                        {selectedTwin.status}

                      </Popup>

                    </Marker>

                  </MapContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center rounded-xl border border-dashed border-white/10">

                    <p className="text-sm text-ink-500">
                      Location data unavailable.
                    </p>

                  </div>
                )}

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">

                  <div className="rounded-xl bg-white/[0.03] p-4">

                    <p className="text-xs text-ink-500">
                      Destination
                    </p>

                    <p className="mt-1 font-medium text-white">
                      {selectedTwin.destination_port ||
                        "Unknown"}
                    </p>

                  </div>

                  <div className="rounded-xl bg-white/[0.03] p-4">

                    <p className="text-xs text-ink-500">
                      Distance Remaining
                    </p>

                    <p className="mt-1 font-medium text-white">

                      {selectedTwin.distance_remaining_km !=
                      null
                        ? `${selectedTwin.distance_remaining_km.toFixed(
                            1,
                          )} km`
                        : "N/A"}

                    </p>

                  </div>

                  <div className="rounded-xl bg-white/[0.03] p-4">

                    <p className="text-xs text-ink-500">
                      ETA
                    </p>

                    <p className="mt-1 font-medium text-white">

                      {selectedTwin.eta
                        ? new Date(
                            selectedTwin.eta,
                          ).toLocaleString()
                        : "N/A"}

                    </p>

                  </div>

                </div>

              </div>

              {/* SENSOR CARDS */}
              <div>

                <div className="mb-4">

                  <h2 className="font-display text-lg font-semibold text-white">
                    Live Sensor Status
                  </h2>

                  <p className="mt-1 text-sm text-ink-500">
                    Latest available sensor telemetry.
                  </p>

                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

                  <SensorCard
                    title="Temperature"
                    value={
                      latestReading
                        ? `${latestReading.temperature.toFixed(
                            1,
                          )} °C`
                        : "No data"
                    }
                    description={
                      averageTemperature !== null
                        ? `24h avg: ${averageTemperature.toFixed(
                            1,
                          )} °C`
                        : "No historical data"
                    }
                  />

                  <SensorCard
                    title="Humidity"
                    value={
                      latestReading
                        ? `${latestReading.humidity.toFixed(
                            1,
                          )} %`
                        : "No data"
                    }
                    description={
                      averageHumidity !== null
                        ? `24h avg: ${averageHumidity.toFixed(
                            1,
                          )} %`
                        : "No historical data"
                    }
                  />

                  <SensorCard
                    title="Battery"
                    value={
                      latestReading
                        ? `${latestReading.battery_level.toFixed(
                            1,
                          )} %`
                        : "No data"
                    }
                    description="Latest sensor reading"
                  />

                  <SensorCard
                    title="Door"
                    value={
                      latestReading
                        ? latestReading.door_status
                        : "No data"
                    }
                    description="Container door status"
                  />

                  <SensorCard
                    title="GPS"
                    value={
                      latestReading
                        ? latestReading.gps_valid
                          ? "Valid"
                          : "Invalid"
                        : "No data"
                    }
                    description="GPS signal validity"
                  />

                  <SensorCard
                    title="Movement"
                    value={
                      latestReading
                        ? latestReading.movement_status
                        : "No data"
                    }
                    description="Container movement state"
                  />

                  {/* RFID */}
                  <SensorCard
                    title="RFID"
                    value={
                      selectedTwin.rfid_status ===
                      "active"
                        ? "Active"
                        : "Not available"
                    }
                    description={
                      selectedTwin.rfid_tag
                        ? `Tag: ${selectedTwin.rfid_tag}`
                        : "RFID tracking data"
                    }
                  />

                </div>

              </div>

              {/* SENSOR HISTORY */}
              <div className="rounded-2xl border border-white/10 bg-navy-900/40 p-6">

                <div className="flex items-center justify-between">

                  <div>

                    <h2 className="font-display text-lg font-semibold text-white">
                      Sensor History
                    </h2>

                    <p className="mt-1 text-sm text-ink-500">
                      Historical readings from the last 24 hours.
                    </p>

                  </div>

                  {historyLoading && (
                    <ArrowPathIcon className="h-5 w-5 animate-spin text-cyan-400" />
                  )}

                </div>

                {history.length === 0 ? (
                  <div className="mt-6 rounded-xl border border-dashed border-white/10 p-8 text-center">

                    <p className="text-sm text-ink-500">
                      No sensor history available.
                    </p>

                  </div>
                ) : (
                  <div className="mt-6 space-y-5">

                    <HistoryBar
                      title="Temperature"
                      values={history.map(
                        (point) =>
                          point.temperature,
                      )}
                      unit="°C"
                    />

                    <HistoryBar
                      title="Humidity"
                      values={history.map(
                        (point) =>
                          point.humidity,
                      )}
                      unit="%"
                    />

                    <HistoryBar
                      title="Battery"
                      values={history.map(
                        (point) =>
                          point.battery_level,
                      )}
                      unit="%"
                    />

                  </div>
                )}

              </div>

              {/* LAST READING */}
              {latestReading && (
                <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">

                  <div className="flex items-center gap-3">

                    <SignalIcon className="h-6 w-6 text-cyan-400" />

                    <div>

                      <p className="font-medium text-white">
                        Latest sensor update
                      </p>

                      <p className="mt-1 text-sm text-ink-500">
                        {new Date(
                          latestReading.recorded_at,
                        ).toLocaleString()}
                      </p>

                    </div>

                  </div>

                </div>
              )}

              {/* LIVE STATUS */}
              <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-5">

                <div className="flex items-center gap-3">

                  <span className="relative flex h-3 w-3">

                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />

                    <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />

                  </span>

                  <div>

                    <p className="font-medium text-green-400">
                      Live monitoring active
                    </p>

                    <p className="mt-1 text-sm text-ink-500">
                      Digital Twin data refreshes automatically
                      every 10 seconds.
                    </p>

                  </div>

                </div>

              </div>

            </>
          )}

        </>
      )}

    </div>
  );
}

function InfoCard({
  title,
  value,
  icon,
  valueClass = "text-white",
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-navy-900/40 p-5">

      <div className="flex items-center gap-3">

        {icon}

        <p className="text-sm text-ink-500">
          {title}
        </p>

      </div>

      <p
        className={`mt-3 truncate text-lg font-semibold capitalize ${valueClass}`}
      >
        {value}
      </p>

    </div>
  );
}

function SensorCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-navy-900/40 p-5">

      <p className="text-sm text-ink-500">
        {title}
      </p>

      <p className="mt-3 text-2xl font-semibold text-white">
        {value}
      </p>

      <p className="mt-2 text-xs text-ink-500">
        {description}
      </p>

    </div>
  );
}

function HistoryBar({
  title,
  values,
  unit,
}: {
  title: string;
  values: number[];
  unit: string;
}) {
  if (values.length === 0) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const latest = values[values.length - 1];

  const range = max - min || 1;

  return (
    <div>

      <div className="mb-2 flex items-center justify-between">

        <span className="text-sm font-medium text-white">
          {title}
        </span>

        <span className="text-sm text-cyan-400">
          {latest.toFixed(1)} {unit}
        </span>

      </div>

      <div className="flex h-16 items-end gap-[2px] overflow-hidden rounded-lg bg-white/[0.03] p-2">

        {values.slice(-30).map(
          (value, index) => {
            const height =
              15 +
              ((value - min) / range) *
                70;

            return (
              <div
                key={`${title}-${index}`}
                className="min-w-[3px] flex-1 rounded-t bg-cyan-400/70 transition-all hover:bg-cyan-300"
                style={{
                  height: `${height}%`,
                }}
                title={`${value.toFixed(
                  2,
                )} ${unit}`}
              />
            );
          },
        )}

      </div>

      <div className="mt-1 flex justify-between text-[10px] text-ink-500">

        <span>
          Min {min.toFixed(1)}
        </span>

        <span>
          Max {max.toFixed(1)}
        </span>

      </div>

    </div>
  );
}