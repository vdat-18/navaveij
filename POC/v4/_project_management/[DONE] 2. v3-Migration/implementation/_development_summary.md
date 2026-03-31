# Development Summary — v3 Migration

_Interpreted status of each migration item. Updated as work progresses._

---

## MIG-1 — BAML 3-Agent Pipeline

- Status: Complete
- BAML source in `baml_src/clinical/recommendation_output.baml` migrated: `GenerateRecommendation()` replaced with `AnalyzeClinicalRisks()` + `MatchProgramRules()` + `ComposeRecommendation()`. New types: `ClinicalRiskProfile`, `RecommendationPlan`, `FinalRecommendation`. Existing `ValidateRecommendation()`, `Tier`, `PriorityLevel`, `AddOnItem`, `CommunicationScript` preserved.
- `baml_client/` regenerated via `uv run baml-cli generate` — confirmed by MIG-7 run (BAML CLI 0.213.0, exit 0).

## MIG-2 — Workflow Update (RuleEvaluator + 3-agent chain + fallback)

- Status: Complete
- `backend/src/services/workflows/clinical.py` rewired: `RuleEvaluator` always runs to establish `rule_preliminary_tier`; 3-agent chain executes when `force_rule_based=False`; graceful fallback to `_build_rule_based_output()` on any exception; `_map_final_to_ai_output()` maps `FinalRecommendation` to `_normalize_stage2()`-compatible dict with keys: `ai_recommended_tier`, `tier_deviation_justification`, `add_ons`, `reasoning_trace`, `supporting_signals`, `missing_signals`, `communication_script`, `rule_preliminary_tier`.

## MIG-3 — Orchestrator Update (force_rule_based + security_metadata)

- Status: Complete
- `backend/src/services/orchestrator.py`: `force_rule_based` threaded through to `workflow.execute()`; `masked_ai_output` captured via `.copy()` before the second `rehydrator.rehydrate()` call; `security_metadata` injected into `rehydrated_result` after the second pass (prevents UUID tokens from being rehydrated).

## MIG-4 — contracts.py Update (force_rule_based in request + security_metadata in response)

- Status: Complete
- `force_rule_based: bool = False` added to `RecommendRequest`; `security_metadata: dict[str, Any]` added to `RecommendResponse` (non-optional); `force_rule_based` included in `_recommendation_cache_key()` SHA-256 hash to partition AI vs rule-based cache entries; `recommendation_source` and `review_required` use orchestrator-provided values with confidence-score fallback only when absent.

## MIG-5 — Frontend: Hybrid AI/Rules Toggle

- Status: Complete
- `isRuleBasedForced` state + amber/pulsing toggle button in `page.tsx`; `force_rule_based: forceRuleBased` in `api.ts` POST body; `isRuleBasedForced: boolean` prop + `useEffect` dep in `RecommendationPanel.tsx` (re-fetch on toggle without remounting, `key={patientToken}` preserved).

## MIG-6 — Frontend: PII Privacy Mode Toggle

- Status: Complete
- `privacyMode` + `securityMetadata` state in `page.tsx`; `getDisplayValue(originalValue, fallbackToken)` helper with `rehydration_map` reverse-lookup; Eye/EyeOff toggle (red when on / emerald when off); all 5 PII fields wrapped (`patient_name`, `patient_id`, `mrn`, `phone`, `email`); `handleSelectPatient()` resets `securityMetadata` on patient change; `onSecurityMetadata` callback prop lifts `security_metadata` from `RecommendationPanel`; masked `reasoning_trace` rendered conditionally with double-fallback safety.

## MIG-7 — Synthesis: enrichment.baml + scripts

- Status: Complete
- `enrichment.baml` copied to `POC/v2/baml_src/synthesis/`. All 4 `enrich_*.py` scripts present in `POC/v2/scripts/`. `uv run baml-cli generate` exit 0 (BAML CLI 0.213.0). All 4 enrichment script import checks pass.
