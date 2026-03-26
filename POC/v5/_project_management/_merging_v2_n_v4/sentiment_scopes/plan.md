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

1. `UNIT_HIGHLIGHT_REGEX` narrowed to blood pressure composites and percentages only.
2. `HIGHLIGHT_PHRASES` list added — directly matches human-readable clinical names in prose.
3. Dictionary step scoped to snake_case keys only.
4. `scope`-aware rendering in `renderHighlightedText`.

## Phase 6 — Consolidate Highlight Rules to Backend ✅ DONE

**Motivation:** FE overhaul planned. Rules moved to BE so any future FE is a dumb renderer ("find these terms, color them") with no matching logic.

### What moved to backend

| Former FE item | Backend equivalent |
|---|---|
| `CLINICAL_TERMS` list (60+ phrases) + `UNIT_HIGHLIGHT_REGEX` | `CLINICAL_PHRASES` + `_BP_UNIT_REGEX` in `text_annotations.py`; expanded BAML prompt |
| `parseHighlightSeverity` string parsing `"Label (Red)"` | `priority_add_ons` is now `{ label, severity }[]`; suffix parsed in `_map_communication_script()` |
| `splitConsultationSentences` | BE always returns arrays; string fallback paths retired |
| `reasoning_trace` string parsing | `reasoning_trace_annotated` is always present; FE string fallback removed |
| `**...**` markdown extraction | Replaced by explicit `highlight_terms` per consultation field |
| Quote cleanup | Added to Python normalization in `text_annotations.py` |

### API contract additions

- `reasoning_trace_annotated` — always present; `highlight_terms` always populated (was `[]` in fallback)
- `priority_add_ons` — `string[]` → `{ label, severity }[]`
- `top_findings` / `next_actions` — `string[]` → `{ text, highlight_terms }[]`
- New: `summary_headline_highlights: string[]` and `program_justification_highlights: string[]`

### What stays in frontend

`renderHighlightedText` (React JSX), `collectHighlightSpans`/`deduplicateSpans` (span position finding), `severityToStyles` (severity→CSS), all layout/component logic.

## Phase 7 — Verification ✅ DONE

- 28/28 tests passing across `RecommendationPanel.test.tsx` and `recommendationTextFormatting.test.ts`
- 4 pre-existing failures in unrelated test files (AuditLogSearchPanel, TrendTimelinePage, Sidebar, DashboardPage) — not introduced by this scope
