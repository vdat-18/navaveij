"""Clinical Reasoning Workflow implementation."""

import asyncio
import hashlib
import json
import time
from typing import Any

from loguru import logger
from mcp import ClientSession

from baml_client.async_client import b
from src.mcp_server.utils import resolve_package
from src.services.cache import cache_service
from src.services.privacy import PIIMasker
from src.services.rules import RuleEvaluator
from src.services.text_annotations import annotate_reasoning_lines_fallback, find_highlight_terms, strip_markdown_bold
from src.services.workflows.base import BaseWorkflow, WorkflowContext
from shared.exceptions import DataIntegrityError
from shared.settings import settings


_PRIORITY_SEVERITY_MAP = {
    "Red": "critical",
    "Orange": "caution",
    "Yellow": "moderate",
    "Green": "neutral",
}


def _priority_to_severity(priority: str) -> str:
    """Map PriorityLevel enum value to a FE-consumable severity string."""
    return _PRIORITY_SEVERITY_MAP.get(priority, "neutral")


def _risk_profile_cache_key(masked_context: dict) -> str:
    payload = {
        "signals": masked_context.get("get_clinical_signals"),
        "trends": masked_context.get("get_biomarker_trends"),
    }
    return "risk_profile:" + hashlib.sha256(
        json.dumps(payload, sort_keys=True).encode()
    ).hexdigest()


class ClinicalReasoningWorkflow(BaseWorkflow[WorkflowContext]):
    """Implements the clinical reasoning loop.

    Phase 1: Fetch all 4 MCP data sources in parallel — no ordering dependency.
    Phase 2: PII masking (fast, sync).
    Phase 3: RuleEvaluator (thread) ║ Agent 1 AnalyzeClinicalRisks (LLM) — run concurrently.
             Rule tier is collected just before Agent 2 fan-out (always done by then).
    Phase 4: Agent 2a MatchPolicy ║ Agent 2b WriteNarrative — parallel.
             Agent 2c AnnotateReasoningLines — concurrent background task started before Phase 4;
             result collected non-blocking after gather so it never extends the critical path.
    Phase 5: Merge results, apply fallback paths, finalize context.
    """

    def __init__(self, session: ClientSession):
        """Initialize with an active MCP session."""
        self.session = session
        self.masker = PIIMasker()

    async def execute(
        self,
        patient_id: str,
        patient_token: str,
        force_rule_based: bool = False,
        on_stage: Any = None,
    ) -> WorkflowContext:
        """Execute the full clinical reasoning loop."""
        logger.info(f"Executing Clinical Workflow for patient: {patient_id} (force_rule_based={force_rule_based})")
        context = WorkflowContext(patient_id=patient_id)

        # Phase 1: Fetch all 4 MCP data sources in parallel — no ordering dependency
        if on_stage: await on_stage(1, "Fetching patient data")
        constraints, signals, trends, ruleset = await asyncio.gather(
            self._call_mcp_tool("get_hard_constraints", self._mcp_args(patient_token, patient_id)),
            self._call_mcp_tool("get_clinical_signals",  self._mcp_args(patient_token, patient_id)),
            self._call_mcp_tool("get_biomarker_trends",  self._mcp_args(patient_token, patient_id)),
            self._call_mcp_tool("get_program_ruleset",   self._mcp_args(patient_token, patient_id)),
        )
        context.raw_context["get_hard_constraints"] = constraints
        context.raw_context["get_clinical_signals"]  = signals
        context.raw_context["get_biomarker_trends"]  = trends
        context.raw_context["get_program_ruleset"]   = ruleset

        demographics = constraints.get("patient_demographics", {})
        context.raw_context["get_patient_context"] = {
            "gender":    demographics.get("gender"),
            "age":       demographics.get("age"),
            "ethnicity": demographics.get("ethnicity"),
        }

        # Mask data before sending to LLM
        context.masked_context = self.masker.mask_data(context.raw_context)

        # Phase 2–4: Recommendation
        if on_stage: await on_stage(2, "Running program rules")
        await self._generate_recommendation(context, force_rule_based=force_rule_based, on_stage=on_stage)

        return context

    async def _generate_recommendation(self, context: WorkflowContext, force_rule_based: bool = False, on_stage: Any = None) -> None:
        """Rule evaluation ║ Agent 1, then Agent 2a ║ Agent 2b, with Agent 2c non-blocking.

        Opt 2: RuleEvaluator runs in a thread concurrently with Agent 1 — both only need
               Stage 1 data. Rule tier is awaited just before the Agent 2 fan-out (always done).
        Opt 1: AnnotateReasoningLines (Agent 2c) starts as an asyncio.create_task() immediately
               before the Agent 2a/2b gather. After gather, result is collected non-blocking:
               if annotation is done, use it; if still in-flight, cancel and use the deterministic
               fallback. This removes Agent 2c from the critical path entirely.
        """
        logger.debug(f"Phase 2: Generating recommendation (force_rule_based={force_rule_based})")

        clinical_signals = context.raw_context.get("get_clinical_signals", {})
        signals_fired = clinical_signals.get("signals_fired", [])

        demographics = context.raw_context.get("get_patient_context", {})
        gender = demographics.get("gender", "other")
        age = demographics.get("age", 0)
        ruleset = context.raw_context.get("get_program_ruleset", {})
        package_resolution_map = ruleset.get("package_resolution_map", {})

        if force_rule_based:
            rule_result = RuleEvaluator(signals_fired).evaluate()
            resolved_package = resolve_package(rule_result["rule_tier"], gender, age, package_resolution_map)
            context.ai_output = self._build_rule_based_output(
                rule_result=rule_result,
                clinical_signals=clinical_signals,
                resolved_package=resolved_package,
                ruleset=ruleset,
            )
            return

        # ── Opt 2: Start rule evaluation in a thread, runs concurrently with Agent 1 ──
        # RuleEvaluator is CPU-bound/sync; asyncio.to_thread() keeps the event loop free.
        # Agent 1 takes seconds (LLM), so rule eval (ms) finishes well before it completes.
        rule_task = asyncio.create_task(asyncio.to_thread(lambda: RuleEvaluator(signals_fired).evaluate()))

        # ── Agent 1: AnalyzeClinicalRisks ────────────────────────────────────────────
        # Failure here → full rule-based fallback (no partial AI output to preserve).
        try:
            if on_stage: await on_stage(3, "Matching profile and composing recommendation")
            _ai_start = time.monotonic()
            _cache_key = _risk_profile_cache_key(context.masked_context)
            _found, risk_profile = cache_service.get(_cache_key)
            if not _found:
                risk_profile = await b.AnalyzeClinicalRisks(
                    clinical_signals=json.dumps(context.masked_context.get("get_clinical_signals"), indent=2),
                    biomarker_trends=json.dumps(context.masked_context.get("get_biomarker_trends"), indent=2),
                    hard_constraints=json.dumps(context.masked_context.get("get_hard_constraints"), indent=2),
                    program_ruleset=json.dumps(context.masked_context.get("get_program_ruleset"), indent=2),
                )
                cache_service.set(_cache_key, risk_profile, settings.cache_signal_store_ttl_seconds)
            else:
                logger.debug("risk_profile cache hit — skipping AnalyzeClinicalRisks LLM call")
        except Exception as exc:
            rule_task.cancel()
            logger.exception(f"Agent 1 (AnalyzeClinicalRisks) failed. Falling back to rule-based: {exc}")
            context.metadata["ai_chain_ms"] = 0
            rule_result = RuleEvaluator(signals_fired).evaluate()
            resolved_package = resolve_package(rule_result["rule_tier"], gender, age, package_resolution_map)
            context.ai_output = self._build_rule_based_output(
                rule_result=rule_result,
                clinical_signals=clinical_signals,
                resolved_package=resolved_package,
                ruleset=ruleset,
            )
            return

        # Collect rule result — always done by now (ms vs. Agent 1's seconds)
        rule_result = await rule_task
        resolved_package = resolve_package(rule_result["rule_tier"], gender, age, package_resolution_map)

        # ── Opt 1: Start annotation as a concurrent background task ──────────────────
        # Launched before the Agent 2a/2b gather so it runs in parallel with both.
        # Collected non-blocking after the gather — never extends the critical path.
        annotation_task = asyncio.create_task(
            b.AnnotateReasoningLines(
                clinical_lines=getattr(risk_profile, "clinical_summary_bullets", []) or [],
            )
        )

        # ── Parallel fan-out: MatchPolicy + WriteNarrative ───────────────────────────
        # Agent 2c (AnnotateReasoningLines) is NOT in this gather — it runs concurrently above.
        # return_exceptions=True so a single failure doesn't cancel the other call.
        policy_result, narrative = await asyncio.gather(
            b.MatchPolicy(
                risk_profile=risk_profile,
                program_ruleset=json.dumps(context.masked_context.get("get_program_ruleset"), indent=2),
            ),
            b.WriteNarrative(risk_profile=risk_profile),
            return_exceptions=True,
        )
        context.metadata["ai_chain_ms"] = int((time.monotonic() - _ai_start) * 1000)

        # ── Opt 1: Non-blocking collection of annotation result ──────────────────────
        # If annotation finished during the gather, use the LLM result.
        # If still in-flight, cancel it and fall through to deterministic fallback.
        if annotation_task.done() and not annotation_task.cancelled():
            try:
                reasoning_annotations = annotation_task.result()
            except Exception as exc:
                logger.warning(f"Agent 2c (AnnotateReasoningLines) failed: {exc}")
                reasoning_annotations = None
        else:
            logger.debug("Agent 2c (AnnotateReasoningLines) still in-flight after gather — using deterministic fallback")
            annotation_task.cancel()
            reasoning_annotations = None

        policy_failed   = isinstance(policy_result, Exception)
        narrative_failed = isinstance(narrative, Exception)

        if policy_failed:
            logger.warning(f"Agent 2a (MatchPolicy) failed: {policy_result}")
        if narrative_failed:
            logger.warning(f"Agent 2b (WriteNarrative) failed: {narrative}")

        if policy_failed and narrative_failed:
            # Both parallel agents failed — fall back to rule-based
            logger.exception("Both Agent 2a and 2b failed. Falling back to rule-based output.")
            context.ai_output = self._build_rule_based_output(
                rule_result=rule_result,
                clinical_signals=clinical_signals,
                resolved_package=resolved_package,
                ruleset=ruleset,
            )
            return

        context.ai_output = self._map_final_to_ai_output(
            policy_result=policy_result if not policy_failed else None,
            narrative=narrative if not narrative_failed else None,
            reasoning_annotations=reasoning_annotations,
            risk_profile=risk_profile,
            rule_result=rule_result,
            demographics=demographics,
            package_resolution_map=package_resolution_map,
            ruleset=ruleset,
            signals_fired=set(signals_fired),
        )

    def _mcp_args(self, patient_token: str, patient_id: str | None = None) -> dict[str, str]:
        args: dict[str, str] = {"patient_token": patient_token}
        if patient_id:
            args["patient_id"] = patient_id
        return args

    def _map_final_to_ai_output(
        self,
        *,
        policy_result: Any,   # PolicyMatchResult | None
        narrative: Any,        # NarrativeScript | None
        reasoning_annotations: Any,  # list[ReasoningLineAnnotation] | None
        risk_profile: Any,
        rule_result: dict[str, Any],
        demographics: dict[str, Any],
        package_resolution_map: dict[str, Any],
        ruleset: dict[str, Any],
        signals_fired: set[str],
    ) -> dict[str, Any]:
        """Merge Agent 2a (policy) + Agent 2b (narrative) results.

        Either agent may be None if it failed — apply per-field fallback.
        """
        # ── Tier + add-ons (from MatchPolicy or rule-based fallback) ─────────
        if policy_result is not None:
            ai_tier = policy_result.ai_recommended_tier.value
            tier_deviation = policy_result.tier_deviation_justification
            add_ons = [
                {
                    "item_id":       item.item_id,
                    "priority":      item.priority.value,
                    "label":         item.label,
                    "product_code":  item.product_code,
                    "price_thb":     item.price_thb,
                    "category":      item.category,
                    "rationale":     item.rationale,
                }
                for item in policy_result.selected_add_ons
            ]
            policy_reasoning      = policy_result.policy_reasoning or ""
            program_justification = policy_result.policy_script.program_justification
            # priority_add_ons: BAML now returns PolicyAddOnSummary[]; map to wire shape
            priority_add_ons = [
                {"label": addon.label, "severity": _priority_to_severity(addon.priority.value)}
                for addon in policy_result.policy_script.priority_add_ons
            ]
            review_required = False
        else:
            # MatchPolicy failed — use rule tier + signal-matched add-ons
            ai_tier            = rule_result["rule_tier"]
            tier_deviation     = "Policy matching unavailable; rule-based tier applied."
            add_ons            = self._match_add_ons_from_signals(signals_fired=signals_fired, ruleset=ruleset)
            policy_reasoning   = f"Rule fallback: {rule_result.get('applied_rule_id')}"
            program_justification = (
                "Rule-based package and add-on selection applied while the policy agent was unavailable."
            )
            priority_add_ons = [
                {"label": item["label"], "severity": _priority_to_severity(item.get("priority", "Yellow"))}
                for item in add_ons[:4]
            ]
            review_required    = True

        resolved_package = resolve_package(
            ai_tier,
            demographics.get("gender", "other"),
            demographics.get("age", 0),
            package_resolution_map,
        )

        # ── Narrative (from WriteNarrative or fallback from risk_profile) ────
        if narrative is not None:
            summary_headline = narrative.summary_headline
            # Enrich top_findings and next_actions with highlight_terms via Python phrase matching.
            # BAML returns string[]; we wrap each into { text, highlight_terms } here so the FE
            # can render chips without running its own phrase-matching logic.
            top_findings = [
                {"text": strip_markdown_bold(s), "highlight_terms": find_highlight_terms(s)}
                for s in narrative.top_findings
            ]
            next_actions = [
                {"text": strip_markdown_bold(s), "highlight_terms": find_highlight_terms(s)}
                for s in narrative.next_actions
            ]
        else:
            # WriteNarrative failed — build from risk_profile.clinical_summary_bullets
            bullets_raw = getattr(risk_profile, "clinical_summary_bullets", []) or []
            summary_headline = risk_profile.severity_assessment or "Clinical findings require physician review."
            top_findings = [
                {"text": strip_markdown_bold(s), "highlight_terms": find_highlight_terms(s)}
                for s in (bullets_raw[:5] if bullets_raw else [summary_headline])
            ]
            next_actions = [
                {"text": s, "highlight_terms": find_highlight_terms(s)}
                for s in [
                    "Review the identified clinical findings with your physician.",
                    "Discuss the recommended programme items and follow-up priorities.",
                ]
            ]

        # ── Reasoning trace from Agent 1 ─────────────────────────────────────
        bullets = getattr(risk_profile, "clinical_summary_bullets", []) or []
        reasoning_lines = [f"- {line}" for line in bullets]
        if policy_reasoning:
            reasoning_lines.append(f"- Policy reasoning: {policy_reasoning}")

        if reasoning_annotations is not None:
            reasoning_trace_annotated = [
                {
                    "text": strip_markdown_bold(item.text),
                    "scope": "clinical_reasoning",
                    "sentiment": item.sentiment.lower() if isinstance(item.sentiment, str) else str(item.sentiment).lower(),
                    "highlight_terms": item.highlight_terms,
                }
                for item in reasoning_annotations
            ]
            if policy_reasoning:
                reasoning_trace_annotated.extend(
                    annotate_reasoning_lines_fallback([], policy_reasoning)
                )
        else:
            # LLM annotation failed — use deterministic fallback (always populated)
            reasoning_trace_annotated = annotate_reasoning_lines_fallback(bullets, policy_reasoning)

        return {
            "ai_recommended_tier":        ai_tier,
            "tier_deviation_justification": tier_deviation,
            "add_ons":                    add_ons,
            "reasoning_trace":            "\n".join(reasoning_lines),
            "reasoning_trace_annotated":  reasoning_trace_annotated,
            "supporting_signals":         risk_profile.supporting_signal_ids,
            "missing_signals":            risk_profile.missing_signal_ids,
            "communication_script": {
                "summary_headline":                strip_markdown_bold(summary_headline),
                "summary_headline_highlights":     find_highlight_terms(summary_headline),
                "top_findings":                    top_findings,
                "program_justification":           strip_markdown_bold(program_justification),
                "program_justification_highlights": find_highlight_terms(program_justification),
                "priority_add_ons":                priority_add_ons,
                "next_actions":                    next_actions,
            },
            "rule_preliminary_tier":      rule_result["rule_tier"],
            "recommendation_source":      "AI",
            "review_required":            review_required,
            "package_name":  resolved_package.get("package_name") if resolved_package else "TBD",
            "price_thb":     resolved_package.get("price_thb")    if resolved_package else 0,
        }

    def _build_rule_based_output(
        self,
        *,
        rule_result: dict[str, Any],
        clinical_signals: dict[str, Any],
        resolved_package: dict[str, Any] | None,
        ruleset: dict[str, Any],
    ) -> dict[str, Any]:
        rule_tier = rule_result["rule_tier"]
        matched_signals = rule_result.get("signals_matched", [])
        matched_text = ", ".join(matched_signals) if matched_signals else "routine findings"
        add_ons = self._match_add_ons_from_signals(
            signals_fired=set(matched_signals),
            ruleset=ruleset,
        )
        return {
            "ai_recommended_tier": rule_tier,
            "tier_deviation_justification": "AI chain unavailable; deterministic rule fallback applied.",
            "add_ons": add_ons,
            "reasoning_trace": (
                f"Rule-based fallback applied. Matched rule: {rule_result.get('applied_rule_id')} | "
                f"Condition: {rule_result.get('applied_condition')}"
            ),
            "reasoning_trace_annotated": annotate_reasoning_lines_fallback(
                [f"Rule-based fallback applied. Matched rule: {rule_result.get('applied_rule_id')}"]
            ),
            "supporting_signals": matched_signals,
            "missing_signals": clinical_signals.get("missing_signals", []),
            "communication_script": {
                "summary_headline": f"Current clinical findings ({matched_text}) indicate a {rule_tier} package.",
                "summary_headline_highlights": [],
                "top_findings": [
                    {"text": f"Matched signals: {matched_text}", "highlight_terms": []},
                ],
                "program_justification": (
                    "This recommendation follows deterministic rule matching while the AI chain is unavailable."
                ),
                "program_justification_highlights": [],
                "priority_add_ons": [
                    {"label": item["label"], "severity": _priority_to_severity(item.get("priority", "Yellow"))}
                    for item in add_ons[:4]
                ],
                "next_actions": [
                    {"text": "Please confirm this recommendation with the clinical team.", "highlight_terms": []},
                ],
            },
            "rule_preliminary_tier": rule_tier,
            "recommendation_source": "RuleBased",
            "review_required": True,
            "package_name": resolved_package.get("package_name") if resolved_package else "TBD",
            "price_thb":    resolved_package.get("price_thb")    if resolved_package else 0,
        }

    def _match_add_ons_from_signals(
        self,
        *,
        signals_fired: set[str],
        ruleset: dict[str, Any],
    ) -> list[dict[str, Any]]:
        """Match add-on items whose trigger_signals intersect with active signals.

        Used by both full rule-based fallback and partial MatchPolicy-failure paths.
        Safety Rule Validator in the orchestrator filters gender/age-ineligible items post-output.
        """
        _priority_order = {"Red": 0, "Orange": 1, "Yellow": 2, "Green": 3}
        matched: list[dict[str, Any]] = []
        for item in ruleset.get("add_on_library", []):
            triggers = set(item.get("trigger_signals", []))
            hit = triggers.intersection(signals_fired)
            if not hit:
                continue
            matched.append({
                "item_id":      item.get("item_code") or item.get("item_id", ""),
                "priority":     item.get("priority_level_default") or item.get("priority", "Yellow"),
                "label":        item.get("label", ""),
                "product_code": (item.get("navavej_product") or {}).get("product_code") or item.get("product_code", ""),
                "price_thb":    (item.get("navavej_product") or {}).get("price_thb"),  # preserve null
                "category":     item.get("category", ""),
                "rationale":    f"Triggered by active signal(s): {', '.join(sorted(hit))}",
            })
        matched.sort(key=lambda x: _priority_order.get(x["priority"], 2))
        return matched

    async def _call_mcp_tool(self, name: str, arguments: dict[str, Any]) -> Any:
        """Helper to call MCP tools and parse JSON output."""
        result = await self.session.call_tool(name, arguments)
        if not result.content:
            raise DataIntegrityError(f"Empty response from MCP tool: {name}")

        # FastMCP tools can return multiple content items; we typically want the first one's text
        raw_text = result.content[0].text
        return json.loads(raw_text)
