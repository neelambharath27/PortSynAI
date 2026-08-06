import { ShieldExclamationIcon } from "@heroicons/react/24/outline";
import { PlaceholderPage } from "../../components/shared/PlaceholderPage";

export function AnomalyDetectionPage() {
  return (
    <PlaceholderPage
      icon={ShieldExclamationIcon}
      title="Anomaly Detection"
      description="Isolation Forest-driven detection of route deviation, GPS spoofing, unauthorized stops, and sensor anomalies will appear here."
      phase="Phase 7"
    />
  );
}
