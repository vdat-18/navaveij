"""Tests for ClinicalReasoningWorkflow parallelization changes (Opt 1 & Opt 2).

Opt 1: AnnotateReasoningLines (Agent 2c) runs as a concurrent asyncio.create_task()
       and is collected non-blocking after the Agent 2a/2b gather.
         - When annotation completes during the gather → LLM result is used.
         - When annotation raises → deterministic fallback activates.
         - When annotation is still in-flight → task is cancelled, fallback activates.

Opt 2: RuleEvaluator runs in asyncio.to_thread() concurrent with Agent 1.
         - On normal path → rule tier is correctly collected and applied.
         - On Agent 1 failure → rule_task is cancelled; sync fallback rule eval runs.

Regression tests ensure force_rule_based, Agent-1-failure, and both-Agent-2-failure
paths all still produce correct output after the refactor.
"""

import asyncio
import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Stub baml_client before the clinical workflow module is imported.
for _mod in (
    "baml_client",
    "baml_client.async_client",
    "baml_client.sync_client",
    "baml_client.types",
    "baml_client.globals",
):
    sys.modules.setdefault(_mod, MagicMock())

from src.services.workflows.base import WorkflowContext  # noqa: E402
from src.services.workflows.clinical import ClinicalReasoningWorkflow  # noqa: E402


# ── Fixtures & helpers ────────────────────────────────────────────────────────

@pytest.fixture()
def workflow() -> ClinicalReasoningWorkflow:
    return ClinicalReasoningWorkflow(session=MagicMock())


@pytest.fixture()
def context() -> WorkflowContext:
    ctx = WorkflowContext(patient_id="pat-test")
    ctx.raw_context = {
        "get_clinical_signals": {"signals_fired": ["bp_elevated"]},
        "get_biomarker_trends": {},
        "get_hard_constraints": {"patient_demographics": {"gender": "Male", "age": 50, "ethnicity": "Asian"}},
        "get_program_ruleset":  {"package_resolution_map": {}, "add_on_library": [], "tier_selection_rules": []},
        "get_patient_context":  {"gender": "Male", "age": 50, "ethnicity": "Asian"},
    }
    ctx.masked_context = {k: v for k, v in ctx.raw_context.items()}
    return ctx


def _risk_profile(bullets=None):
    rp = MagicMock()
    rp.clinical_summary_bullets = bullets or ["BP elevated above target."]
    rp.severity_assessment = "Moderate risk requiring monitoring."
    rp.supporting_signal_ids = ["bp_elevated"]
    rp.missing_signal_ids = []
    rp.suggested_tier = MagicMock(value="Advanced")
    return rp


def _policy(tier="Advanced"):
    p = MagicMock()
    p.ai_recommended_tier.value = tier
    p.tier_deviation_justification = ""
    p.selected_add_ons = []
    p.policy_reasoning = "Advanced tier warranted."
    p.policy_script.program_justification = "Recommend Advanced package."
    p.policy_script.priority_add_ons = []
    return p


def _narrative():
    n = MagicMock()
    n.summary_headline = "Elevated BP requires monitoring."
    n.top_findings = ["BP above target."]
    n.next_actions = ["Follow up with cardiologist."]
    return n


def _annotation(sentiment="risk", terms=None):
    a = MagicMock()
    a.text = "BP elevated above target."
    a.sentiment = sentiment
    a.highlight_terms = terms or ["BP"]
    return a


# ── Opt 1 — Annotation non-blocking collection ────────────────────────────────

@pytest.mark.asyncio
async def test_opt1_annotation_used_when_completes_during_gather(workflow, context):
    """LLM annotation result is used when the task finishes before the gather returns."""
    with (
        patch("src.services.workflows.clinical.b") as mock_b,
        patch("src.services.workflows.clinical.cache_service") as mock_cache,
        patch("src.services.workflows.clinical.resolve_package", return_value={}),
    ):
        mock_cache.get.return_value = (False, None)
        mock_b.AnalyzeClinicalRisks = AsyncMock(return_value=_risk_profile())
        mock_b.MatchPolicy = AsyncMock(return_value=_policy())
        mock_b.WriteNarrative = AsyncMock(return_value=_narrative())
        # Annotation also returns instantly — will be done when gather returns
        mock_b.AnnotateReasoningLines = AsyncMock(return_value=[_annotation(sentiment="risk", terms=["BP"])])

        await workflow._generate_recommendation(context)

    assert context.ai_output["recommendation_source"] == "AI"
    annotated = context.ai_output["reasoning_trace_annotated"]
    assert annotated, "reasoning_trace_annotated should not be empty"
    # LLM-sourced annotation carries our mock sentiment and highlight_terms
    assert any(
        item["sentiment"] == "risk" and "BP" in item.get("highlight_terms", [])
        for item in annotated
    ), "LLM annotation result should be reflected in reasoning_trace_annotated"


@pytest.mark.asyncio
async def test_opt1_deterministic_fallback_when_annotation_raises(workflow, context):
    """Deterministic fallback activates when AnnotateReasoningLines raises."""
    bullets = ["Colonoscopy overdue > 8 years (screening gap)."]

    with (
        patch("src.services.workflows.clinical.b") as mock_b,
        patch("src.services.workflows.clinical.cache_service") as mock_cache,
        patch("src.services.workflows.clinical.resolve_package", return_value={}),
    ):
        mock_cache.get.return_value = (False, None)
        mock_b.AnalyzeClinicalRisks = AsyncMock(return_value=_risk_profile(bullets=bullets))
        mock_b.MatchPolicy = AsyncMock(return_value=_policy())
        mock_b.WriteNarrative = AsyncMock(return_value=_narrative())
        mock_b.AnnotateReasoningLines = AsyncMock(side_effect=RuntimeError("LLM annotation failed"))

        await workflow._generate_recommendation(context)

    assert context.ai_output["recommendation_source"] == "AI"
    annotated = context.ai_output["reasoning_trace_annotated"]
    assert annotated, "Fallback annotation should still produce output"
    # Deterministic fallback detects "overdue" keyword → sentiment "risk"
    assert any(item["sentiment"] == "risk" for item in annotated)


@pytest.mark.asyncio
async def test_opt1_deterministic_fallback_when_annotation_in_flight(workflow, context):
    """Deterministic fallback activates when annotation is still running after gather."""
    async def _slow_annotation(*_args, **_kwargs):
        await asyncio.sleep(9999)  # never finishes within test lifetime

    with (
        patch("src.services.workflows.clinical.b") as mock_b,
        patch("src.services.workflows.clinical.cache_service") as mock_cache,
        patch("src.services.workflows.clinical.resolve_package", return_value={}),
    ):
        mock_cache.get.return_value = (False, None)
        mock_b.AnalyzeClinicalRisks = AsyncMock(return_value=_risk_profile())
        mock_b.MatchPolicy = AsyncMock(return_value=_policy())
        mock_b.WriteNarrative = AsyncMock(return_value=_narrative())
        mock_b.AnnotateReasoningLines = AsyncMock(side_effect=_slow_annotation)

        await workflow._generate_recommendation(context)

    # Annotation was still sleeping → workflow must have cancelled it and used fallback
    assert context.ai_output["recommendation_source"] == "AI"
    assert context.ai_output["reasoning_trace_annotated"], "Fallback should always produce output"


# ── Opt 2 — RuleEvaluator concurrent with Agent 1 ────────────────────────────

@pytest.mark.asyncio
async def test_opt2_rule_tier_correctly_applied(workflow, context):
    """Rule tier from RuleEvaluator (run in thread) is correctly merged into output."""
    with (
        patch("src.services.workflows.clinical.b") as mock_b,
        patch("src.services.workflows.clinical.cache_service") as mock_cache,
        patch("src.services.workflows.clinical.resolve_package", return_value={"package_name": "Advanced Plus", "price_thb": 15000}),
        patch("src.services.workflows.clinical.RuleEvaluator") as mock_evaluator_cls,
    ):
        mock_cache.get.return_value = (False, None)
        mock_evaluator_cls.return_value.evaluate.return_value = {
            "rule_tier": "Advanced",
            "applied_rule_id": "rule-bp-high",
            "applied_condition": "bp_elevated",
            "signals_matched": ["bp_elevated"],
        }
        mock_b.AnalyzeClinicalRisks = AsyncMock(return_value=_risk_profile())
        mock_b.MatchPolicy = AsyncMock(return_value=_policy(tier="Advanced"))
        mock_b.WriteNarrative = AsyncMock(return_value=_narrative())
        mock_b.AnnotateReasoningLines = AsyncMock(return_value=[_annotation()])

        await workflow._generate_recommendation(context)

    assert context.ai_output["rule_preliminary_tier"] == "Advanced"
    assert context.ai_output["package_name"] == "Advanced Plus"


@pytest.mark.asyncio
async def test_opt2_agent1_failure_falls_back_to_rule_based(workflow, context):
    """When Agent 1 fails, rule_task is cancelled and sync fallback rule eval runs."""
    with (
        patch("src.services.workflows.clinical.b") as mock_b,
        patch("src.services.workflows.clinical.cache_service") as mock_cache,
        patch("src.services.workflows.clinical.resolve_package", return_value={}),
        patch("src.services.workflows.clinical.RuleEvaluator") as mock_evaluator_cls,
    ):
        mock_cache.get.return_value = (False, None)
        mock_evaluator_cls.return_value.evaluate.return_value = {
            "rule_tier": "Standard",
            "applied_rule_id": "rule-default",
            "applied_condition": "default",
            "signals_matched": [],
        }
        mock_b.AnalyzeClinicalRisks = AsyncMock(side_effect=RuntimeError("LLM timeout"))

        await workflow._generate_recommendation(context)

    assert context.ai_output["recommendation_source"] == "RuleBased"
    assert context.ai_output["ai_recommended_tier"] == "Standard"
    assert context.metadata.get("ai_chain_ms") == 0


# ── Regression tests ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_regression_force_rule_based_skips_llm(workflow, context):
    """force_rule_based=True produces rule-based output without calling any LLM."""
    with (
        patch("src.services.workflows.clinical.b") as mock_b,
        patch("src.services.workflows.clinical.resolve_package", return_value={}),
        patch("src.services.workflows.clinical.RuleEvaluator") as mock_evaluator_cls,
    ):
        mock_evaluator_cls.return_value.evaluate.return_value = {
            "rule_tier": "Premium",
            "applied_rule_id": "rule-premium",
            "applied_condition": "multi_risk",
            "signals_matched": ["bp_elevated"],
        }

        await workflow._generate_recommendation(context, force_rule_based=True)

    assert context.ai_output["recommendation_source"] == "RuleBased"
    assert context.ai_output["ai_recommended_tier"] == "Premium"
    mock_b.AnalyzeClinicalRisks.assert_not_called()
    mock_b.MatchPolicy.assert_not_called()
    mock_b.WriteNarrative.assert_not_called()
    mock_b.AnnotateReasoningLines.assert_not_called()


@pytest.mark.asyncio
async def test_regression_both_agent2_fail_falls_back_to_rule_based(workflow, context):
    """When both MatchPolicy and WriteNarrative fail, rule-based fallback is returned."""
    with (
        patch("src.services.workflows.clinical.b") as mock_b,
        patch("src.services.workflows.clinical.cache_service") as mock_cache,
        patch("src.services.workflows.clinical.resolve_package", return_value={}),
        patch("src.services.workflows.clinical.RuleEvaluator") as mock_evaluator_cls,
    ):
        mock_cache.get.return_value = (False, None)
        mock_evaluator_cls.return_value.evaluate.return_value = {
            "rule_tier": "Standard",
            "applied_rule_id": "rule-default",
            "applied_condition": "default",
            "signals_matched": [],
        }
        mock_b.AnalyzeClinicalRisks = AsyncMock(return_value=_risk_profile())
        mock_b.MatchPolicy = AsyncMock(side_effect=RuntimeError("policy agent down"))
        mock_b.WriteNarrative = AsyncMock(side_effect=RuntimeError("narrative agent down"))
        mock_b.AnnotateReasoningLines = AsyncMock(return_value=[_annotation()])

        await workflow._generate_recommendation(context)

    assert context.ai_output["recommendation_source"] == "RuleBased"
    assert context.ai_output["review_required"] is True


@pytest.mark.asyncio
async def test_regression_cache_hit_skips_agent1(workflow, context):
    """A cached risk_profile skips the AnalyzeClinicalRisks LLM call."""
    cached_profile = _risk_profile()

    with (
        patch("src.services.workflows.clinical.b") as mock_b,
        patch("src.services.workflows.clinical.cache_service") as mock_cache,
        patch("src.services.workflows.clinical.resolve_package", return_value={}),
        patch("src.services.workflows.clinical.RuleEvaluator") as mock_evaluator_cls,
    ):
        mock_cache.get.return_value = (True, cached_profile)
        mock_evaluator_cls.return_value.evaluate.return_value = {
            "rule_tier": "Advanced",
            "applied_rule_id": "rule-bp",
            "applied_condition": "bp_elevated",
            "signals_matched": ["bp_elevated"],
        }
        mock_b.MatchPolicy = AsyncMock(return_value=_policy())
        mock_b.WriteNarrative = AsyncMock(return_value=_narrative())
        mock_b.AnnotateReasoningLines = AsyncMock(return_value=[_annotation()])

        await workflow._generate_recommendation(context)

    mock_b.AnalyzeClinicalRisks.assert_not_called()
    assert context.ai_output["recommendation_source"] == "AI"
