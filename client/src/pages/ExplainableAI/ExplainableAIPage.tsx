import { useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  LightBulbIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { api } from "../../services/api";

type Container = {
  id: string;
  container_code: string;
  cargo_type?: string | null;
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

  final_score: number;
  risk_level: string;
  computed_at: string;

  shap_base_value: number | null;
  shap_probability: number | null;
  shap_contributions: ShapContribution[];
};

function formatValue(value: number | null) {
  return value === null || value === undefined
    ? "—"
    : value.toFixed(2);
}

function contributionClass(direction: string) {
  return direction === "increases_risk"
    ? {
        text: "text-red-300",
        bar: "bg-red-400",
        label: "Increases risk",
      }
    : {
        text: "text-emerald-300",
        bar: "bg-emerald-400",
        label: "Decreases risk",
      };
}

function riskClass(level: string) {
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

export function ExplainableAIPage() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [selectedContainerId, setSelectedContainerId] = useState("");
  const [assessment, setAssessment] =
    useState<RiskAssessment | null>(null);

  const [loadingContainers, setLoadingContainers] = useState(true);
  const [loadingAssessment, setLoadingAssessment] = useState(false);
  const [error, setError] = useState("");

  async function loadContainers() {
    try {
      setError("");
      setLoadingContainers(true);

      const response = await api.get<Container[]>("/containers");
      const data = response.data;

      setContainers(data);

      const preferred = data.find(
        (container) =>
          container.container_code === "MSKU700044"
      );

      setSelectedContainerId(
        preferred?.id ?? data[0]?.id ?? ""
      );
    } catch (err) {
      console.error("Failed to load containers:", err);
      setError("Unable to load containers.");
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
      console.error(
        "Failed to load explainable AI data:",
        err
      );

      setAssessment(null);
      setError(
        "Unable to load SHAP explanation for this container."
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

  const contributions = useMemo(() => {
    if (!assessment) {
      return [];
    }

    return [...assessment.shap_contributions].sort(
      (a, b) =>
        Math.abs(b.shap_value) -
        Math.abs(a.shap_value)
    );
  }, [assessment]);

  const maxAbsShap = useMemo(() => {
    if (contributions.length === 0) {
      return 1;
    }

    return Math.max(
      ...contributions.map((item) =>
        Math.abs(item.shap_value)
      ),
      0.0001
    );
  }, [contributions]);

  const increasingRisk = useMemo(
    () =>
      contributions.filter(
        (item) => item.direction === "increases_risk"
      ),
    [contributions]
  );

  const decreasingRisk = useMemo(
    () =>
      contributions.filter(
        (item) => item.direction !== "increases_risk"
      ),
    [contributions]
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-cyan-400">
            <SparklesIcon className="h-5 w-5" />

            <span className="text-xs font-semibold uppercase tracking-[0.2em]">
              Model Transparency
            </span>
          </div>

          <h1 className="text-2xl font-semibold text-white">
            Explainable AI
          </h1>

          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            SHAP-based explanation of why the AI risk model
            assigned a particular risk score to a container.
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

      {/* CONTAINER SELECTOR */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm font-medium text-white">
              Container
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Select a container to inspect its SHAP explanation.
            </div>
          </div>

          <select
            value={selectedContainerId}
            onChange={(event) =>
              setSelectedContainerId(event.target.value)
            }
            disabled={
              loadingContainers || containers.length === 0
            }
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500 lg:w-96"
          >
            {loadingContainers && (
              <option value="">Loading containers...</option>
            )}

            {!loadingContainers &&
              containers.length === 0 && (
                <option value="">
                  No containers found
                </option>
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

      {/* ERROR */}
      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* LOADING */}
      {loadingAssessment && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-10 text-center">
          <ArrowPathIcon className="mx-auto h-8 w-8 animate-spin text-cyan-400" />

          <p className="mt-3 text-sm text-slate-400">
            Loading SHAP explanation...
          </p>
        </div>
      )}

      {/* CONTENT */}
      {!loadingAssessment && assessment && (
        <>
          {/* SUMMARY */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <div className="text-sm text-slate-400">
                Container
              </div>

              <div className="mt-2 text-2xl font-semibold text-white">
                {assessment.container_code}
              </div>

              <div className="mt-2 text-xs text-slate-500">
                Latest available risk explanation
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <div className="text-sm text-slate-400">
                Final Risk Score
              </div>

              <div className="mt-2 text-4xl font-bold text-white">
                {assessment.final_score.toFixed(1)}
                <span className="ml-2 text-sm font-normal text-slate-500">
                  / 100
                </span>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-cyan-400"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(
                        100,
                        assessment.final_score
                      )
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div
              className={`rounded-2xl border p-6 ${riskClass(
                assessment.risk_level
              )}`}
            >
              <div className="text-sm opacity-75">
                Model Risk Level
              </div>

              <div className="mt-2 text-3xl font-bold uppercase">
                {assessment.risk_level}
              </div>

              <div className="mt-3 text-sm opacity-80">
                Computed{" "}
                {new Date(
                  assessment.computed_at
                ).toLocaleString()}
              </div>
            </div>
          </div>

          {/* MODEL OUTPUT */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="text-sm text-slate-400">
                SHAP Base Value
              </div>

              <div className="mt-2 text-2xl font-semibold text-white">
                {formatValue(assessment.shap_base_value)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="text-sm text-slate-400">
                SHAP Probability
              </div>

              <div className="mt-2 text-2xl font-semibold text-white">
                {formatValue(assessment.shap_probability)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="text-sm text-slate-400">
                Explanation Features
              </div>

              <div className="mt-2 text-2xl font-semibold text-white">
                {contributions.length}
              </div>
            </div>
          </div>

          {/* EMPTY SHAP STATE */}
          {contributions.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-12 text-center">
              <LightBulbIcon className="mx-auto h-10 w-10 text-slate-600" />

              <h2 className="mt-4 text-lg font-semibold text-white">
                No SHAP explanation available
              </h2>

              <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
                This risk assessment does not currently contain
                stored SHAP contributions.
              </p>
            </div>
          )}

          {/* SHAP CONTRIBUTIONS */}
          {contributions.length > 0 && (
            <>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <div className="mb-6 flex items-start gap-3">
                  <div className="rounded-xl bg-cyan-500/10 p-3">
                    <LightBulbIcon className="h-6 w-6 text-cyan-400" />
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      Why did the model produce this risk score?
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Each bar shows the magnitude of a feature's
                      SHAP contribution. Larger absolute values
                      indicate stronger model influence.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {contributions.map((item) => {
                    const meta = contributionClass(
                      item.direction
                    );

                    const width = Math.max(
                      5,
                      (Math.abs(item.shap_value) /
                        maxAbsShap) *
                        100
                    );

                    return (
                      <div
                        key={`${item.feature}-${item.shap_value}`}
                        className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="font-medium text-white">
                              {item.label}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              Feature: {item.feature}
                              {" · "}
                              Input value:{" "}
                              {item.feature_value ===
                              null
                                ? "—"
                                : item.feature_value.toFixed(
                                    2
                                  )}
                            </div>
                          </div>

                          <div
                            className={`text-sm font-semibold ${meta.text}`}
                          >
                            {item.shap_value >= 0
                              ? "+"
                              : ""}
                            {item.shap_value.toFixed(4)}
                          </div>
                        </div>

                        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className={`h-full rounded-full ${meta.bar}`}
                            style={{
                              width: `${width}%`,
                            }}
                          />
                        </div>

                        <div
                          className={`mt-2 text-xs font-medium ${meta.text}`}
                        >
                          {meta.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* DRIVER SUMMARY */}
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
                  <div className="flex items-center gap-2">
                    <ShieldCheckIcon className="h-5 w-5 text-red-300" />

                    <h2 className="font-semibold text-white">
                      Risk-Increasing Factors
                    </h2>
                  </div>

                  <div className="mt-4 space-y-3">
                    {increasingRisk.length === 0 ? (
                      <div className="text-sm text-slate-500">
                        No features currently increase risk.
                      </div>
                    ) : (
                      increasingRisk.map((item) => (
                        <div
                          key={`increase-${item.feature}`}
                          className="flex items-center justify-between rounded-xl border border-red-500/10 bg-slate-950/40 px-4 py-3"
                        >
                          <span className="text-sm text-slate-300">
                            {item.label}
                          </span>

                          <span className="text-sm font-semibold text-red-300">
                            +{item.shap_value.toFixed(4)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
                  <div className="flex items-center gap-2">
                    <ShieldCheckIcon className="h-5 w-5 text-emerald-300" />

                    <h2 className="font-semibold text-white">
                      Risk-Reducing Factors
                    </h2>
                  </div>

                  <div className="mt-4 space-y-3">
                    {decreasingRisk.length === 0 ? (
                      <div className="text-sm text-slate-500">
                        No features currently decrease risk.
                      </div>
                    ) : (
                      decreasingRisk.map((item) => (
                        <div
                          key={`decrease-${item.feature}`}
                          className="flex items-center justify-between rounded-xl border border-emerald-500/10 bg-slate-950/40 px-4 py-3"
                        >
                          <span className="text-sm text-slate-300">
                            {item.label}
                          </span>

                          <span className="text-sm font-semibold text-emerald-300">
                            {item.shap_value.toFixed(4)}
                          </span>
                        </div>
                      ))
                    )}
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