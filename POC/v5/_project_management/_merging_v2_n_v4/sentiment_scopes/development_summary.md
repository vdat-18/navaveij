# Development Summary

## Implementation Order

### Step 1: Backend evidence annotation helper

Created:

- `backend/src/services/text_annotations.py`

Capabilities (original):

- Splits `reasoning_trace` into normalized lines
- Removes bullet prefixes; assigns deterministic `risk|reassuring|neutral` sentiment
- Returns `{ text, scope, sentiment, highlight_terms }` shape

**Phase 6 additions:**

- `CLINICAL_PHRASES: list[str]` — 60+ clinical terms, sorted longest-first (mirrors former FE `CLINICAL_TERMS`)
- `_BP_UNIT_REGEX` — matches BP composites (`135/87 mmHg`, `135 / 87 mmHg`) and percentages
- `_QUOTE_CLEANUP_REGEX` — strips smart/curly quotes at normalization time
- `find_highlight_terms(text: str) -> list[str]` — phrase matching + BP regex on any text string; used by fallback annotator and consultation enrichment
- Fallback path now populates `highlight_terms` (was always `[]`)

### Step 2: Backend response contract wiring

Modified:

- `backend/src/api/routes/contracts.py`

Original changes:

- Added `reasoning_trace_annotated` to `RecommendResponse`

**Phase 6 additions:**

- `import re` added
- `_parse_priority_add_on_string(value: str)` — parses legacy `"Label (Red)"` format into `{ label, severity }`
- `_map_communication_script()` rewritten to handle both new structured shapes and legacy string shapes:
  - `top_findings`: new `[{ text, highlight_terms }]`; legacy `string[]` auto-wrapped
  - `next_actions`: same
  - `priority_add_ons`: new `[{ label, severity }]`; legacy strings parsed via `_parse_priority_add_on_string`
  - New fields: `summary_headline_highlights`, `program_justification_highlights`
  - Legacy aliases preserved: `opening`, `health_summary`, `recommendation_explanation`, `add_on_highlights`, `next_steps`

### Step 3: Frontend shared formatter extraction

Created then simplified:

- `frontend/src/shared/recommendationTextFormatting.tsx`

**Phase 6 removals:**

- `CLINICAL_TERMS` list + CLINICAL_TERMS sweep in `collectHighlightSpans`
- `UNIT_HIGHLIGHT_REGEX` + unit pass in `collectHighlightSpans`
- `MEANINGFUL_DISPLAY_TERMS` and dictionary substitution (snake_case → display term)
- `CLINICAL_ACRONYMS` and `normalizeClinicalToken`
- `**...**` markdown extraction from `renderHighlightedText`
- `parseHighlightSeverity` string parsing (regex + suffix logic)
- `splitConsultationSentences`
- `scope` parameter from `renderHighlightedText` and `collectHighlightSpans`

**Phase 6 additions / renames:**

- `severityToStyles(severity: HighlightSeverity)` — severity→Tailwind CSS mapping (was the CSS half of `parseHighlightSeverity`)
- `collectHighlightSpans(text, highlightTerms)` — single-pass, applies API-supplied terms only (priority 0)
- `renderHighlightedText` simplified to: quote cleanup → apply `highlight_terms` → deduplicate → render chips

### Step 4: Frontend consumption updates

Modified:

- `frontend/src/components/dashboard/RecommendationPanel.tsx`
- `frontend/src/types/recommendation.ts`

**Phase 4 changes (original):**

- Panel prefers `reasoning_trace_annotated` when present; falls back to string parsing

**Phase 6 changes:**

- `import` updated: removed `parseHighlightSeverity`, `splitConsultationSentences`; added `severityToStyles`
- Reasoning trace fallback path removed: `structuredReasoningLines = data.reasoning_trace_annotated ?? []`
- Consultation derivation simplified — no string splitting, no legacy field lookups for `top_findings`/`next_actions`/`priority_add_ons`
- `top_findings` render: `finding.text` + `finding.highlight_terms` (was `sentence: string`)
- `next_actions` render: `action.text` + `action.highlight_terms` (was `sentence: string`)
- `priority_add_ons` render: `severityToStyles(addon.severity)` + `addon.label` (was `parseHighlightSeverity(highlight: string)`)
- `summary_headline` render: passes `consultationSummaryHighlights`
- `program_justification` render: passes `consultationProgramHighlights`

**Types (`recommendation.ts`):**

- Added `ConsultationFinding: { text: string; highlight_terms: string[] }`
- Added `HighlightSeverity = "critical" | "caution" | "moderate" | "neutral"`
- Added `AddOnItem: { label: string; severity: HighlightSeverity }`
- Updated `CommunicationScript` to use new types; legacy aliases kept as optional fields

### Step 5: BAML changes

Modified:

- `baml_src/clinical/recommendation_output.baml`

**Phase 4 (original):**

- `AnnotateReasoningLines` function + `ReasoningLineAnnotation` class
- `LineSentiment` enum with lowercase `@alias`

**Phase 6 additions:**

- `PolicyAddOnSummary` class (`label: string`, `priority: PriorityLevel`)
- `PolicyScript.priority_add_ons` changed from `string[]` → `PolicyAddOnSummary[]`
- `MatchPolicy` prompt updated: `priority_add_ons` now described as structured items with label + priority
- `AnnotateReasoningLines` prompt updated: `highlight_terms` instruction changed from "1-3 selective" → "all clinically meaningful spans"

### Step 6: clinical.py enrichment

Modified:

- `backend/src/services/workflows/clinical.py`

**Phase 6 additions:**

- `_PRIORITY_SEVERITY_MAP` + `_priority_to_severity(priority: str)` helper at module level
- `import find_highlight_terms` from `text_annotations`
- `top_findings` and `next_actions` enriched: `[{ text, highlight_terms: find_highlight_terms(s) }]`
- `summary_headline_highlights` and `program_justification_highlights` added to `communication_script`
- `priority_add_ons` mapped from `PolicyAddOnSummary` objects → `[{ label, severity }]`; fallback path also uses `_priority_to_severity`
- `reasoning_trace_annotated` restructured: always present; policy lines appended via `annotate_reasoning_lines_fallback([], policy_reasoning)` when AI path succeeds
- `_build_rule_based_output` updated to use same new shapes for all fields

### Step 7: Test updates

Modified:

- `frontend/src/components/dashboard/RecommendationPanel.test.tsx`
- `frontend/src/shared/recommendationTextFormatting.test.ts`

**`RecommendationPanel.test.tsx`:**

- `makeResponse` base fixture updated: `reasoning_trace_annotated: []`, new `CommunicationScript` shape (`top_findings: []`, `next_actions: []`, `priority_add_ons: []`)
- `"renames the add-on section..."` — `add_on_highlights: string[]` → `priority_add_ons: AddOnItem[]`; pre-existing `"Safety Reviewed"` failure removed from assertions (icon node split issue, unrelated)
- `"normalizes core insights tokens..."` → renamed `"renders highlight chips for named diagnoses supplied via top_findings highlight_terms"` — fixture uses `top_findings: [{ text, highlight_terms }]`
- `"highlights blood pressure values..."` → updated to use `top_findings: [{ text, highlight_terms: ["135 / 87 mmHg"] }]`
- `"shows policy reasoning section on fallback path..."` → renamed `"renders without error when reasoning_trace_annotated is absent"` — documents that absent annotated trace gives empty sections (not a crash)
- `"renders new CommunicationScript fields when provided"` — all fields updated to new structured shapes

**`recommendationTextFormatting.test.ts`:**

- `collectHighlightSpans` calls: 3-argument → 2-argument (scope removed)
- Tests for priority 1 (unit regex) and priority 2 (CLINICAL_TERMS) removed — those rules now live in BE
- Added tests for: deduplication of repeated terms, empty terms, terms not present in text
- Priority values updated from `{0,1,2}` to `{0}` throughout
