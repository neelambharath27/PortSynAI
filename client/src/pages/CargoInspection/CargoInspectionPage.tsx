import { ViewfinderCircleIcon } from "@heroicons/react/24/outline";
import { PlaceholderPage } from "../../components/shared/PlaceholderPage";

export function CargoInspectionPage() {
  return (
    <PlaceholderPage
      icon={ViewfinderCircleIcon}
      title="Cargo Inspection"
      description="YOLOv8 X-ray image upload, bounding box detection overlays, and a detected-objects table will be built here."
      phase="Phase 8"
    />
  );
}
