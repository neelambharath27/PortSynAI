import { useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../services/api";

type Container = {
  id: string;
  container_code: string;
  cargo_type?: string | null;
  status?: string | null;
};

type ShapContribution = {
  feature: string;
  label: string;
  feature_value: number | null;
  shap_value: number;
  direction: string;
};

type RiskAssessment = {
  id: string;
  container_id: string;
  container_code: string;

  gps_score: number;
  rfid_score: number;
  sensor_score: number;
  manifest_score: number;
  yolo_score: number;
  delay_score: number | null;
  lstm_anomaly_score: number;
  isolation_forest_score: number;

  final_score: number;
  risk_level: string;
  computed_at: string;

  shap_base_value: number | null;
  shap_probability: number | null;
  shap_contributions: ShapContribution[];
};

type RiskCardProps = {
  label: string;
  value: number | null;
};

function RiskCard({ label, value }: RiskCardProps) {
  const safeValue =
    typeof value === "number" ? Math.max(0, Math.min(100, value)) : null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="mb-2 text-sm text-slate-400">{label}</div>

      <div className="flex items-end justify-between gap-3">
        <div className="text-2xl font-semibold text-white">
          {safeValue === null ? "—" : safeValue.toFixed(1)}
        </div>

        <div className="text-xs text-slate-500">/ 100</div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-cyan-400 transition-all duration-500"
          style={{
            width: `${safeValue ?? 0}%`,
          }}
        />
      </div>
    </div>
  );
}

function riskLevelClass(level: string) {
  switch (level.toLowerCase()) {
    case "critical":
    case "high":
      return "border-red-500/30 bg-red-500/10 text-red-300";

    case "medium":
    case "warning":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";

    default:
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }
}

function decisionForScore(score: number) {
  if (score >= 70) {
    return {
      label: "HOLD",
      description: "Container requires immediate review.",
      icon: ShieldExclamationIcon,
      className:
        "border-red-500/30 bg-red-500/10 text-red-300",
    };
  }

  if (score >= 30) {
    return {
      label: "INSPECT",
      description: "Additional cargo inspection is required.",
      icon: ExclamationTriangleIcon,
      className:
        "border-amber-500/30 bg-amber-500/10 text-amber-300",
    };
  }

  return {
    label: "CLEAR",
    description: "Risk score is below the inspection threshold.",
    icon: ShieldCheckIcon,
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  };
}

export function RiskAssessmentPage() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [selectedContainerId, setSelectedContainerId] = useState("");
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);

  const [loadingContainers, setLoadingContainers] = useState(true);
  const [loadingAssessment, setLoadingAssessment] = useState(false);

  const [error, setError] = useState("");

  async function loadContainers() {
    try {
      setError("");
      setLoadingContainers(true);

      const response = await api.get<Container[]>("/containers");

      setContainers(response.data);

      if (response.data.length > 0) {
        setSelectedContainerId((current) => current || response.data[0].id);
      }
    } catch (err) {
      console.error("Failed to load containers:", err);
      setError("Unable to load containers from the backend.");
    } finally {
      setLoadingContainers(false);
    }
  }

  async function loadAssessment(containerId: string) {
    if (!containerId) {
      setAssessment(null);
      return;
    }

    try {
      setError("");
      setLoadingAssessment(true);

      const response = await api.get<RiskAssessment>(
        `/risk-assessment/${containerId}`
      );

      setAssessment(response.data);
    } catch (err) {
      console.error("Failed to load risk assessment:", err);
      setAssessment(null);
      setError(
        "No risk assessment could be loaded for this container."
      );
    } finally {
      setLoadingAssessment(false);
    }
  }

  useEffect(() => {
    void loadContainers();
  }, []);

  useEffect(() => {
    if (selectedContainerId) {
      void loadAssessment(selectedContainerId);
    }
  }, [selectedContainerId]);

  const decision = useMemo(
    () =>
      assessment
        ? decisionForScore(assessment.final_score)
        : null,
    [assessment]
  );

  const DecisionIcon = decision?.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-cyan-400">
            <SparklesIcon className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">
              AI Security Intelligence
            </span>
          </div>

          <h1 className="text-2xl font-semibold text-white">
            Risk Assessment
          </h1>

          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            XGBoost-based multimodal risk scoring using GPS, RFID,
            sensor, manifest, X-ray, LSTM, delay, and Isolation
            Forest signals.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            void loadContainers();

            if (selectedContainerId) {
              void loadAssessment(selectedContainerId);
            }
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-cyan-500/50 hover:text-cyan-300"
        >
          <ArrowPathIcon className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Container selector */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm font-medium text-white">
              Select Container
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Load the latest AI-generated risk assessment for a
              container.
            </div>
          </div>

          <select
            value={selectedContainerId}
            onChange={(event) =>
              setSelectedContainerId(event.target.value)
            }
            disabled={loadingContainers || containers.length === 0}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500 lg:w-96"
          >
            {loadingContainers && (
              <option value="">Loading containers...</option>
            )}

            {!loadingContainers && containers.length === 0 && (
              <option value="">No containers found</option>
            )}

            {!loadingContainers &&
              containers.map((container) => (
                <option
                  key={container.id}
                  value={container.id}
                >
                  {container.container_code}
                  {container.cargo_type
                    ? ` — ${container.cargo_type}`
                    : ""}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Loading */}
      {loadingAssessment && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-10 text-center">
          <ArrowPathIcon className="mx-auto h-8 w-8 animate-spin text-cyan-400" />

          <p className="mt-3 text-sm text-slate-400">
            Loading AI risk assessment...
          </p>
        </div>
      )}

      {/* Main assessment */}
      {!loadingAssessment && assessment && decision && (
        <>
          {/* Score summary */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <div className="text-sm text-slate-400">
                Container
              </div>

              <div className="mt-2 text-2xl font-semibold text-white">
                {assessment.container_code}
              </div>

              <div className="mt-2 text-xs text-slate-500">
                Latest assessment
              </div>

              <div className="mt-4 text-xs text-slate-400">
                Computed:{" "}
                {new Date(assessment.computed_at).toLocaleString()}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <div className="text-sm text-slate-400">
                Final Risk Score
              </div>

              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-5xl font-bold text-white">
                  {assessment.final_score.toFixed(1)}
                </span>

                <span className="text-sm text-slate-500">
                  / 100
                </span>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-cyan-400 transition-all duration-700"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(100, assessment.final_score)
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div
              className={`rounded-2xl border p-6 ${riskLevelClass(
                assessment.risk_level
              )}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm opacity-80">
                    Risk Level
                  </div>

                  <div className="mt-2 text-3xl font-bold uppercase">
                    {assessment.risk_level}
                  </div>
                </div>

                <CheckCircleIcon className="h-9 w-9 opacity-80" />
              </div>

              <div className="mt-4 text-sm">
                XGBoost composite score from multimodal evidence.
              </div>
            </div>
          </div>

          {/* Clearance decision */}
          <div
            className={`rounded-2xl border p-6 ${decision.className}`}
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                {DecisionIcon && (
                  <div className="rounded-xl bg-black/20 p-3">
                    <DecisionIcon className="h-7 w-7" />
                  </div>
                )}

                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] opacity-75">
                    AI Clearance Decision
                  </div>

                  <div className="mt-1 text-3xl font-bold">
                    {decision.label}
                  </div>

                  <div className="mt-1 text-sm opacity-80">
                    {decision.description}
                  </div>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <div className="text-xs opacity-70">
                  Thresholds
                </div>

                <div className="mt-1 text-sm font-medium">
                  CLEAR &lt; 30 · INSPECT 30–69.9 · HOLD ≥ 70
                </div>
              </div>
            </div>
          </div>

          {/* Input signals */}
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">
                Multimodal Risk Signals
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Individual inputs used by the risk engine.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <RiskCard
                label="GPS Risk"
                value={assessment.gps_score}
              />

              <RiskCard
                label="RFID Risk"
                value={assessment.rfid_score}
              />

              <RiskCard
                label="Sensor Risk"
                value={assessment.sensor_score}
              />

              <RiskCard
                label="Manifest Risk"
                value={assessment.manifest_score}
              />

              <RiskCard
                label="X-ray / YOLO Risk"
                value={assessment.yolo_score}
              />

              <RiskCard
                label="Delay Risk"
                value={assessment.delay_score}
              />

              <RiskCard
                label="LSTM Anomaly"
                value={assessment.lstm_anomaly_score}
              />

              <RiskCard
                label="Isolation Forest Anomaly"
                value={assessment.isolation_forest_score}
              />
            </div>
          </div>

          {/* SHAP */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-5">
              <div className="flex items-center gap-2">
                <SparklesIcon className="h-5 w-5 text-cyan-400" />

                <h2 className="text-lg font-semibold text-white">
                  Explainable AI — SHAP Contributions
                </h2>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Features with larger absolute SHAP values have a
                stronger influence on the model output.
              </p>
            </div>

            {assessment.shap_contributions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
                No SHAP contributions are available for this
                assessment.
              </div>
            ) : (
              <div className="space-y-3">
                {assessment.shap_contributions.map(
                  (contribution) => {
                    const positive =
                      contribution.direction ===
                      "increases_risk";

                    const magnitude = Math.min(
                      Math.abs(contribution.shap_value) * 45,
                      100
                    );

                    return (
                      <div
                        key={`${contribution.feature}-${contribution.shap_value}`}
                        className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="min-w-0">
                            <div className="font-medium text-white">
                              {contribution.label}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {contribution.feature}
                              {" · "}
                              Value:{" "}
                              {contribution.feature_value ===
                              null
                                ? "—"
                                : contribution.feature_value.toFixed(
                                    1
                                  )}
                            </div>
                          </div>

                          <div
                            className={`text-sm font-semibold ${
                              positive
                                ? "text-red-300"
                                : "text-emerald-300"
                            }`}
                          >
                            {positive ? "+" : ""}
                            {contribution.shap_value.toFixed(4)}
                          </div>
                        </div>

                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className={`h-full rounded-full ${
                              positive
                                ? "bg-red-400"
                                : "bg-emerald-400"
                            }`}
                            style={{
                              width: `${Math.max(
                                4,
                                magnitude
                              )}%`,
                            }}
                          />
                        </div>

                        <div className="mt-2 text-xs text-slate-500">
                          {positive
                            ? "Increases risk"
                            : "Decreases risk"}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Empty */}
      {!loadingAssessment &&
        !assessment &&
        !error &&
        !loadingContainers && (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center">
            <ShieldCheckIcon className="mx-auto h-10 w-10 text-slate-600" />

            <h2 className="mt-4 text-lg font-semibold text-white">
              No assessment selected
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Select a container to load its AI risk assessment.
            </p>
          </div>
        )}
    </div>
  );
}