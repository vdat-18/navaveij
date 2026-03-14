"""Clinical Reasoning Workflow implementation."""

import json
from typing import Any

from loguru import logger
from mcp import ClientSession

from baml_client.async_client import b
from src.orchestrator.privacy.masking import PIIMasker
from src.orchestrator.workflows.base import BaseWorkflow, WorkflowContext
from src.shared.exceptions import WorkflowStepError, DataIntegrityError


class ClinicalReasoningWorkflow(BaseWorkflow[WorkflowContext]):
    """
    Implements the 5-phase clinical reasoning loop.
    
    Phases:
    1. Fetch Baseline
    2. Analyze Signals
    3. Evaluate Trends
    4. Generate Recommendation (BAML)
    5. Finalize Context
    """

    def __init__(self, session: ClientSession):
        """Initialize with an active MCP session."""
        self.session = session
        self.masker = PIIMasker()

    async def execute(self, patient_id: str) -> WorkflowContext:
        """Execute the full clinical reasoning loop."""
        logger.info(f"Executing Clinical Workflow for patient: {patient_id}")
        context = WorkflowContext(patient_id=patient_id)

        try:
            # Phase 1: Baseline
            await self._fetch_baseline(context)
            
            # Phase 2: Signals
            await self._analyze_signals(context)
            
            # Phase 3: Trends
            await self._evaluate_trends(context)
            
            # Mask data before sending to LLM
            context.masked_context = self.masker.mask_data(context.raw_context)

            # Phase 4: Recommendation
            await self._generate_recommendation(context)
            
            # Phase 5: Finalize
            return context
            
        except Exception as e:
            logger.error(f"Workflow execution failed: {str(e)}")
            if isinstance(e, (DataIntegrityError, WorkflowStepError)):
                raise
            raise WorkflowStepError(f"Unexpected error in clinical workflow: {str(e)}") from e

    async def _fetch_baseline(self, context: WorkflowContext) -> None:
        """Phase 1: Get patient profile and history."""
        logger.debug("Phase 1: Fetching baseline data")
        
        # Tools: get_patient_context, get_hard_constraints
        patient_data = await self._call_mcp_tool("get_patient_context", {"patient_id": context.patient_id})
        constraints = await self._call_mcp_tool("get_hard_constraints", {"patient_id": context.patient_id})
        
        context.raw_context["get_patient_context"] = patient_data
        context.raw_context["get_hard_constraints"] = constraints

    async def _analyze_signals(self, context: WorkflowContext) -> None:
        """Phase 2: Detect clinical alerts."""
        logger.debug("Phase 2: Analyzing clinical signals")
        
        signals = await self._call_mcp_tool("get_clinical_signals", {"patient_id": context.patient_id})
        context.raw_context["get_clinical_signals"] = signals

    async def _evaluate_trends(self, context: WorkflowContext) -> None:
        """Phase 3: Assess biomarker velocity."""
        logger.debug("Phase 3: Evaluating biomarker trends")
        
        trends = await self._call_mcp_tool("get_biomarker_trends", {"patient_id": context.patient_id})
        context.raw_context["get_biomarker_trends"] = trends

    async def _generate_recommendation(self, context: WorkflowContext) -> None:
        """Phase 4: BAML call for clinical tiering."""
        logger.debug("Phase 4: Generating recommendation via BAML")
        
        # Add program ruleset (static context for now)
        context.raw_context["get_program_ruleset"] = {
            "Standard": "Default for low-risk patients under 35.",
            "Advanced": "Recommended for age > 40 or presence of 1-2 mild clinical signals.",
            "Premium": "Recommended for age > 50 or presence of multiple high-risk signals.",
        }
        
        # Mask again to include ruleset if needed, or just update masked_context
        context.masked_context = self.masker.mask_data(context.raw_context)
        
        context_str = json.dumps(context.masked_context, indent=2)
        recommendation = await b.GenerateRecommendation(context=context_str)
        
        context.ai_output = {
            "ai_recommended_tier": recommendation.ai_recommended_tier.value,
            "reasoning_trace": recommendation.reasoning_trace,
            "additional_tests": recommendation.additional_tests,
            "confidence_score": recommendation.confidence_score,
            "follow_up_advice": recommendation.follow_up_advice,
        }

    async def _call_mcp_tool(self, name: str, arguments: dict[str, Any]) -> Any:
        """Helper to call MCP tools and parse JSON output."""
        try:
            result = await self.session.call_tool(name, arguments)
            if not result.content:
                raise DataIntegrityError(f"Empty response from MCP tool: {name}")
            
            # FastMCP tools can return multiple content items; we typically want the first one's text
            raw_text = result.content[0].text
            try:
                return json.loads(raw_text)
            except json.JSONDecodeError:
                # If not valid JSON, return the raw string (common for list[str] returns in some MCP setups)
                return raw_text
        except Exception as e:
            logger.error(f"MCP tool call failed ({name}): {str(e)}")
            raise DataIntegrityError(f"Failure in MCP tool {name}: {str(e)}") from e
