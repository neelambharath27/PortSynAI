import { useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  ClockIcon,
  LinkIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

import {
  approveClearance,
  createClearanceDecision,
  fetchClearanceDecision,
  fetchClearanceRecord,
  fetchLiveContainers,
  rejectClearance,
  type ClearanceDecision,
  type ClearanceRecord,
  type LiveContainer,
} from "../../services/clearanceService";

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function decisionClasses(decision?: string) {
  switch (decision) {
    case "clear":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "inspect":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "hold":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function statusClasses(status?: string) {
  switch (status) {
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "rejected":
      return "border-red-200 bg-red-50 text-red-700";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

export function BlockchainPage() {
  const [containers, setContainers] = useState<LiveContainer[]>([]);
  const [selectedContainerId, setSelectedContainerId] = useState("");

  const [decision, setDecision] =
    useState<ClearanceDecision | null>(null);

  const [record, setRecord] =
    useState<ClearanceRecord | null>(null);

  const [loadingContainers, setLoadingContainers] = useState(true);
  const [loadingDecision, setLoadingDecision] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadContainers() {
    try {
      setLoadingContainers(true);
      setError("");

      const rows = await fetchLiveContainers();

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

  async function loadClearance(containerId: string) {
    if (!containerId) return;

    try {
      setLoadingDecision(true);
      setError("");
      setSuccess("");

      const result = await fetchClearanceDecision(containerId);
      setDecision(result);

      try {
        const existingRecord =
          await fetchClearanceRecord(containerId);
        setRecord(existingRecord);
      } catch {
        setRecord(null);
      }
    } catch (err: any) {
      setDecision(null);
      setRecord(null);

      setError(
        err?.response?.data?.detail ??
          err?.message ??
          "Unable to load clearance decision.",
      );
    } finally {
      setLoadingDecision(false);
    }
  }

  useEffect(() => {
    void loadContainers();
  }, []);

  useEffect(() => {
    if (selectedContainerId) {
      void loadClearance(selectedContainerId);
    }
  }, [selectedContainerId]);

  const selectedContainer = useMemo(
    () =>
      containers.find(
        (container) => container.id === selectedContainerId,
      ),
    [containers, selectedContainerId],
  );

  async function handleCreate() {
    if (!selectedContainerId) return;

    try {
      setProcessing(true);
      setError("");
      setSuccess("");

      const result =
        await createClearanceDecision(selectedContainerId);

      setDecision(result);
      setSuccess("Clearance decision created successfully.");

      try {
        const existingRecord =
          await fetchClearanceRecord(selectedContainerId);
        setRecord(existingRecord);
      } catch {
        setRecord(null);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ??
          err?.message ??
          "Unable to create clearance decision.",
      );
    } finally {
      setProcessing(false);
    }
  }

  async function handleApprove() {
    if (!selectedContainerId) return;

    try {
      setProcessing(true);
      setError("");
      setSuccess("");

      const result =
        await approveClearance(selectedContainerId);

      setDecision(result);

      const updatedRecord =
        await fetchClearanceRecord(selectedContainerId);

      setRecord(updatedRecord);
      setSuccess(
        "Clearance approved and blockchain audit record created.",
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ??
          err?.message ??
          "Unable to approve clearance.",
      );
    } finally {
      setProcessing(false);
    }
  }

  async function handleReject() {
    if (!selectedContainerId) return;

    try {
      setProcessing(true);
      setError("");
      setSuccess("");

      const result =
        await rejectClearance(selectedContainerId);

      setDecision(result);

      const updatedRecord =
        await fetchClearanceRecord(selectedContainerId);

      setRecord(updatedRecord);
      setSuccess("Clearance rejected and audit record updated.");
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ??
          err?.message ??
          "Unable to reject clearance.",
      );
    } finally {
      setProcessing(false);
    }
  }

  async function handleRefresh() {
    if (!selectedContainerId) {
      await loadContainers();
      return;
    }

    await loadClearance(selectedContainerId);
  }

  async function copyValue(value: string | null) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setSuccess("Copied to clipboard.");
    } catch {
      setSuccess("Copy is unavailable in this browser.");
    }
  }

  const canApprove =
  !!record &&
  record.status === "pending" &&
  !!decision &&
  ["clear", "inspect"].includes(decision.decision);

const canReject =
  !!record &&
  record.status === "pending";
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-primary-200 bg-primary-50 p-3">
              <LinkIcon className="h-7 w-7 text-primary-600" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Blockchain Cargo Clearance
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Officer-controlled clearance with cryptographic
                audit records and transaction traceability.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleRefresh()}
          disabled={loadingDecision || processing}
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

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label
              htmlFor="blockchain-container"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Select Container
            </label>

            <select
              id="blockchain-container"
              value={selectedContainerId}
              onChange={(event) =>
                setSelectedContainerId(event.target.value)
              }
              disabled={loadingContainers}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
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
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span className="font-semibold text-slate-800">
              Container:
            </span>{" "}
            {selectedContainer?.container_code ?? "—"}
          </div>
        </div>
      </section>

      {loadingDecision && (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500 shadow-sm">
          Loading clearance intelligence...
        </div>
      )}

      {!loadingDecision && decision && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                AI Risk Score
              </p>

              <div className="mt-3 flex items-end gap-2">
                <span className="text-4xl font-bold text-slate-900">
                  {decision.risk_score.toFixed(1)}
                </span>

                <span className="pb-1 text-sm text-slate-500">
                  / 100
                </span>
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Unified risk assessment from the PortSynAI
                intelligence pipeline.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Risk Level
              </p>

              <div className="mt-3">
                <span
                  className={`inline-flex rounded-full border px-3 py-1.5 text-sm font-semibold uppercase ${decisionClasses(
                    decision.decision,
                  )}`}
                >
                  {decision.risk_level}
                </span>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                Risk-driven clearance workflow.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                AI Decision
              </p>

              <div className="mt-3">
                <span
                  className={`inline-flex rounded-full border px-3 py-1.5 text-sm font-bold uppercase ${decisionClasses(
                    decision.decision,
                  )}`}
                >
                  {decision.decision}
                </span>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                {decision.reason}
              </p>
            </div>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <ShieldCheckIcon className="h-6 w-6 text-primary-600" />

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Officer Clearance Workflow
                </h2>
                <p className="text-sm text-slate-500">
                  Create the clearance record, then approve or
                  reject according to the AI decision and inspection
                  state.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {!record && (
                <button
                  type="button"
                  onClick={() => void handleCreate()}
                  disabled={processing}
                  className="rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Create Clearance
                </button>
              )}

              {canApprove && (
                <button
                  type="button"
                  onClick={() => void handleApprove()}
                  disabled={processing}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircleIcon className="h-5 w-5" />
                  Approve Clearance
                </button>
              )}

              {canReject && (
                <button
                  type="button"
                  onClick={() => void handleReject()}
                  disabled={processing}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <XCircleIcon className="h-5 w-5" />
                  Reject Clearance
                </button>
              )}
            </div>

            {decision.decision === "hold" && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                HOLD decision: normal approval is blocked by the
                backend clearance policy.
              </div>
            )}

            {decision.decision === "inspect" && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                INSPECT decision: cargo inspection must satisfy the
                backend approval gate before approval.
              </div>
            )}
          </section>

          {record && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <LinkIcon className="h-6 w-6 text-primary-600" />

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Blockchain Audit Record
                  </h2>
                  <p className="text-sm text-slate-500">
                    Cryptographic record associated with the clearance
                    transaction.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Clearance Status
                  </p>

                  <span
                    className={`mt-2 inline-flex rounded-full border px-3 py-1.5 text-sm font-semibold uppercase ${statusClasses(
                      record.status,
                    )}`}
                  >
                    {record.status}
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Timestamp
                  </p>

                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                    <ClockIcon className="h-5 w-5 text-slate-400" />
                    {formatDate(record.timestamp)}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Transaction ID
                      </p>

                      <p className="mt-2 break-all font-mono text-sm text-slate-800">
                        {record.transaction_id ?? "Not generated yet"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        void copyValue(record.transaction_id)
                      }
                      disabled={!record.transaction_id}
                      className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Copy transaction ID"
                    >
                      <ClipboardDocumentIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Blockchain Hash
                      </p>

                      <p className="mt-2 break-all font-mono text-sm text-slate-800">
                        {record.blockchain_hash ??
                          "Not generated yet"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        void copyValue(record.blockchain_hash)
                      }
                      disabled={!record.blockchain_hash}
                      className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Copy blockchain hash"
                    >
                      <ClipboardDocumentIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Audit Action
                  </p>

                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    {record.audit_action ?? "No audit entry yet"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Audit Timestamp
                  </p>

                  <p className="mt-2 text-sm text-slate-800">
                    {formatDate(record.audit_timestamp)}
                  </p>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {!loadingDecision && !decision && !error && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center shadow-sm">
          <LinkIcon className="mx-auto h-10 w-10 text-slate-300" />

          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            Select a container
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Choose a container above to load its AI clearance
            decision and blockchain audit state.
          </p>
        </div>
      )}
    </div>
  );
}