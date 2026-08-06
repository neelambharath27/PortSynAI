import { LinkIcon } from "@heroicons/react/24/outline";
import { PlaceholderPage } from "../../components/shared/PlaceholderPage";

export function BlockchainPage() {
  return (
    <PlaceholderPage
      icon={LinkIcon}
      title="Blockchain Cargo Clearance"
      description="Hyperledger Fabric-backed clearance records, approve/reject actions, and immutable audit history will be built here."
      phase="Phase 9"
    />
  );
}
