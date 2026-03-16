"""Orchestration Manager to coordinate workflows, safety, and audit."""

from typing import Any

from loguru import logger

from src.orchestrator.infrastructure.mcp_factory import MCPClientFactory
from src.orchestrator.logger.audit import AuditLogger
from src.orchestrator.safety.validator import ClinicalSafetyGuard
from src.orchestrator.workflows.clinical import ClinicalReasoningWorkflow
from src.shared.settings import settings


class OrchestrationManager:
    """High-level manager responsible for coordinating life-cycles.

    Responsibilities:
    - MCP Infrastructure setup/teardown via Factory.
    - Execution of specific Workflows.
    - Post-processing (Safety Validation, Audit Logging).
    """

    def __init__(self):
        """Initialize core components."""
        self.safety_guard = ClinicalSafetyGuard()
        self.audit_logger = AuditLogger()

    async def generate_recommendation(self, patient_id: str) -> dict[str, Any]:
        """Coordinate the full recommendation generation process.

        Args:
            patient_id: The patient to generate a recommendation for.

        Returns:
            A dictionary containing the recommendation and safety checks.
        """
        logger.info(f"Manager received request for patient: {patient_id}")

        async with MCPClientFactory.get_client() as session:
            # Initialize Workflow
            workflow = ClinicalReasoningWorkflow(session)

            # Execute Workflow
            context = await workflow.execute(patient_id)

            # Post-process: Safety Validation
            logger.info("Performing safety validation")
            safety_result = await self.safety_guard.validate(context.ai_output, context.raw_context)
            context.ai_output["safety_check"] = safety_result

            # Post-process: Audit Logging
            logger.info("Recording audit log")
            recommendation_hash = self.audit_logger.log_recommendation(
                patient_id=patient_id,
                masked_context=context.masked_context,
                ai_output=context.ai_output,
                model_id=settings.llm_model,
            )

            context.ai_output["recommendation_hash"] = recommendation_hash
            
            # Expose raw data for visualization/HUDs
            return {
                **context.ai_output,
                "biomarker_trends": context.masked_context.get("get_biomarker_trends", {}),
                "clinical_signals": context.masked_context.get("get_clinical_signals", {}),
            }

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
