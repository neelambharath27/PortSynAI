import { ChartBarSquareIcon } from "@heroicons/react/24/outline";
import { PlaceholderPage } from "../../components/shared/PlaceholderPage";

export function AIPredictionPage() {
  return (
    <PlaceholderPage
      icon={ChartBarSquareIcon}
      title="AI Route & ETA Prediction"
      description="LSTM-powered current vs. predicted route comparison, ETA forecasting, and delay probability charts will be built here."
      phase="Phase 7"
    />
  );
}
