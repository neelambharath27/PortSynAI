import { NavLink } from "react-router-dom";
import { ChevronDoubleLeftIcon } from "@heroicons/react/24/outline";
import { Logo } from "../ui/Logo";
import { NAV_SECTIONS } from "../../utils/navConfig";
import { useAuth } from "../../contexts/AuthContext";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const { user } = useAuth();

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => !user || item.roles.includes(user.role),
    ),
  })).filter((section) => section.items.length > 0);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-navy-950/70 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-white/[0.06] bg-navy-900 transition-all duration-300 lg:sticky lg:top-0
          ${collapsed ? "lg:w-[76px]" : "lg:w-64"}
          ${mobileOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.06] px-4">
          <Logo compact={collapsed} />
          <button
            onClick={onToggle}
            className="hidden rounded-md p-1.5 text-ink-500 hover:bg-white/5 hover:text-white lg:block"
            aria-label="Collapse sidebar"
          >
            <ChevronDoubleLeftIcon
              className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {visibleSections.map((section) => (
            <div key={section.title}>
              {!collapsed && (
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                  {section.title}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/dashboard"}
                    onClick={onCloseMobile}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `nav-link ${isActive ? "nav-link-active" : ""} ${collapsed ? "justify-center" : ""}`
                    }
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>

        {!collapsed && (
          <div className="border-t border-white/[0.06] p-4">
            <div className="glass-panel rounded-xl p-3 text-center">
              <p className="font-mono text-[10px] uppercase tracking-wider text-cyan-400">
                System Status
              </p>
              <p className="mt-1 text-xs text-ink-300">
                All services operational
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
