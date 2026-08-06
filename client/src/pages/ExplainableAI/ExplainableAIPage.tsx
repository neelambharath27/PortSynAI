import { LightBulbIcon } from "@heroicons/react/24/outline";
import { PlaceholderPage } from "../../components/shared/PlaceholderPage";

export function ExplainableAIPage() {
  return (
    <PlaceholderPage
      icon={LightBulbIcon}
      title="Explainable AI"
      description="SHAP-based feature contribution bar & pie charts explaining why a container was classified as high risk will be built here."
      phase="Phase 9"
    />
  );
}
