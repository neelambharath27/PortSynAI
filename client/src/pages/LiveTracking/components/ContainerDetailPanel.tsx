import { useQuery } from "@tanstack/react-query";
import { XMarkIcon, MapPinIcon, ClockIcon } from "@heroicons/react/24/outline";
import { StatusPill } from "../../../components/ui/StatusPill";
import { STATUS_LABELS, type ContainerLive } from "../../../types/tracking";
import { STATUS_TONE } from "../../../utils/statusColors";
import { fetchRouteHistory } from "../../../services/trackingService";

interface ContainerDetailPanelProps {
  container: ContainerLive;
  onClose: () => void;
}

function formatEta(eta: string | null): string {
  if (!eta) return "—";
  const date = new Date(eta);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  if (diffMs <= 0) return "Arriving";

  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 60) return `${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  const remMinutes = diffMinutes % 60;
  if (diffHours < 24) return `${diffHours}h ${remMinutes}m`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ${diffHours % 24}h`;
}

export function ContainerDetailPanel({
  container,
  onClose,
}: ContainerDetailPanelProps) {
  const { data: history, isLoading } = useQuery({
    queryKey: ["route-history", container.id],
    queryFn: () => fetchRouteHistory(container.id),
    refetchInterval: 8000,
  });

  return (
    <div className="glass-panel flex h-full flex-col rounded-2xl">
      <div className="flex items-center justify-between border-b border-white/[0.06] p-4">
        <div>
          <p className="font-mono text-sm font-semibold text-white">
            {container.container_code}
          </p>
          <StatusPill
            label={STATUS_LABELS[container.status]}
            tone={STATUS_TONE[container.status]}
            pulse
          />
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-ink-500 hover:bg-white/5 hover:text-white"
          aria-label="Close details"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-wide text-ink-500">
              Latitude
            </p>
            <p className="mt-1 font-mono text-sm text-white">
              {container.lat.toFixed(4)}
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-wide text-ink-500">
              Longitude
            </p>
            <p className="mt-1 font-mono text-sm text-white">
              {container.lng.toFixed(4)}
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-wide text-ink-500">
              Speed
            </p>
            <p className="mt-1 font-mono text-sm text-white">
              {container.speed} kn
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-wide text-ink-500">
              Heading
            </p>
            <p className="mt-1 font-mono text-sm text-white">
              {container.heading}°
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
          <div className="flex items-center gap-2 text-cyan-400">
            <ClockIcon className="h-4 w-4" />
            <span className="text-xs font-semibold">Estimated Arrival</span>
          </div>
          <p className="mt-1.5 font-display text-xl font-semibold text-white">
            {formatEta(container.eta)}
          </p>
          {container.distance_remaining_km != null && (
            <p className="mt-0.5 text-[11px] text-ink-500">
              {container.distance_remaining_km.toLocaleString()} km remaining
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 text-ink-300">
            <MapPinIcon className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-semibold">Route</span>
          </div>
          <div className="mt-2 space-y-1 text-sm">
            <p className="text-ink-300">
              From{" "}
              <span className="text-white">
                {container.origin_port ?? "Unknown"}
              </span>
            </p>
            <p className="text-ink-300">
              To{" "}
              <span className="text-white">
                {container.destination_port ?? "Unknown"}
              </span>
            </p>
            {container.ship_name && (
              <p className="text-ink-500">Aboard {container.ship_name}</p>
            )}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold text-ink-300">
            Route History
          </p>
          {isLoading && (
            <p className="text-xs text-ink-500">Loading history…</p>
          )}
          {!isLoading && (!history || history.waypoints.length === 0) && (
            <p className="text-xs text-ink-500">
              No recorded waypoints yet — history builds up as this container
              moves.
            </p>
          )}
          {history && history.waypoints.length > 0 && (
            <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {[...history.waypoints].reverse().map((wp, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11px]"
                >
                  <span className="font-mono text-ink-300">
                    {wp.lat.toFixed(3)}, {wp.lng.toFixed(3)}
                  </span>
                  <span className="text-ink-500">
                    {new Date(wp.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
