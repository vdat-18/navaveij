"""5-Dimensional Audit Logger for clinical recommendation traceability."""

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from loguru import logger

from src.shared.settings import settings


class AuditLogger:
    """Handles immutable recording of AI reasoning, data snapshots, and session metadata."""

    def __init__(self):
        """Initialize the audit log file path."""
        self.log_file = Path(settings.audit_log_path)
        self.log_file.parent.mkdir(parents=True, exist_ok=True)

    def log_recommendation(
        self,
        patient_id: str,
        masked_context: dict[str, Any],
        ai_output: dict[str, Any],
        model_id: str,
    ) -> None:
        """Record a comprehensive 5-dimensional audit entry for a single recommendation."""
        timestamp = datetime.now(timezone.utc).isoformat()

        audit_entry = {
            "timestamp": timestamp,
            "who": {"patient_id": patient_id},
            "what": {"input_context_snapshot": masked_context},
            "why": {"reasoning_trace": ai_output.get("reasoning_trace"), "decision": ai_output.get("ai_recommended_tier")},
            "how": {"model_provider": settings.llm_provider, "model_id": model_id},
            "confidence": ai_output.get("confidence_score"),
            "metadata": {"environment": settings.environment},
        }

        try:
            with open(self.log_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(audit_entry) + "\n")
            logger.info(f"Audit log entry written for patient: {patient_id}")
        except OSError as e:
            logger.error(f"Failed to write audit log: {e}")
