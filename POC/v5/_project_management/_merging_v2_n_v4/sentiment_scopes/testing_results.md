# Testing Results

## Frontend

### Vitest

- `frontend/src/components/dashboard/RecommendationPanel.test.tsx` — **15/15 passing**
- `frontend/src/shared/recommendationTextFormatting.test.ts` — **13/13 passing**
- **Total in scope: 28/28 passing**
- 4 pre-existing failures in unrelated test files (AuditLogSearchPanel, TrendTimelinePage, Sidebar, DashboardPage) — not introduced by this scope

### Test coverage by area

| Test file | Tests | What is covered |
|---|---|---|
| `RecommendationPanel.test.tsx` | 15 | Annotation path, policy scope, consultation fields, add-on severity, privacy mode, risk gauge, record decision |
| `recommendationTextFormatting.test.ts` | 13 | `collectHighlightSpans` (LLM terms, case insensitivity, dedup), `deduplicateSpans` (priority, length, overlap) |

### Key behavior confirmed

#### Reasoning trace

| Scenario | Expected |
|---|---|
| `reasoning_trace_annotated` present | Used directly; clinical + policy sections populated |
| `reasoning_trace_annotated` absent (legacy) | Empty sections; no crash |
| `sentiment` from annotation | Used for chip color (was hardcoded `"informational"`) |
| `highlight_terms` per line | Applied as chips in reasoning lines |

#### Consultation fields

| Input | Expected |
|---|---|
| `top_findings: [{ text, highlight_terms }]` | Each finding rendered with chips from `highlight_terms` |
| `135 / 87 mmHg` in `highlight_terms` | Renders as `<strong>` chip |
| `"Stage 1 Hypertension"` in `highlight_terms` | Renders as chip; "confirmed." is plain text |
| `priority_add_ons: [{ label, severity }]` | `severityToStyles(severity)` drives color; no `(Red)` suffix visible |
| `priority_add_ons: []` | Special Highlights section hidden |
| `summary_headline_highlights` | Passed to `renderHighlightedText` for Clinical Conclusion chips |

#### Removed FE behavior (now BE responsibility)

| Former FE behavior | Status |
|---|---|
| Auto-highlight `Stage 2 Hypertension` in prose | Moved to BE `find_highlight_terms()` |
| Auto-highlight `135/87 mmHg` via regex | Moved to BE `_BP_UNIT_REGEX` |
| Parse `"Label (Red)"` suffix | Moved to BE `_parse_priority_add_on_string()` |
| Split `health_summary` string into sentences | Retired — BE returns arrays |
| Parse raw `reasoning_trace` string | Retired — `reasoning_trace_annotated` always present |
| Dictionary substitution for snake_case | Retired — BE never sends snake_case in text |

## Backend

### Unit Tests (pytest)

- `backend/tests/test_text_annotations.py`
- Run via: `python3 -m pytest tests/test_text_annotations.py`

Coverage includes:

- Policy-line filtering and deterministic sentiment labeling
- `find_highlight_terms()`: clinical phrase matching, BP regex, overlap resolution, quote cleanup
- Fallback path `highlight_terms` now populated (not empty list)

### LLM annotation path

Tested indirectly via frontend fixture tests that supply `reasoning_trace_annotated` payloads with `highlight_terms` and verify chip rendering. End-to-end testing requires a live backend + real patient payload.
