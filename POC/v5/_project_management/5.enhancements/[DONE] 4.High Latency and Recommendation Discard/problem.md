# Problem Statement

## 1) Sequential MCP Calls

The 4 MCP tool calls (`get_hard_constraints`, `get_clinical_signals`, `get_biomarker_trends`,
`get_program_ruleset`) are executed across 3 sequential async phase methods in `clinical.py`.
None of these calls has any data dependency on the others — they read from independent stores.
However, each awaits the previous one to complete before starting. With typical MCP round-trips
of ~300–800ms each, the cumulative sequential overhead is ~1.5–3s per cold request.

## 2) Agent 2 Monolithic LLM Call

`MatchAndCompose` combines two conceptually independent tasks in a single ~11s LLM call:

- **Part 1 (Policy Matching):** Determine tier, select add-ons, write rationale and highlights.
  Requires: `risk_profile` + `program_ruleset`.
- **Part 2 (Narrative):** Write `health_summary` and `next_steps`.
  Requires: `risk_profile` only. No add-ons needed.

`health_summary` and `next_steps` do not depend on the selected add-ons. Generating them in
the same sequential LLM call as the policy matching forces the entire ~11s budget even when
the narrative could complete in ~4s independently.

## 3) All-or-Nothing AI Chain Failure Mode

A single `try/except` block in `_generate_recommendation()` wraps both Agent 1
(`AnalyzeClinicalRisks`) and Agent 2 (`MatchAndCompose`). Any exception at any point — including
a timeout on Agent 2 after Agent 1 has already produced a valid `ClinicalRiskProfile` — causes
the entire AI result to be discarded and `_build_rule_based_output()` to be called.

`_build_rule_based_output()` always returns `add_ons: []`. The ruleset `add_on_library` contains
28+ items with `trigger_signals`, but these are never consulted in fallback paths. The ROC staff
receives a bare tier recommendation with no add-on guidance and `review_required: true`.
