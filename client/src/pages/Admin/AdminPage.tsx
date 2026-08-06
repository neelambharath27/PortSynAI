import { UsersIcon } from "@heroicons/react/24/outline";
import { PlaceholderPage } from "../../components/shared/PlaceholderPage";

export function AdminPage() {
  return (
    <PlaceholderPage
      icon={UsersIcon}
      title="Admin Panel"
      description="Management of users, containers, routes, ships, ports, cargo, permissions, and system logs will be built here."
      phase="Phase 10"
    />
  );
}
