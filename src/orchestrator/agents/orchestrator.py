"""Inference Orchestrator Engine for managing the clinical reasoning loop."""

import json
import os
from typing import Any
from loguru import logger
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from src.orchestrator.gateway import AIGateway
from src.orchestrator.privacy.masking import PIIMasker
from src.orchestrator.privacy.rehydration import PIIRehydrator
from src.orchestrator.prompts import CLINICAL_RECOMMENDATION_SYSTEM_PROMPT
from src.shared.settings import settings


class ClinicalOrchestrator:
    """Orchestrates the hybrid ReAct loop between MCP tools and AI Models."""

    def __init__(self):
        """Initialize orchestrator components and server parameters."""
        self.masker = PIIMasker()
        self.gateway = AIGateway()

        # Configure MCP server parameters for stdio transport
        self.server_params = StdioServerParameters(
            command=settings.mcp_server_command, args=settings.mcp_server_args, env={**os.environ, "PYTHONPATH": "."}
        )

    async def run_baseline_phase(self, session: ClientSession, patient_id: str) -> dict[str, any]:
        """Execute mandatory baseline MCP tool calls and return masked context."""
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

            # Attempt to parse as JSON for structured masking
            try:
                raw_context[tool_name] = json.loads(text_result) if text_result else None
            except (json.JSONDecodeError, TypeError):
                raw_context[tool_name] = text_result

            logger.debug(f"Raw result for {tool_name}: {raw_context[tool_name]}")

        # Apply PII masking before passing to AI
        masked_context = self.masker.mask_data(raw_context)
        logger.debug(f"Masked context: {masked_context}")
        return masked_context

    async def generate_recommendation(self, patient_id: str) -> dict[str, any]:
        """Run the full orchestration loop to produce a clinical recommendation."""
        logger.info(f"Generating recommendation for patient: {patient_id}")

        async with stdio_client(self.server_params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()

                # 1. Baseline Phase
                masked_context = await self.run_baseline_phase(session, patient_id)

                # 2. Inference Phase
                logger.info("Sending clinical context to AI model")
                user_content = json.dumps(masked_context, indent=2)
                raw_ai_response = await self.gateway.call_model(CLINICAL_RECOMMENDATION_SYSTEM_PROMPT, user_content)

                # 3. Post-processing & Rehydration
                ai_output = json.loads(raw_ai_response)

                # Append original patient identifier back for the dashboard
                ai_output["patient_id"] = patient_id

                rehydrator = PIIRehydrator(self.masker.get_rehydration_map())
                final_output = rehydrator.rehydrate(ai_output)

                logger.success("Recommendation generation completed via Cloud AI")
                return final_output
