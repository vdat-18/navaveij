# ENH-7 — Merge Agents 2 + 3 → `MatchAndCompose`

**Status:** ✅ Complete (2026-03-19)
**Bottleneck addressed:** B1 (sequential LLM calls — removes 1 of 3)
**Priority:** P1 (~2–8s saving per request, cold and warm)

---

## Background

Dependency analysis of the 3-agent chain:
- Agent 2 (`MatchProgramRules`) inputs: `risk_profile` (from Agent 1) + `program_ruleset` (JSON)
- Agent 3 (`ComposeRecommendation`) inputs: `risk_profile` (from Agent 1) + `plan` (from Agent 2)

True parallelism is not possible — Agent 3 depends on both upstream agents. However, since Agent 3's only additional input over Agent 2 is Agent 2's own output, the two calls can be merged: a single `MatchAndCompose` function receives `risk_profile` + `program_ruleset` and returns both the policy decision and the communication script.

## Files to Modify

| File | Change |
|------|--------|
| `baml_src/clinical/recommendation_output.baml` | Add `RecommendationWithScript` class; add `MatchAndCompose` function; remove `MatchProgramRules` and `ComposeRecommendation` |
| `backend/src/services/workflows/clinical.py` | Replace 2-call chain with `await b.MatchAndCompose(...)`; update `_map_final_to_ai_output()` field paths |

## Pre-condition Check

- [ ] Confirm ENH-2 is complete (safety validator no longer uses an LLM — avoids confusion about which functions remain)
- [ ] Read current `_map_final_to_ai_output()` signature and field mappings before editing
- [ ] Run `uv run pytest scripts/tests -v` and confirm clean baseline before starting

## BAML Changes

**New type:**
```baml
class RecommendationWithScript {
  ai_recommended_tier Tier
  tier_deviation_justification string?
  selected_add_ons AddOnItem[]
  policy_reasoning string
  communication_script CommunicationScript
}
```

**New function:**
```baml
function MatchAndCompose(
  risk_profile: ClinicalRiskProfile,
  program_ruleset: string
) -> RecommendationWithScript
  client NavaveijClient
  prompt #"
    Role: Navavej Program Specialist and Clinical Communicator.
    Task: Given the clinical risk profile and program ruleset, do two things:
    1. Select the appropriate package tier and add-on items per program policy.
       Justify any deviation from the suggested tier in tier_deviation_justification.
    2. Compose a patient-facing communication script with all four sections:
       health_summary, recommendation_rationale, addon_highlights, next_steps.
    Use professional medical English. No raw snake_case identifiers. No greetings.
  "#
```

**Remove:** `MatchProgramRules`, `ComposeRecommendation`, `RecommendationPlan`, `FinalRecommendation`

Run: `uv run baml-cli generate`

## Workflow Changes

Field path delta in `_map_final_to_ai_output()`:

| Field | Old source | New source |
|-------|-----------|-----------|
| `ai_recommended_tier` | `final.plan.ai_recommended_tier` | `result.ai_recommended_tier` |
| `tier_deviation_justification` | `final.plan.tier_deviation_justification` | `result.tier_deviation_justification` |
| `add_ons` | `final.plan.selected_add_ons` | `result.selected_add_ons` |
| `reasoning_trace` | bullets + `final.plan.policy_reasoning` | bullets + `result.policy_reasoning` |
| `communication_script` | `final.communication_script` | `result.communication_script` |

No changes to `_build_rule_based_output()`, `_normalize_stage2()`, or any contract route.

## Exit Evidence

- [x] `uv run baml-cli generate` exits 0
- [x] Regression suite passes
- [x] `POST /recommend` returns `recommendation_source: "AI"` with non-empty `communication_script` and `add_ons`
- [ ] `ai_chain_ms` ≈ ⅔ of pre-ENH-7 baseline — pending actual latency measurement (no baseline captured before implementation)

## Implementation Notes (2026-03-19)

`RecommendationWithScript` class and `MatchAndCompose` function added to `recommendation_output.baml`. `MatchProgramRules`, `ComposeRecommendation`, `RecommendationPlan`, and `FinalRecommendation` removed.

`clinical.py`: two-call chain replaced with single `await b.MatchAndCompose(risk_profile=..., program_ruleset=...)`. `_map_final_to_ai_output()` updated to read from `result.*` (flat) instead of `final.plan.*` / `final.communication_script`.

Phase 4 comment in `clinical.py` still references "3-agent" — minor cosmetic; not a functional issue.
