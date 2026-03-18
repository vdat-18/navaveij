"""Clinical Reasoning Workflow implementation."""

import json
from typing import Any

from loguru import logger
from mcp import ClientSession

from baml_client.async_client import b
from src.services.privacy import PIIMasker
from src.services.workflows.base import BaseWorkflow, WorkflowContext
from shared.exceptions import DataIntegrityError
from shared.settings import settings
from shared.utils import generate_patient_token


from src.services.rules import RuleEvaluator


class ClinicalReasoningWorkflow(BaseWorkflow[WorkflowContext]):
    """Implements the 5-phase clinical reasoning loop.

    Phases:
    1. Fetch Baseline
    2. Analyze Signals
    3. Evaluate Trends
    4. Generate Recommendation (Hybrid — BAML + Rule Fallback)
    5. Finalize Context
    """

    def __init__(self, session: ClientSession):
        """Initialize with an active MCP session."""
        self.session = session
        self.masker = PIIMasker()

    async def execute(self, patient_id: str, patient_token: str | None = None, force_rule_based: bool = False) -> WorkflowContext:
        """Execute the full clinical reasoning loop."""
        logger.info(f"Executing Clinical Workflow for patient: {patient_id} (force_rule_based={force_rule_based})")
        context = WorkflowContext(patient_id=patient_id)

        # Phase 1: Baseline
        await self._fetch_baseline(context, patient_id)

        # Phase 2: Signals
        await self._analyze_signals(context, patient_id)

        # Phase 3: Trends
        await self._evaluate_trends(context, patient_id)

        # Get program ruleset (Part of Phase 4 preparation)
        ruleset = await self._call_mcp_tool("get_program_ruleset", {"patient_id": patient_id})
        context.raw_context["get_program_ruleset"] = ruleset

        # Mask data before sending to LLM
        # This dynamically generates the patient_token and masks name/id
        context.masked_context = self.masker.mask_data(context.raw_context)

        # Phase 4: Recommendation
        await self._generate_recommendation(context, force_rule_based=force_rule_based)

        # Phase 5: Finalize
        context.rehydration_map = self.masker.get_rehydration_map()
        return context

    async def _fetch_baseline(self, context: WorkflowContext, patient_id: str) -> None:
        """Phase 1: Get patient profile and history."""
        logger.debug(f"Phase 1: Fetching baseline data for patient: {patient_id}")

        # Tools: get_hard_constraints
        constraints = await self._call_mcp_tool("get_hard_constraints", {"patient_id": patient_id})
        context.raw_context["get_hard_constraints"] = constraints

        # Extract demographic context from hard constraints
        demographics = constraints.get("patient_demographics", {})
        context.raw_context["get_patient_context"] = {
            "gender": demographics.get("gender"),
            "age": demographics.get("age"),
            "ethnicity": demographics.get("ethnicity"),
        }

    async def _analyze_signals(self, context: WorkflowContext, patient_id: str) -> None:
        """Phase 2: Detect clinical alerts."""
        logger.debug(f"Phase 2: Analyzing clinical signals for: {patient_id}")
        signals = await self._call_mcp_tool("get_clinical_signals", {"patient_id": patient_id})
        context.raw_context["get_clinical_signals"] = signals

    async def _evaluate_trends(self, context: WorkflowContext, patient_id: str) -> None:
        """Phase 3: Assess biomarker velocity for: {patient_id}"""
        logger.debug(f"Phase 3: Evaluating biomarker trends for: {patient_id}")
        trends = await self._call_mcp_tool("get_biomarker_trends", {"patient_id": patient_id})
        context.raw_context["get_biomarker_trends"] = trends

    async def _generate_recommendation(self, context: WorkflowContext, force_rule_based: bool = False) -> None:
        """Phase 4: Multi-Agent reasoning via BAML (Masked) with Deterministic Fallback."""
        logger.debug(f"Phase 4: Hybrid Recommendation Chain (Rule-Based + AI) force_rule_based={force_rule_based}")

        # Step 1: Deterministic Baseline (Python Engine)
        # Always run the rule evaluator first to have a solid baseline.
        signals_fired = context.raw_context.get("get_clinical_signals", {}).get("signals_fired", [])
        rule_evaluator = RuleEvaluator(signals_fired)
        rule_result = rule_evaluator.evaluate()
        
        rule_tier = rule_result["rule_tier"]
        rule_id = rule_result["applied_rule_id"]
        rule_condition = rule_result["applied_condition"]

        try:
            if force_rule_based:
                raise Exception("Manual Force Rule-Based Mode Active")

            # Agent 1: Clinical Risk Analyzer
            logger.info("Agent 1: Analyzing Clinical Risks...")
            risk_profile = await b.AnalyzeClinicalRisks(
                clinical_signals=json.dumps(context.masked_context.get("get_clinical_signals"), indent=2),
                biomarker_trends=json.dumps(context.masked_context.get("get_biomarker_trends"), indent=2),
                hard_constraints=json.dumps(context.masked_context.get("get_hard_constraints"), indent=2),
                program_ruleset=json.dumps(context.masked_context.get("get_program_ruleset"), indent=2),
            )

            # Agent 2: Policy & Package Resolver
            logger.info("Agent 2: Matching Program Rules...")
            recommendation_plan = await b.MatchProgramRules(
                risk_profile=risk_profile,
                program_ruleset=json.dumps(context.masked_context.get("get_program_ruleset"), indent=2),
            )

            # Agent 3: Clinical Communicator
            logger.info("Agent 3: Composing Final Recommendation...")
            final_result = await b.ComposeRecommendation(
                risk_profile=risk_profile,
                recommendation_plan=recommendation_plan,
            )

            # Success: Map AI result to legacy structure for Frontend compatibility
            context.ai_output = {
                "recommendation_source": "AI",
                "review_required": False,
                "rule_preliminary_tier": rule_tier,
                "ai_recommended_tier": final_result.plan.ai_recommended_tier.value,
                "tier_deviation_justification": final_result.plan.tier_deviation_justification,
                "reasoning_trace": "\n".join([f"- {b}" for b in risk_profile.clinical_summary_bullets]),
                "add_ons": [
                    {
                        "item_code": item.item_code,
                        "priority_level": item.priority_level.value,
                        "rationale": item.rationale,
                    }
                    for item in final_result.plan.selected_add_ons
                ],
                "supporting_signals": risk_profile.supporting_signal_ids,
                "missing_signals": risk_profile.missing_signal_ids,
                "communication_script": {
                    "clinical_conclusion": final_result.script.clinical_conclusion,
                    "health_summary": final_result.script.health_summary,
                    "recommendation_explanation": final_result.script.recommendation_explanation,
                    "add_on_highlights": final_result.script.add_on_highlights,
                    "next_steps": final_result.script.next_steps,
                },
            }
        
        except Exception as e:
            # Failure: Fallback to Deterministic Rule Engine
            logger.error(f"AI Reasoning Chain Failed: {e}. Falling back to RuleEvaluator.")
            
            # Use ruleset info to populate basic rationale
            rule_matched_signals = ", ".join([f"**{s}**" for s in rule_result.get("signals_matched", [])])
            fallback_reasoning = f"The AI agent is temporarily unavailable. A rule-based recommendation was generated by the hospital's Clinical Signal Engine.\n- Matched Rule: {rule_id}\n- Clinical Logic: {rule_condition}\n- Supporting Signals: {rule_matched_signals if rule_matched_signals else 'No high-risk signals fired; standard health checkup indicated.'}"
            
            context.ai_output = {
                "recommendation_source": "RuleBased",
                "review_required": True,
                "rule_preliminary_tier": rule_tier,
                "ai_recommended_tier": rule_tier,
                "tier_deviation_justification": "AI failure fallback triggered.",
                "reasoning_trace": fallback_reasoning,
                "add_ons": [], # Rule engine fallback doesn't auto-select add-ons in this simple PoC
                "supporting_signals": rule_result["signals_matched"],
                "missing_signals": [],
                "communication_script": {
                    "clinical_conclusion": f"Based on hospital rules, we recommend the {rule_tier} program.",
                    "health_summary": f"Your current clinical signals (including {rule_matched_signals if rule_matched_signals else 'routine findings'}) suggest you are appropriate for the {rule_tier} tier.",
                    "recommendation_explanation": f"The {rule_tier} program provides the essential screenings required for your age and gender group.",
                    "add_on_highlights": [],
                    "next_steps": "Please consult with our hospital staff to confirm your personal checkup schedule.",
                },
            }

    async def _call_mcp_tool(self, name: str, arguments: dict[str, Any]) -> Any:
        """Helper to call MCP tools and parse JSON output."""
        result = await self.session.call_tool(name, arguments)
        if not result.content:
            raise DataIntegrityError(f"Empty response from MCP tool: {name}")

        # FastMCP tools can return multiple content items; we typically want the first one's text
        raw_text = result.content[0].text
        return json.loads(raw_text)
