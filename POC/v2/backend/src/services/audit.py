"""5-Dimensional Audit Logger with cryptographic hash chaining for immutability."""

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from loguru import logger

from shared.settings import settings


class AuditLogger:
    """Handles immutable recording of AI decisions using a SHA-256 hash chain."""

    def __init__(self):
        """Initialize log files and retrieve the last known hash to maintain the chain."""
        self.log_file_jsonl = Path(settings.audit_log_path)

        self.log_file_jsonl.parent.mkdir(parents=True, exist_ok=True)
        self.last_hash = self._get_last_hash()

    def _get_last_hash(self) -> str:
        """Read the last line of the JSONL log file to extract the previous entry's hash."""
        if not self.log_file_jsonl.exists() or self.log_file_jsonl.stat().st_size == 0:
            return "0" * 64

        try:
            with open(self.log_file_jsonl, "rb") as f:
                f.seek(0, 2)
                size = f.tell()
                f.seek(max(0, size - 4096))
                chunk = f.read().decode("utf-8", errors="ignore")
            for line in reversed(chunk.splitlines()):
                line = line.strip()
                if line:
                    return json.loads(line).get("current_hash", "0" * 64)
        except Exception as e:
            logger.warning(f"Could not parse last audit hash: {e}")
        return "0" * 64

    def log_recommendation(
        self,
        patient_id: str,
        masked_context: dict[str, Any],
        ai_output: dict[str, Any],
        model_id: str,
        safety_conflict_events: list[dict[str, Any]] | None = None,
        patient_token: str | None = None,
        user_id: str = "usr-system",
        user_role: str = "system",
        client_ip: str = "unknown",
        request_id: str = "",
        action_type: str = "GenerateRecommendation",
        latency_ms: int = 0,
    ) -> str:
        timestamp = datetime.now(timezone.utc).isoformat()
        resolved_request_id = request_id or f"req_{timestamp.replace(':', '').replace('-', '')[-12:]}"
        resolved_patient_token = patient_token or ai_output.get("metadata", {}).get("patient_token")

        payload = {
            "timestamp": timestamp,
            "who": {
                "user_id": user_id,
                "user_role": user_role,
            },
            "where": {
                "service_id": "recommendation-engine-api",
                "client_ip": client_ip,
            },
            "what": {
                "prompt": json.dumps(masked_context, ensure_ascii=False),
                "masked_context": masked_context,
                "masked_response": ai_output,
                "latency_ms": int(latency_ms or 0),
                "model_id": model_id,
                "safety_conflict_events": safety_conflict_events or [],
            },
            "why": {
                "request_context": {
                    "patient_id": patient_id,
                    "patient_token": resolved_patient_token,
                    "action_type": action_type,
                    "request_id": resolved_request_id,
                },
            },
            "how": {"model_provider": settings.llm_provider, "model_id": model_id, "action_type": action_type},
            "confidence": ai_output.get("confidence_score"),
            "metadata": {"environment": settings.environment, "request_id": resolved_request_id},
            "previous_hash": self.last_hash,
        }

        # Calculate current hash
        payload_str = json.dumps(payload, sort_keys=True)
        current_hash = hashlib.sha256(payload_str.encode("utf-8")).hexdigest()
        payload["current_hash"] = current_hash

        # Write to JSONL (append-only)
        with open(self.log_file_jsonl, "a", encoding="utf-8") as f:
            f.write(json.dumps(payload) + "\n")

        self.last_hash = current_hash
        logger.info(f"Audit log written for patient: {patient_id}")
        return current_hash

    def log_decision(
        self,
        patient_id: str,
        recommendation_hash: str,
        decision: str,
        physician_id: str,
        notes: str = ""
    ) -> str:
        """Record the human physician's decision linked to the AI recommendation."""
        timestamp = datetime.now(timezone.utc).isoformat()
        
        payload = {
            "timestamp": timestamp,
            "who": {
                "patient_id": patient_id,
                "physician_id": physician_id
            },
            "what": {
                "event": "PROVISIONING_DECISION",
                "recommendation_reference_hash": recommendation_hash
            },
            "why": {
                "decision": decision,
                "notes": notes
            },
            "metadata": {"environment": settings.environment},
            "previous_hash": self.last_hash,
        }

        payload_str = json.dumps(payload, sort_keys=True)
        current_hash = hashlib.sha256(payload_str.encode("utf-8")).hexdigest()
        payload["current_hash"] = current_hash

        with open(self.log_file_jsonl, "a", encoding="utf-8") as f:
            f.write(json.dumps(payload) + "\n")

        self.last_hash = current_hash
        logger.info(f"Decision audit log written for patient {patient_id}: {decision}")
        return current_hash

    def get_logs(self) -> list[dict[str, Any]]:
        """Retrieve all logs from the JSONL audit file."""
        if not self.log_file_jsonl.exists():
            return []
        try:
            entries = []
            with open(self.log_file_jsonl, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        entries.append(json.loads(line))
            return entries
        except Exception as e:
            logger.error(f"Failed to read audit logs: {e}")
            return []
