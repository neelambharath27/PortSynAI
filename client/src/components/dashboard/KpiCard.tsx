import type { ComponentType, SVGProps } from "react";

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tone?: "default" | "success" | "warning" | "danger" | "info";
  delay?: number;
}

const TONE_ICON_BG: Record<string, string> = {
  default: "bg-white/10 text-ink-300",
  success: "bg-status-success/10 text-status-success",
  warning: "bg-status-warning/10 text-status-warning",
  danger: "bg-status-danger/10 text-status-danger",
  info: "bg-cyan-500/10 text-cyan-400",
};

export function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: KpiCardProps) {
  return (
    <div className="glass-panel rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-500">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${TONE_ICON_BG[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 font-display text-2xl font-semibold text-white">
        {value}
      </p>
    </div>
  );
}
