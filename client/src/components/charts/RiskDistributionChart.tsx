import "./chartSetup";
import { Pie } from "react-chartjs-2";
import { ChartCard } from "./ChartCard";
import { useChartTheme } from "./useChartTheme";
import type { RiskDistribution } from "../../types/dashboard";

export function RiskDistributionChart({ data }: { data: RiskDistribution }) {
  const t = useChartTheme();
  const total = data.low + data.medium + data.high;

  return (
    <ChartCard title="Risk Distribution" subtitle={`${total} scored containers`}>
      <div className="flex h-56 items-center gap-6">
        <div className="h-full w-1/2">
          <Pie
            data={{
              labels: ["Low", "Medium", "High"],
              datasets: [
                {
                  data: [data.low, data.medium, data.high],
                  backgroundColor: [t.success, t.warning, t.danger],
                  borderColor: t.isDark ? "#0A1628" : "#FFFFFF",
                  borderWidth: 2,
                  hoverOffset: 6,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: t.tooltipBg,
                  borderColor: t.tooltipBorder,
                  borderWidth: 1,
                  titleColor: t.textColor,
                  bodyColor: t.textColor,
                  padding: 10,
                  cornerRadius: 8,
                },
              },
            }}
          />
        </div>
        <div className="flex-1 space-y-3">
          {[
            ["Low", data.low, t.success],
            ["Medium", data.medium, t.warning],
            ["High", data.high, t.danger],
          ].map(([label, value, color]) => (
            <div key={label as string} className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs text-ink-300">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: color as string }}
                />
                {label}
              </span>
              <span className="font-mono text-xs text-white">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}
