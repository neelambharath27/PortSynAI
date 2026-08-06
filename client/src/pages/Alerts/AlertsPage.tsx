import { BellAlertIcon } from "@heroicons/react/24/outline";
import { PlaceholderPage } from "../../components/shared/PlaceholderPage";

export function AlertsPage() {
  return (
    <PlaceholderPage
      icon={BellAlertIcon}
      title="Real-time Alerts"
      description="A live notification panel covering GPS loss, high risk cargo, unauthorized movement, and sensor/blockchain failures will be built here."
      phase="Phase 10"
    />
  );
}
