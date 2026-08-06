import "./chartSetup";
import { Bar } from "react-chartjs-2";
import { ChartCard } from "./ChartCard";
import { useChartTheme } from "./useChartTheme";
import type { TrendPoint } from "../../types/dashboard";

export function MonthlyReportChart({ data }: { data: TrendPoint[] }) {
  const t = useChartTheme();

  return (
    <ChartCard title="Monthly Reports" subtitle="Containers processed, last 6 months">
      <div className="h-56">
        <Bar
          data={{
            labels: data.map((d) => d.label),
            datasets: [
              {
                label: "Containers",
                data: data.map((d) => d.value),
                backgroundColor: t.cyan + "cc",
                hoverBackgroundColor: t.cyan,
                borderRadius: 6,
                maxBarThickness: 36,
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
