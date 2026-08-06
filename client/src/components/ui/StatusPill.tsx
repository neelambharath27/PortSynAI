type PillTone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE_STYLES: Record<PillTone, string> = {
  success: "bg-status-success/10 text-status-success border-status-success/25",
  warning: "bg-status-warning/10 text-status-warning border-status-warning/25",
  danger: "bg-status-danger/10 text-status-danger border-status-danger/25",
  info: "bg-cyan-500/10 text-cyan-400 border-cyan-500/25",
  neutral: "bg-white/5 text-ink-300 border-white/10",
};

interface StatusPillProps {
  label: string;
  tone: PillTone;
  pulse?: boolean;
}

export function StatusPill({ label, tone, pulse = false }: StatusPillProps) {
  return (
    <span className={`status-pill border ${TONE_STYLES[tone]}`}>
      <span className="relative flex h-1.5 w-1.5">
        {pulse && (
          <span
            className={`absolute inline-flex h-full w-full animate-pulse-dot rounded-full ${TONE_STYLES[tone].split(" ")[1]} opacity-60`}
          />
        )}
        <span
          className={`relative inline-flex h-1.5 w-1.5 rounded-full ${TONE_STYLES[tone].split(" ")[1].replace("text-", "bg-")}`}
        />
      </span>
      {label}
    </span>
  );
}
