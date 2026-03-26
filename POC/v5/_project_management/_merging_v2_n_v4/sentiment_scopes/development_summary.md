# Development Summary

## Implementation Order

### Step 1: Backend evidence annotation helper

Created:

- `backend/src/services/text_annotations.py`

Capabilities:

- Splits `reasoning_trace` into normalized lines
- Removes bullet prefixes
- Assigns deterministic `risk|reassuring|neutral` sentiment per line (keyword-based fallback)
- Returns `{ text, scope, sentiment, highlight_terms }` shape
- Policy reasoning lines get `scope: "policy_reasoning"` and `sentiment: "informational"`
- Used as fallback when LLM annotation fails

### Step 2: Backend response contract wiring

Modified:

- `backend/src/api/routes/contracts.py`

Changes:

- Added `reasoning_trace_annotated` to `RecommendResponse`
- Populated during Stage-2 normalization

### Step 3: Frontend shared formatter extraction

Created:

- `frontend/src/shared/recommendationTextFormatting.tsx`

Extracted from the panel and extended:

- `UNIT_HIGHLIGHT_REGEX` — narrowed to BP composites + `%` only (no longer matches `mg/dL`, `mL/min`, etc.)
- `HIGHLIGHT_PHRASES_REGEX` — curated list of human-readable clinical phrases matched directly in prose
- Dictionary substitution — guarded to snake_case keys only; does not abbreviate readable LLM text
- `scope` parameter on `renderHighlightedText` — skips unit regex for `policy_reasoning`
- Severity suffix parsing for `(Red|Orange|Yellow)`
- Sentence splitting helper for consultation scripts
- `AnnotatedReasoningLine` interface re-exported from `@/types/recommendation` (no duplicate)

### Step 4: Parallel LLM annotation (BAML + Python)

Modified:

- `baml_src/clinical/recommendation_output.baml`
- `backend/src/services/workflows/clinical.py`

Changes:

- Added `AnnotateReasoningLines` BAML function → `ReasoningLineAnnotation[]`
- Added `LineSentiment` BAML enum (`Risk | Reassuring | Neutral` with lowercase `@alias`)
- `clinical.py` runs 3-way `asyncio.gather(MatchPolicy, WriteNarrative, AnnotateReasoningLines)`
- Python adds `scope: "clinical_reasoning"` to LLM-annotated lines
- Policy reasoning lines extended via `annotate_reasoning_lines_fallback([], policy_reasoning)`
- `return_exceptions=True` + per-task failure handling — annotation failure never aborts main result

### Step 5: Consultation schema rework

Modified:

- `baml_src/clinical/recommendation_output.baml`
- `backend/src/api/routes/contracts.py`
- `frontend/src/types/recommendation.ts`
- `frontend/src/components/dashboard/RecommendationPanel.tsx`

Changes:

- `NarrativeScript`: `summary_headline`, `top_findings`, `next_actions` (replaces verbose `WriteNarrative` output)
- `PolicyScript`: `program_justification`, `priority_add_ons` (nested in `PolicyMatchResult`)
- Old `MatchAndCompose` tombstoned in BAML
- `_map_communication_script()` in `contracts.py` adds backwards-compat aliases
- Frontend renders new fields with graceful fallback to old field names
- `baml_src/clinical/README.md` updated to document 3-agent architecture

### Step 6: Frontend Policy Reasoning fixes

Modified:

- `frontend/src/components/dashboard/RecommendationPanel.tsx`

Bug fixes:

- **Bug A**: `renderHighlightedText(line.text, "informational", ...)` → `renderHighlightedText(line.text, line.sentiment, ..., line.scope)`
- **Bug B**: Fallback path was assigning all lines `scope: "clinical_reasoning"` — now detects `Policy reasoning:` prefix and assigns `scope: "policy_reasoning"`, making the Policy Reasoning section visible on both paths

### Step 7: Type cleanup

- `AnnotatedReasoningLine` duplicate removed from `recommendationTextFormatting.tsx` — imported from `@/types/recommendation` instead
- `ReasoningLineAnnotation.sentiment` typed as BAML enum instead of unconstrained `string`
- `baml_src/clinical/README.md` — removed stale reference to `GenerateRecommendation`
