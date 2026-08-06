import { useState } from "react";
import {
  Bars3Icon,
  BellIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  SunIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { ROLE_LABELS } from "../../types/auth";

interface TopbarProps {
  onOpenMobileSidebar: () => void;
  pageTitle: string;
}

export function Topbar({ onOpenMobileSidebar, pageTitle }: TopbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-white/[0.06] bg-navy-900/80 px-4 backdrop-blur-xl lg:px-6">
      <div className="flex items-center gap-3">
        <button
          className="text-ink-300 hover:text-white lg:hidden"
          onClick={onOpenMobileSidebar}
          aria-label="Open menu"
        >
          <Bars3Icon className="h-6 w-6" />
        </button>
        <h1 className="font-display text-base font-semibold text-white lg:text-lg">
          {pageTitle}
        </h1>
      </div>

      <div className="hidden max-w-md flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 mx-6 md:flex">
        <MagnifyingGlassIcon className="h-4 w-4 text-ink-500" />
        <input
          type="text"
          placeholder="Search containers, ships, ports…"
          className="w-full bg-transparent text-sm text-white placeholder:text-ink-500 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-2 lg:gap-3">
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-ink-300 hover:bg-white/5 hover:text-white"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <SunIcon className="h-5 w-5" />
          ) : (
            <MoonIcon className="h-5 w-5" />
          )}
        </button>

        <button
          onClick={() => navigate("/dashboard/alerts")}
          className="relative rounded-lg p-2 text-ink-300 hover:bg-white/5 hover:text-white"
          aria-label="Alerts"
        >
          <BellIcon className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-status-danger" />
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg py-1.5 pl-1.5 pr-2 hover:bg-white/5"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/15 font-mono text-xs font-semibold text-cyan-400">
              {user?.avatarInitials ?? "—"}
            </div>
            <div className="hidden text-left md:block">
              <p className="text-xs font-semibold text-white">
                {user?.name ?? "Guest"}
              </p>
              <p className="text-[11px] text-ink-500">
                {user ? ROLE_LABELS[user.role] : ""}
              </p>
            </div>
            <ChevronDownIcon className="hidden h-4 w-4 text-ink-500 md:block" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="glass-panel absolute right-0 z-20 mt-2 w-48 rounded-xl p-1.5">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/dashboard/settings");
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink-300 hover:bg-white/5 hover:text-white"
                >
                  <Cog6ToothIcon className="h-4 w-4" /> Settings
                </button>
                <button
                  onClick={() => {
                    logout();
                    navigate("/");
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-status-danger hover:bg-status-danger/10"
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4" /> Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
