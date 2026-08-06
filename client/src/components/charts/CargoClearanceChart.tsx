import "./chartSetup";
import { Doughnut } from "react-chartjs-2";
import { ChartCard } from "./ChartCard";
import { useChartTheme } from "./useChartTheme";
import type { ClearanceDistribution } from "../../types/dashboard";

export function CargoClearanceChart({
  data,
}: {
  data: ClearanceDistribution;
}) {
  const t = useChartTheme();
  const total = data.approved + data.pending + data.rejected;

  return (
    <ChartCard title="Cargo Clearance" subtitle={`${total} clearances on record`}>
      <div className="flex h-56 items-center gap-6">
        <div className="h-full w-1/2">
          <Doughnut
            data={{
              labels: ["Approved", "Pending", "Rejected"],
              datasets: [
                {
                  data: [data.approved, data.pending, data.rejected],
                  backgroundColor: [t.success, t.warning, t.danger],
                  borderColor: "transparent",
                  hoverOffset: 6,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              cutout: "70%",
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
            ["Approved", data.approved, t.success],
            ["Pending", data.pending, t.warning],
            ["Rejected", data.rejected, t.danger],
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
