import { ScaleIcon } from "@heroicons/react/24/outline";
import { PlaceholderPage } from "../../components/shared/PlaceholderPage";

export function RiskAssessmentPage() {
  return (
    <PlaceholderPage
      icon={ScaleIcon}
      title="Risk Assessment"
      description="XGBoost composite risk scoring combining GPS, RFID, sensor, manifest, and YOLO signals, with a gauge chart, will be built here."
      phase="Phase 8"
    />
  );
}
