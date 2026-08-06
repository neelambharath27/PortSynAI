import { useTheme } from "../../contexts/ThemeContext";

export function useChartTheme() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return {
    isDark,
    gridColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(11,18,32,0.08)",
    tickColor: isDark ? "#64748B" : "#64748B",
    textColor: isDark ? "#CBD5E1" : "#334155",
    tooltipBg: isDark ? "rgba(16,31,53,0.95)" : "rgba(255,255,255,0.98)",
    tooltipBorder: isDark ? "rgba(255,255,255,0.08)" : "rgba(11,18,32,0.08)",
    cyan: "#22D3EE",
    cyanFill: isDark ? "rgba(34,211,238,0.15)" : "rgba(34,211,238,0.12)",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    neutral: "#64748B",
  };
}
