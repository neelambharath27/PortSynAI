/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#050B18",
          900: "#0A1628",
          850: "#0D1C31",
          800: "#101F35",
          700: "#16283F",
          600: "#1E3350",
          500: "#2B4568",
        },
        cyan: {
          400: "#22D3EE",
          500: "#06B6D4",
          600: "#0891B2",
        },
        surface: {
          light: "#F6F8FA",
          card: "#FFFFFF",
        },
        ink: {
          900: "#0B1220",
          700: "#334155",
          500: "#64748B",
          300: "#CBD5E1",
        },
        status: {
          success: "#10B981",
          warning: "#F59E0B",
          danger: "#EF4444",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      backgroundImage: {
        "grid-lines":
          "linear-gradient(rgba(34,211,238,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.06) 1px, transparent 1px)",
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(5, 11, 24, 0.37)",
        "glow-cyan": "0 0 24px rgba(34, 211, 238, 0.25)",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: 1, transform: "scale(1)" },
          "50%": { opacity: 0.4, transform: "scale(1.6)" },
        },
        "lane-move": {
          "0%": { strokeDashoffset: "0" },
          "100%": { strokeDashoffset: "-200" },
        },
        "radar-sweep": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "fade-up": {
          "0%": { opacity: 0, transform: "translateY(16px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
      animation: {
        "pulse-dot": "pulse-dot 2.4s ease-in-out infinite",
        "lane-move": "lane-move 6s linear infinite",
        "radar-sweep": "radar-sweep 4s linear infinite",
        "fade-up": "fade-up 0.6s ease-out forwards",
      },
    },
  },
  plugins: [],
};
