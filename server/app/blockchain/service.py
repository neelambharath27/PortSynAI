import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Any


class BlockchainService:
    """
    Prototype blockchain adapter.

    Generates a tamper-evident SHA-256 hash for a clearance
    event and a unique transaction ID.

    This is a local prototype adapter, not a live Hyperledger
    Fabric network connection.
    """

    @staticmethod
    def record_clearance(
        *,
        clearance_id: str,
        container_id: str,
        container_code: str,
        risk_score: float,
        risk_level: str,
        decision: str,
        status: str,
        officer_id: str,
        timestamp: datetime | None = None,
    ) -> dict[str, str]:

        event_time = timestamp or datetime.now(timezone.utc)

        payload: dict[str, Any] = {
            "clearance_id": clearance_id,
            "container_id": container_id,
            "container_code": container_code,
            "risk_score": round(float(risk_score), 4),
            "risk_level": risk_level,
            "decision": decision,
            "status": status,
            "officer_id": officer_id,
            "timestamp": event_time.isoformat(),
        }

        canonical_payload = json.dumps(
            payload,
            sort_keys=True,
            separators=(",", ":"),
        )

        blockchain_hash = hashlib.sha256(
            canonical_payload.encode("utf-8")
        ).hexdigest()

        transaction_id = f"TXN-{uuid.uuid4().hex[:24].upper()}"

        return {
            "transaction_id": transaction_id,
            "blockchain_hash": f"0x{blockchain_hash}",
        }