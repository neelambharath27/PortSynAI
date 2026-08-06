import { StatusPill } from "../../../components/ui/StatusPill";
import { STATUS_LABELS, type ContainerLive } from "../../../types/tracking";
import { STATUS_TONE } from "../../../utils/statusColors";

interface ContainerListItemProps {
  container: ContainerLive;
  selected: boolean;
  onClick: () => void;
}

export function ContainerListItem({
  container,
  selected,
  onClick,
}: ContainerListItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border p-3 text-left transition-colors ${
        selected
          ? "border-cyan-500/40 bg-cyan-500/5"
          : "border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-semibold text-white">
          {container.container_code}
        </span>
        <StatusPill
          label={STATUS_LABELS[container.status]}
          tone={STATUS_TONE[container.status]}
          pulse={container.status === "moving" || container.status === "high_risk"}
        />
      </div>
      <p className="mt-1.5 truncate text-[11px] text-ink-500">
        {container.origin_port ?? "—"} → {container.destination_port ?? "—"}
      </p>
      <div className="mt-2 flex items-center justify-between text-[11px] text-ink-500">
        <span className="font-mono">{container.speed} kn</span>
        <span>{container.cargo_type}</span>
      </div>
    </button>
  );
}
