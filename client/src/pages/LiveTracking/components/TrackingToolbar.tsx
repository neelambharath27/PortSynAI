import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { STATUS_LABELS, type ContainerStatus } from "../../../types/tracking";

interface TrackingToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: ContainerStatus | "all";
  onStatusFilterChange: (value: ContainerStatus | "all") => void;
  resultCount: number;
}

const STATUS_OPTIONS: (ContainerStatus | "all")[] = [
  "all",
  "moving",
  "delayed",
  "high_risk",
  "cleared",
  "idle",
];

export function TrackingToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  resultCount,
}: TrackingToolbarProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
        <MagnifyingGlassIcon className="h-4 w-4 text-ink-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by container ID…"
          className="w-full bg-transparent text-sm text-white placeholder:text-ink-500 focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            onClick={() => onStatusFilterChange(status)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize transition-colors ${
              statusFilter === status
                ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400"
                : "border-white/10 text-ink-500 hover:border-white/20 hover:text-ink-300"
            }`}
          >
            {status === "all" ? "All" : STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      <p className="font-mono text-[11px] text-ink-500">
        {resultCount} container{resultCount === 1 ? "" : "s"}
      </p>
    </div>
  );
}
