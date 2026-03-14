"""Inference Orchestrator Engine for managing the clinical reasoning loop."""

import json
import os
from typing import Any

from loguru import logger
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from baml_client.async_client import b
from baml_client.types import CheckupTier
from src.orchestrator.logger.audit import AuditLogger
from src.orchestrator.privacy.masking import PIIMasker
from src.orchestrator.privacy.rehydration import PIIRehydrator
from src.orchestrator.safety.validator import ClinicalSafetyGuard
from src.shared.settings import settings


class ClinicalOrchestrator:
    """Orchestrates the hybrid ReAct loop between MCP tools and AI Models."""

    def __init__(self):
        """Initialize orchestrator components and server parameters."""
        self.masker = PIIMasker()
        self.audit_logger = AuditLogger()
        self.safety_guard = ClinicalSafetyGuard()

        # Configure MCP server parameters for stdio transport
        self.server_params = StdioServerParameters(
            command=settings.mcp_server_command, args=settings.mcp_server_args, env={**os.environ, "PYTHONPATH": "."}
        )

    async def run_baseline_phase(self, session: ClientSession, patient_id: str) -> tuple[dict[str, Any], dict[str, Any]]:
        """Execute mandatory baseline MCP tool calls and return raw and masked context."""
        logger.info(f"Starting Baseline Phase for patient: {patient_id}")

        baseline_tools = [
            "get_patient_context",
            "get_hard_constraints",
            "get_clinical_signals",
            "get_biomarker_trends",
            "get_program_ruleset",
        ]

        raw_context = {}
        for tool_name in baseline_tools:
            logger.debug(f"Calling baseline tool: {tool_name}")
            # Tools expect patient_id except for get_program_ruleset
            kwargs = {"patient_id": patient_id} if tool_name != "get_program_ruleset" else {}
            result = await session.call_tool(tool_name, arguments=kwargs)
            text_result = result.content[0].text if result.content else None

            # Store result directly; AI and downstream tools handle raw/structured format
            raw_context[tool_name] = text_result

            logger.debug(f"Raw result for {tool_name}: {raw_context[tool_name]}")

        # Apply PII masking before passing to AI
        masked_context = self.masker.mask_data(raw_context)
        logger.debug(f"Masked context: {masked_context}")
        return raw_context, masked_context

    async def generate_recommendation(self, patient_id: str) -> dict[str, Any]:
        """Run the full orchestration loop to produce a clinical recommendation via BAML."""
        logger.info(f"Generating recommendation for patient: {patient_id}")

        async with stdio_client(self.server_params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()

                # 1. Baseline Phase
                raw_context, masked_context = await self.run_baseline_phase(session, patient_id)

                # 2. Inference Phase via BAML
                logger.info("Engaging BAML to generate recommendation")
                context_str = json.dumps(masked_context, indent=2)
                recommendation = await b.GenerateRecommendation(context=context_str)

                # Convert BAML object to dict for downstream processing
                # (Handle potential Enum serialization issues by using .value)
                ai_output = {
                    "ai_recommended_tier": recommendation.ai_recommended_tier.value,
                    "reasoning_trace": recommendation.reasoning_trace,
                    "additional_tests": recommendation.additional_tests,
                    "confidence_score": recommendation.confidence_score,
                    "follow_up_advice": recommendation.follow_up_advice,
                }

                # 3. Clinical Safety Validation (Hybrid: Rules + LLM Critic)
                safety_result = await self.safety_guard.validate(ai_output, raw_context)
                ai_output["safety_check"] = safety_result

                # Record 5-Dimensional Audit Log (immutable trace)
                self.audit_logger.log_recommendation(
                    patient_id=patient_id,
                    masked_context=masked_context,
                    ai_output=ai_output,
                    model_id=settings.llm_model,
                )

                # Append original patient identifier back for the dashboard
                ai_output["patient_id"] = patient_id

                rehydrator = PIIRehydrator(self.masker.get_rehydration_map())
                final_output = rehydrator.rehydrate(ai_output)

                logger.success("Recommendation generation completed with BAML and safety validation")
                return final_output
