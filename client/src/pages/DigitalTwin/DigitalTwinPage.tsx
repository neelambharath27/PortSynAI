import { CubeTransparentIcon } from "@heroicons/react/24/outline";
import { PlaceholderPage } from "../../components/shared/PlaceholderPage";

export function DigitalTwinPage() {
  return (
    <PlaceholderPage
      icon={CubeTransparentIcon}
      title="Digital Twin"
      description="Live container health twin — temperature, humidity, battery, movement status, and sensor timeline — will render here."
      phase="Phase 6"
    />
  );
}
