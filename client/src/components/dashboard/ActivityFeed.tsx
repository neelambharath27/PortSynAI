import {
  LinkIcon,
  MagnifyingGlassCircleIcon,
  ScaleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import type { ActivityItem } from "../../types/dashboard";

const CATEGORY_ICON: Record<string, typeof LinkIcon> = {
  blockchain: LinkIcon,
  inspection: MagnifyingGlassCircleIcon,
  risk: ScaleIcon,
};

const CATEGORY_COLOR: Record<string, string> = {
  blockchain: "text-cyan-400 bg-cyan-500/10",
  inspection: "text-status-warning bg-status-warning/10",
  risk: "text-status-danger bg-status-danger/10",
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

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="glass-panel rounded-2xl p-5">
      <h3 className="font-display text-sm font-semibold text-white">
        Recent Activity
      </h3>
      <div className="mt-4 space-y-4">
        {items.length === 0 && (
          <p className="text-xs text-ink-500">No recent activity.</p>
        )}
        {items.map((item, i) => {
          const Icon = CATEGORY_ICON[item.category] ?? ClockIcon;
          const colorClass =
            CATEGORY_COLOR[item.category] ?? "text-ink-300 bg-white/5";
          const isLast = i === items.length - 1;

          return (
            <div key={item.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${colorClass}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                {!isLast && (
                  <div className="mt-1 w-px flex-1 bg-white/[0.06]" />
                )}
              </div>
              <div className="min-w-0 pb-4">
                <p className="text-xs text-ink-300">{item.message}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wide text-ink-500">
                  {timeAgo(item.timestamp)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
