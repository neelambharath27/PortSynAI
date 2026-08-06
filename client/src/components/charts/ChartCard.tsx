import type { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export function ChartCard({
  title,
  subtitle,
  children,
  className = "",
}: ChartCardProps) {
  return (
    <div className={`glass-panel rounded-2xl p-5 ${className}`}>
      <div className="mb-4">
        <h3 className="font-display text-sm font-semibold text-white">
          {title}
        </h3>
        {subtitle && <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
