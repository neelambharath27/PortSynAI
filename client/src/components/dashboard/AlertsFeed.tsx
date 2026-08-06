import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckIcon } from "@heroicons/react/24/outline";
import type { RecentAlert } from "../../types/dashboard";
import { markAlertRead } from "../../services/alertService";

const SEVERITY_STYLES: Record<RecentAlert["severity"], string> = {
  critical: "border-status-danger/25 bg-status-danger/10 text-status-danger",
  warning: "border-status-warning/25 bg-status-warning/10 text-status-warning",
  info: "border-cyan-500/25 bg-cyan-500/10 text-cyan-400",
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function AlertsFeed({ alerts }: { alerts: RecentAlert[] }) {
  const queryClient = useQueryClient();
  const { mutate: markRead, isPending } = useMutation({
    mutationFn: markAlertRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });

  return (
    <div className="glass-panel rounded-2xl p-5">
      <h3 className="font-display text-sm font-semibold text-white">
        Recent Alerts
      </h3>
      <div className="mt-4 space-y-2.5">
        {alerts.length === 0 && (
          <p className="text-xs text-ink-500">No alerts to show.</p>
        )}
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`flex items-start justify-between gap-3 rounded-xl border p-3 ${
              alert.is_read
                ? "border-white/[0.06] bg-white/[0.02]"
                : SEVERITY_STYLES[alert.severity]
            }`}
          >
            <div className="min-w-0">
              <p
                className={`text-xs font-medium ${alert.is_read ? "text-ink-400" : "text-white"}`}
              >
                {alert.message}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-wide text-ink-500">
                {alert.severity} · {timeAgo(alert.created_at)}
              </p>
            </div>
            {!alert.is_read && (
              <button
                onClick={() => markRead(alert.id)}
                disabled={isPending}
                className="shrink-0 rounded-lg p-1.5 text-ink-500 hover:bg-white/10 hover:text-white disabled:opacity-50"
                aria-label="Mark as read"
                title="Mark as read"
              >
                <CheckIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
