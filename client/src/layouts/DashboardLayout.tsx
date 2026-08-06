import { useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "../components/layout/Sidebar";
import { Topbar } from "../components/layout/Topbar";
import { NAV_SECTIONS } from "../utils/navConfig";

export function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const pageTitle = useMemo(() => {
    for (const section of NAV_SECTIONS) {
      const match = section.items.find(
        (item) =>
          item.path === location.pathname ||
          (item.path !== "/dashboard" &&
            location.pathname.startsWith(item.path)),
      );
      if (match) return match.label;
    }
    return "Dashboard";
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-navy-950">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar
          onOpenMobileSidebar={() => setMobileOpen(true)}
          pageTitle={pageTitle}
        />
        <main className="flex-1 bg-navy-950 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
