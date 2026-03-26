# Implementation Plan: Sentiment Scopes

## Phase 1 — Backend-Owned Evidence Sentiment ✅ DONE

1. Add a backend service that:
   - Normalizes `reasoning_trace` into lines
   - Filters policy reasoning lines
   - Assigns a `good|bad|neutral` sentiment label to each line
2. Extend recommendation response contract to include `reasoning_trace_annotated`.
3. Update the frontend to prefer backend annotations when present.

## Phase 2 — Extract Text Highlight Rules ✅ DONE

1. Extract inline text formatting rules from `RecommendationPanel` into a shared formatter module.
2. Centralize:
   - measurement highlighting regex
   - token normalization and dictionary substitution
   - severity suffix parsing for highlight items
   - sentence splitting helper
3. Update `RecommendationPanel` to use the shared module.

## Phase 3 — Fix Formatting Artifacts ✅ DONE

1. Improve measurement matching:
   - Support `135 / 87 mmHg` (spaces around slash)
   - Support `mm Hg` in addition to `mmHg`
2. Reduce whitespace artifacts:
   - Replace `text-justify` with `text-left` in chip-heavy blocks

## Phase 4 — Parallel LLM Sentiment + Schema Rework ✅ DONE

1. Parallel LLM annotation:
   - Added `AnnotateReasoningLines` BAML function (`ReasoningLineAnnotation[]` — `text`, `sentiment`, `highlight_terms`)
   - Runs in parallel with `MatchPolicy` + `WriteNarrative` via `asyncio.gather` — no latency cost
   - Deterministic fallback in `text_annotations.py` when LLM annotation fails
2. Annotation model extended:
   - Shape becomes `{ text, scope, sentiment, highlight_terms }` — scope set by Python, not LLM
   - `scope` distinguishes `clinical_reasoning` vs `policy_reasoning`
   - `sentiment` typed as `LineSentiment` BAML enum (`Risk | Reassuring | Neutral` with lowercase aliases)
3. Policy Reasoning integration:
   - Lines filtered by `scope === "policy_reasoning"` in frontend
   - Sentiment read from `line.sentiment` (was previously hardcoded to `"informational"`)
   - Fallback path now correctly assigns `scope: "policy_reasoning"` to lines with `Policy reasoning:` prefix
4. Consultation schema rework:
   - `WriteNarrative` → `NarrativeScript` (`summary_headline`, `top_findings`, `next_actions`)
   - `MatchPolicy` → `PolicyMatchResult` with `PolicyScript` (`program_justification`, `priority_add_ons`)
   - Old `MatchAndCompose` tombstoned
   - Frontend renders new fields with graceful backwards-compat fallback

## Phase 5 — Highlight-Rule Narrowing ✅ DONE

1. `UNIT_HIGHLIGHT_REGEX` narrowed to blood pressure composites and percentages only:
   - Auto-highlights: `135/87 mmHg`, `92%`
   - No longer auto-highlights: `108.5 mg/dL`, `86 mL/min/1.73 m²`, `100 mg/dL`
2. `HIGHLIGHT_PHRASES` list added — directly matches human-readable clinical names in prose (case-insensitive):
   - Diagnoses: `Stage 2 Hypertension`, `Atherogenic Dyslipidemia`, `Prediabetes`, `Metabolic Syndrome`, etc.
   - Screenings: `Colonoscopy`, `Influenza Vaccine`, `Exercise Stress Test`, `Carotid Ultrasound`, etc.
   - Package tiers: `Premium`, `Advanced`
3. Dictionary step scoped to snake_case keys only (`key.includes("_")`):
   - Translates `bp_stage2_htn` → `Stage 2 Hypertension` in text
   - No longer abbreviates readable LLM prose like `Stage 1 Hypertension confirmed`
4. `scope`-aware rendering:
   - `policy_reasoning` lines skip the unit regex sweep entirely (policy text is program logic, not measurements)

## Phase 6 — Verification ✅ DONE

- 14/15 frontend tests passing
- 1 pre-existing failure (`Safety Reviewed` text split by icon node) — unrelated to this scope
- 3 new tests added covering: structured annotation path, fallback path policy visibility, new `CommunicationScript` fields
