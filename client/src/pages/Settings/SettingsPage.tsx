import { useState } from "react";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { ROLE_LABELS } from "../../types/auth";

const LANGUAGES = ["English", "हिन्दी", "தமிழ்", "తెలుగు"];

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [language, setLanguage] = useState("English");
  const [notifications, setNotifications] = useState({
    highRisk: true,
    gpsLoss: true,
    clearance: false,
    system: true,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Profile */}
      <section className="glass-panel rounded-2xl p-6">
        <h2 className="font-display text-lg font-semibold text-white">
          Profile
        </h2>
        <div className="mt-5 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500/15 font-mono text-lg font-semibold text-cyan-400">
            {user?.avatarInitials ?? "—"}
          </div>
          <div>
            <p className="font-medium text-white">{user?.name}</p>
            <p className="text-sm text-ink-500">{user?.email}</p>
            <span className="status-pill mt-1.5 border border-cyan-500/25 bg-cyan-500/10 text-cyan-400">
              {user ? ROLE_LABELS[user.role] : ""}
            </span>
          </div>
        </div>
      </section>

      {/* Theme */}
      <section className="glass-panel rounded-2xl p-6">
        <h2 className="font-display text-lg font-semibold text-white">
          Appearance
        </h2>
        <p className="mt-1 text-sm text-ink-500">
          Choose how PortSynAI looks on this device.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <button
            onClick={() => setTheme("dark")}
            className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors ${
              theme === "dark"
                ? "border-cyan-500/50 bg-cyan-500/5"
                : "border-white/10 hover:border-white/20"
            }`}
          >
            <MoonIcon className="h-6 w-6 text-cyan-400" />
            <span className="text-sm font-medium text-white">Dark</span>
          </button>
          <button
            onClick={() => setTheme("light")}
            className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors ${
              theme === "light"
                ? "border-cyan-500/50 bg-cyan-500/5"
                : "border-white/10 hover:border-white/20"
            }`}
          >
            <SunIcon className="h-6 w-6 text-cyan-400" />
            <span className="text-sm font-medium text-white">Light</span>
          </button>
        </div>
      </section>

      {/* Language */}
      <section className="glass-panel rounded-2xl p-6">
        <h2 className="font-display text-lg font-semibold text-white">
          Language
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                language === lang
                  ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400"
                  : "border-white/10 text-ink-300 hover:border-white/20"
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </section>

      {/* Notifications */}
      <section className="glass-panel rounded-2xl p-6">
        <h2 className="font-display text-lg font-semibold text-white">
          Notification Preferences
        </h2>
        <div className="mt-4 divide-y divide-white/[0.06]">
          {[
            { key: "highRisk", label: "High risk container flagged" },
            { key: "gpsLoss", label: "GPS signal lost" },
            { key: "clearance", label: "Cargo clearance decision" },
            { key: "system", label: "System & maintenance alerts" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-3">
              <span className="text-sm text-ink-300">{item.label}</span>
              <button
                onClick={() =>
                  setNotifications((prev) => ({
                    ...prev,
                    [item.key]: !prev[item.key as keyof typeof prev],
                  }))
                }
                className={`h-6 w-11 rounded-full p-0.5 transition-colors ${
                  notifications[item.key as keyof typeof notifications]
                    ? "bg-cyan-500"
                    : "bg-white/10"
                }`}
              >
                <span
                  className={`block h-5 w-5 rounded-full bg-white transition-transform ${
                    notifications[item.key as keyof typeof notifications]
                      ? "translate-x-5"
                      : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
