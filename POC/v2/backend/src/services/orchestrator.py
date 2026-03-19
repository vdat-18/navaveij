"""Orchestration Manager to coordinate workflows, safety, and audit."""

import time
from typing import Any

from loguru import logger

from src.api.routes.patients import resolve_patient_token
from src.services.mcp_client import MCPClientFactory
from src.services.audit import AuditLogger
from src.services.privacy import PIIRehydrator
from src.services.safety import SafetyRuleValidator
from src.services.workflows.clinical import ClinicalReasoningWorkflow
from shared.settings import settings


class OrchestrationManager:
    """High-level manager responsible for coordinating life-cycles.

    Responsibilities:
    - MCP Infrastructure setup/teardown via Factory.
    - Execution of specific Workflows.
    - Post-processing (Safety Validation, Audit Logging).
    """

    def __init__(self):
        """Initialize core components."""
        self.safety_validator = SafetyRuleValidator()
        self.audit_logger = AuditLogger()

    async def generate_recommendation(
        self,
        patient_id: str,
        patient_token: str | None = None,
        force_rule_based: bool = False,
        audit_context: dict[str, Any] | None = None,
        on_stage: Any = None,
    ) -> dict[str, Any]:
        """Coordinate the full recommendation generation process.

        Args:
            patient_id: The patient to generate a recommendation for.
            patient_token: Optional pre-existing token (useful for synthesized data).
            force_rule_based: If True, bypass AI and use deterministic rules.

        Returns:
            A dictionary containing the recommendation and safety checks.
        """
        resolved_patient_token = patient_token or resolve_patient_token(patient_id)
        if not resolved_patient_token:
            raise ValueError(f"Patient token not found for patient_id: {patient_id}")
        logger.info(f"Manager received request for patient: {patient_id} (force_rule_based={force_rule_based})")

        t_start = time.monotonic()
        audit_context = audit_context or {}

        async with MCPClientFactory.get_client() as session:
            # Initialize Workflow
            workflow = ClinicalReasoningWorkflow(session)

            # Execute Workflow (includes MCP fetch + AI chain)
            t_workflow_start = time.monotonic()
            try:
                context = await workflow.execute(
                    patient_id,
                    patient_token=resolved_patient_token,
                    force_rule_based=force_rule_based,
                    on_stage=on_stage,
                )
            except Exception as exc:
                if force_rule_based:
                    raise RuntimeError(f"Rule-based fallback failed: {exc}") from exc
                logger.warning(f"Primary path failed, retrying deterministic rule-based flow: {exc}")
                context = await workflow.execute(
                    patient_id,
                    patient_token=resolved_patient_token,
                    force_rule_based=True,
                    on_stage=on_stage,
                )
            t_workflow_end = time.monotonic()

            # Post-process: Deterministic Safety Validation
            if on_stage: await on_stage(6, "Finalizing")
            logger.info("Performing deterministic safety validation")
            t_safety_start = time.monotonic()
            safety_result = self.safety_validator.validate_and_filter(
                context.ai_output,
                context.raw_context,
            )
            context.ai_output["add_ons"] = safety_result["filtered_add_ons"]
            t_safety_end = time.monotonic()

            # Post-process: Audit Logging
            logger.info("Recording audit log")
            t_audit_start = time.monotonic()
            total_ms_so_far = int((t_audit_start - t_start) * 1000)
            recommendation_hash = self.audit_logger.log_recommendation(
                patient_id=patient_id,
                patient_token=resolved_patient_token,
                masked_context=context.masked_context,
                ai_output=context.ai_output,
                model_id=settings.llm_model,
                safety_conflict_events=safety_result["conflict_events"],
                user_id=audit_context.get("user_id", "usr-system"),
                user_role=audit_context.get("user_role", "system"),
                client_ip=audit_context.get("client_ip", "unknown"),
                request_id=audit_context.get("request_id", ""),
                action_type=audit_context.get("action_type", "GenerateRecommendation"),
                latency_ms=total_ms_so_far,
            )
            t_audit_end = time.monotonic()

            context.ai_output["recommendation_hash"] = recommendation_hash

            # Post-process: Rehydration (Restore PII values for Frontend display)
            logger.info("Rehydrating AI output for frontend")
            t_rehydration_start = time.monotonic()
            rehydrator = PIIRehydrator(context.rehydration_map)
            masked_ai_output = context.ai_output.copy()
            rehydrated_output = rehydrator.rehydrate(context.ai_output)

            # Expose raw data for visualization/HUDs
            result = {
                **rehydrated_output,
                "biomarker_trends": context.masked_context.get("get_biomarker_trends", {}),
                "clinical_signals": context.masked_context.get("get_clinical_signals", {}),
            }

            # Final rehydration pass on everything for the frontend
            rehydrated_result = rehydrator.rehydrate(result)
            t_rehydration_end = time.monotonic()
            t_end = time.monotonic()

            rehydrated_result["security_metadata"] = {
                "rehydration_map": context.rehydration_map,
                "masked_ai_output": masked_ai_output,
                "is_poc_demo": True,
            }
            rehydrated_result["phase_timings"] = {
                "workflow_ms": int((t_workflow_end - t_workflow_start) * 1000),
                "ai_chain_ms": context.metadata.get("ai_chain_ms", 0),
                "safety_ms": int((t_safety_end - t_safety_start) * 1000),
                "audit_ms": int((t_audit_end - t_audit_start) * 1000),
                "rehydration_ms": int((t_rehydration_end - t_rehydration_start) * 1000),
                "total_ms": int((t_end - t_start) * 1000),
            }
            return rehydrated_result

    async def record_decision(
        self,
        patient_id: str,
        recommendation_hash: str,
        decision: str,
        physician_id: str,
        notes: str = ""
    ) -> dict[str, Any]:
        """Record the final clinical decision in the immutable audit trail."""
        logger.info(f"Recording {decision} decision for patient {patient_id}")
        
        decision_hash = self.audit_logger.log_decision(
            patient_id=patient_id,
            recommendation_hash=recommendation_hash,
            decision=decision,
            physician_id=physician_id,
            notes=notes
        )
        
        return {
            "status": "success",
            "decision_hash": decision_hash,
            "patient_id": patient_id,
            "decision": decision
        }
