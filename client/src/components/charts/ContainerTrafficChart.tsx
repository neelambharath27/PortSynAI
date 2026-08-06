import "./chartSetup";
import { Line } from "react-chartjs-2";
import { ChartCard } from "./ChartCard";
import { useChartTheme } from "./useChartTheme";
import type { TrendPoint } from "../../types/dashboard";

export function ContainerTrafficChart({ data }: { data: TrendPoint[] }) {
  const t = useChartTheme();

  return (
    <ChartCard title="Container Traffic" subtitle="Last 7 days">
      <div className="h-56">
        <Line
          data={{
            labels: data.map((d) => d.label),
            datasets: [
              {
                label: "Containers processed",
                data: data.map((d) => d.value),
                borderColor: t.cyan,
                backgroundColor: t.cyanFill,
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointBackgroundColor: t.cyan,
                pointBorderColor: "transparent",
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
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: t.tickColor, font: { size: 11 } },
              },
              y: {
                grid: { color: t.gridColor },
                ticks: { color: t.tickColor, font: { size: 11 } },
                beginAtZero: true,
              },
            },
          }}
        />
      </div>
    </ChartCard>
  );
}
