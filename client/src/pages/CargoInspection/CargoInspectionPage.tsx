import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  ShieldExclamationIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

import { api } from "../../services/api";

import {
  downloadInspectionReport,
  fetchInspection,
  fetchInspectionHistory,
  fetchInspectionSummary,
  inspectionImageUrl,
  uploadInspectionImage,
} from "../../services/inspectionService";

import type {
  InspectionListItem,
  InspectionOut,
  InspectionSummary,
  InspectionStatus,
  ThreatLevel,
} from "../../types/inspection";

type Container = {
  id: string;
  container_code: string;
  cargo_type?: string | null;
};

function statusClass(status: InspectionStatus) {
  switch (status) {
    case "passed":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";

    case "flagged":
      return "border-red-500/30 bg-red-500/10 text-red-300";

    default:
      return "border-cyan-500/30 bg-cyan-500/10 text-cyan-300";
  }
}

function statusLabel(status: InspectionStatus) {
  switch (status) {
    case "passed":
      return "PASSED";

    case "flagged":
      return "FLAGGED";

    default:
      return "PROCESSING";
  }
}

function threatClass(level: ThreatLevel) {
  switch (level) {
    case "critical":
      return "border-red-700/40 bg-red-700/10 text-red-200";

    case "high":
      return "border-red-500/30 bg-red-500/10 text-red-300";

    case "medium":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";

    case "low":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";

    default:
      return "border-slate-700 bg-slate-900 text-slate-300";
  }
}

function threatLabel(level: ThreatLevel) {
  return level.toUpperCase();
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: typeof EyeIcon;
}) {
  const Icon = icon;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-400">{label}</div>

        <div className="rounded-xl bg-cyan-500/10 p-2">
          <Icon className="h-5 w-5 text-cyan-400" />
        </div>
      </div>

      <div className="mt-3 text-3xl font-bold text-white">
        {value}
      </div>
    </div>
  );
}

export function CargoInspectionPage() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [selectedContainerId, setSelectedContainerId] = useState("");

  const [summary, setSummary] =
    useState<InspectionSummary | null>(null);

  const [history, setHistory] = useState<InspectionListItem[]>(
    []
  );

  const [selectedInspection, setSelectedInspection] =
    useState<InspectionOut | null>(null);

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [loadingInspection, setLoadingInspection] =
    useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function loadContainers() {
    try {
      const response = await api.get<Container[]>("/containers");

      setContainers(response.data);

      if (response.data.length > 0) {
        setSelectedContainerId((current) =>
          current || response.data[0].id
        );
      }
    } catch (err) {
      console.error("Failed to load containers:", err);
      setError("Unable to load containers.");
    }
  }

  async function loadInspection(id: string) {
    try {
      setError("");
      setLoadingInspection(true);

      const result = await fetchInspection(id);

      setSelectedInspection(result);
    } catch (err) {
      console.error("Failed to load inspection:", err);
      setError("Unable to load the selected inspection.");
    } finally {
      setLoadingInspection(false);
    }
  }

  async function loadDashboardData() {
    try {
      setError("");
      setLoading(true);

      const [summaryData, historyData] =
        await Promise.all([
          fetchInspectionSummary(),
          fetchInspectionHistory({
            limit: 50,
          }),
        ]);

      setSummary(summaryData);
      setHistory(historyData);

      if (!selectedInspection && historyData.length > 0) {
        await loadInspection(historyData[0].id);
      }
    } catch (err) {
      console.error(
        "Failed to load cargo inspection dashboard:",
        err
      );

      setError(
        "Unable to load cargo inspection data from the backend."
      );
    } finally {
      setLoading(false);
    }
  }

  async function refreshInspection(
    inspectionId: string,
    attempts = 0
  ) {
    if (attempts >= 20) {
      setMessage(
        "Inspection is still processing. Refresh the page to check again."
      );
      return;
    }

    try {
      const result = await fetchInspection(inspectionId);

      setSelectedInspection(result);

      if (result.status === "pending") {
        window.setTimeout(() => {
          void refreshInspection(
            inspectionId,
            attempts + 1
          );
        }, 1000);

        return;
      }

      const [summaryData, historyData] =
        await Promise.all([
          fetchInspectionSummary(),
          fetchInspectionHistory({
            limit: 50,
          }),
        ]);

      setSummary(summaryData);
      setHistory(historyData);

      setMessage(
        result.status === "flagged"
          ? "Inspection completed: cargo requires attention."
          : "Inspection completed successfully."
      );
    } catch (err) {
      console.error(
        "Failed to refresh inspection:",
        err
      );

      setError(
        "Unable to retrieve the latest inspection status."
      );
    }
  }

  async function handleUpload() {
    setError("");
    setMessage("");

    if (!selectedContainerId) {
      setError("Please select a container first.");
      return;
    }

    if (!selectedFile) {
      setError("Please choose an X-ray image.");
      return;
    }

    try {
      setUploading(true);

      const result = await uploadInspectionImage(
        selectedContainerId,
        selectedFile
      );

      setSelectedInspection(result);
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setMessage(
        "X-ray uploaded. AI inspection processing has started."
      );

      void refreshInspection(result.id);
    } catch (err) {
      console.error("X-ray upload failed:", err);

      setError(
        "X-ray upload failed. Check the image format and backend logs."
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleRefresh() {
    setMessage("");

    await Promise.all([
      loadContainers(),
      loadDashboardData(),
    ]);

    if (selectedInspection) {
      await loadInspection(selectedInspection.id);
    }
  }

  useEffect(() => {
    void loadContainers();
    void loadDashboardData();
  }, []);

  const selectedContainerCode = useMemo(() => {
    return (
      containers.find(
        (container) =>
          container.id === selectedContainerId
      )?.container_code ?? "—"
    );
  }, [containers, selectedContainerId]);

  const imageUrl = inspectionImageUrl(
    selectedInspection?.image_path ?? null
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-cyan-400">
            <SparklesIcon className="h-5 w-5" />

            <span className="text-xs font-semibold uppercase tracking-[0.2em]">
              AI Cargo Security
            </span>
          </div>

          <h1 className="text-2xl font-semibold text-white">
            Cargo Inspection
          </h1>

          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            Upload an X-ray image, run the cargo inspection
            pipeline, review detected objects, and generate the
            inspection report.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleRefresh()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-cyan-500/50 hover:text-cyan-300"
        >
          <ArrowPathIcon className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* SUMMARY */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total Inspections"
            value={summary.total_inspections}
            icon={EyeIcon}
          />

          <SummaryCard
            label="Passed"
            value={summary.passed}
            icon={CheckCircleIcon}
          />

          <SummaryCard
            label="Flagged"
            value={summary.flagged}
            icon={ShieldExclamationIcon}
          />

          <SummaryCard
            label="Pending"
            value={summary.pending}
            icon={ArrowPathIcon}
          />
        </div>
      )}

      {/* THREAT DISTRIBUTION */}
      {summary && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">
              Threat-Level Distribution
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Current inspection results grouped by detected
              threat level.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["none", "None"],
              ["low", "Low"],
              ["medium", "Medium"],
              ["high", "High"],
              ["critical", "Critical"],
            ].map(([key, label]) => (
              <div
                key={key}
                className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
              >
                <div className="text-sm text-slate-400">
                  {label}
                </div>

                <div className="mt-2 text-2xl font-semibold text-white">
                  {summary.by_threat_level[key] ?? 0}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* UPLOAD */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-white">
            New X-ray Inspection
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Choose a container and upload a JPEG, PNG, or WebP
            X-ray image.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Container
            </label>

            <select
              value={selectedContainerId}
              onChange={(event) =>
                setSelectedContainerId(event.target.value)
              }
              disabled={containers.length === 0}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500 disabled:opacity-50"
            >
              {containers.length === 0 ? (
                <option value="">
                  Loading containers...
                </option>
              ) : (
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
                ))
              )}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              X-ray Image
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) =>
                setSelectedFile(
                  event.target.files?.[0] ?? null
                )
              }
              className="block w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-500/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-cyan-300"
            />
          </div>

          <button
            type="button"
            disabled={uploading}
            onClick={() => void handleUpload()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? (
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
            ) : (
              <ArrowUpTrayIcon className="h-5 w-5" />
            )}

            {uploading
              ? "Uploading..."
              : "Inspect Cargo"}
          </button>
        </div>

        {selectedFile && (
          <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-sm text-cyan-300">
            Selected: {selectedFile.name}
          </div>
        )}
      </div>

      {/* MESSAGES */}
      {message && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-300">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* MAIN INSPECTION */}
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* IMAGE */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                X-ray Inspection View
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Container: {selectedContainerCode}
              </p>
            </div>

            {selectedInspection && (
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(
                  selectedInspection.status
                )}`}
              >
                {statusLabel(
                  selectedInspection.status
                )}
              </span>
            )}
          </div>

          <div className="flex min-h-[420px] items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
            {loadingInspection ? (
              <div className="text-center">
                <ArrowPathIcon className="mx-auto h-8 w-8 animate-spin text-cyan-400" />

                <p className="mt-3 text-sm text-slate-500">
                  Loading inspection...
                </p>
              </div>
            ) : imageUrl ? (
              <div className="relative w-full overflow-hidden">
                <img
                  src={imageUrl}
                  alt="Cargo X-ray inspection"
                  className="mx-auto block max-h-[650px] max-w-full object-contain"
                />

                {selectedInspection?.detected_objects.map(
                  (detection, index) => (
                    <div
                      key={`${detection.label}-${index}`}
                      className="pointer-events-none absolute border-2 border-red-400"
                      style={{
                        left: `${detection.bbox[0] * 100}%`,
                        top: `${detection.bbox[1] * 100}%`,
                        width: `${detection.bbox[2] * 100}%`,
                        height: `${detection.bbox[3] * 100}%`,
                      }}
                    >
                      <div className="absolute -top-6 left-0 whitespace-nowrap rounded bg-red-500 px-2 py-1 text-[10px] font-semibold text-white">
                        {detection.label}{" "}
                        {(
                          detection.confidence * 100
                        ).toFixed(0)}
                        %
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="px-6 text-center">
                <MagnifyingGlassIcon className="mx-auto h-10 w-10 text-slate-700" />

                <h3 className="mt-4 font-medium text-white">
                  No X-ray image selected
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Select an existing inspection or upload an
                  X-ray image.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RESULT */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-lg font-semibold text-white">
              Inspection Result
            </h2>

            {selectedInspection ? (
              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                  <span className="text-sm text-slate-400">
                    Status
                  </span>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(
                      selectedInspection.status
                    )}`}
                  >
                    {statusLabel(
                      selectedInspection.status
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                  <span className="text-sm text-slate-400">
                    Threat Level
                  </span>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${threatClass(
                      selectedInspection.threat_level
                    )}`}
                  >
                    {threatLabel(
                      selectedInspection.threat_level
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                  <span className="text-sm text-slate-400">
                    Detected Objects
                  </span>

                  <span className="text-lg font-semibold text-white">
                    {
                      selectedInspection.detected_objects
                        .length
                    }
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                  <span className="text-sm text-slate-400">
                    Processing Time
                  </span>

                  <span className="text-sm font-semibold text-white">
                    {selectedInspection.processing_ms ===
                    null
                      ? "—"
                      : `${selectedInspection.processing_ms.toFixed(
                          1
                        )} ms`}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                  <span className="text-sm text-slate-400">
                    Inspector
                  </span>

                  <span className="text-sm font-semibold text-white">
                    {selectedInspection.inspector_name ??
                      "AI Processing"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const item = history.find(
                      (entry) =>
                        entry.id ===
                        selectedInspection.id
                    );

                    void downloadInspectionReport(
                      selectedInspection.id,
                      item?.container_code ??
                        selectedContainerCode
                    );
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/5 px-4 py-3 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/10"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                  Download Inspection Report
                </button>
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-slate-700 p-8 text-center">
                <p className="text-sm text-slate-500">
                  Select an inspection from the history to view
                  its result.
                </p>
              </div>
            )}
          </div>

          {/* DETECTED OBJECTS */}
          {selectedInspection &&
            selectedInspection.detected_objects.length >
              0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <h2 className="text-lg font-semibold text-white">
                  Detected Objects
                </h2>

                <div className="mt-4 space-y-3">
                  {selectedInspection.detected_objects.map(
                    (detection, index) => (
                      <div
                        key={`${detection.label}-${index}`}
                        className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-medium text-white">
                              {detection.label}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {detection.category}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-sm font-semibold text-white">
                              {(
                                detection.confidence *
                                100
                              ).toFixed(1)}
                              %
                            </div>

                            <div
                              className={`mt-1 text-xs font-medium ${threatClass(
                                detection.threat_level
                              )}`}
                            >
                              {detection.threat_level.toUpperCase()}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
        </div>
      </div>

      {/* HISTORY */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Inspection History
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Recent cargo inspection runs.
            </p>
          </div>

          <span className="text-xs text-slate-500">
            {history.length} records
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <ArrowPathIcon className="mx-auto h-7 w-7 animate-spin text-cyan-400" />
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
            No inspection history available.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">
                    Container
                  </th>
                  <th className="px-4 py-3">
                    Status
                  </th>
                  <th className="px-4 py-3">
                    Threat
                  </th>
                  <th className="px-4 py-3">
                    Objects
                  </th>
                  <th className="px-4 py-3">
                    Inspector
                  </th>
                  <th className="px-4 py-3">
                    Date
                  </th>
                  <th className="px-4 py-3">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {history.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-800/70 transition hover:bg-slate-950/40"
                  >
                    <td className="px-4 py-4 font-medium text-white">
                      {item.container_code ?? "—"}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                          item.status
                        )}`}
                      >
                        {statusLabel(item.status)}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${threatClass(
                          item.threat_level
                        )}`}
                      >
                        {threatLabel(item.threat_level)}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-300">
                      {item.object_count}
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-400">
                      {item.inspector_name ??
                        "AI Processing"}
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-400">
                      {new Date(
                        item.created_at
                      ).toLocaleString()}
                    </td>

                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() =>
                          void loadInspection(item.id)
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300"
                      >
                        <EyeIcon className="h-4 w-4" />
                        View
                      </button>
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