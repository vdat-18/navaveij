# Testing Results

## Frontend

### Vitest

- `frontend/src/components/dashboard/RecommendationPanel.test.tsx` — **14/15 passing**
- 1 pre-existing failure: `"renames the add-on section and renders highlight severity with color-only labels"` — asserts `"Safety Reviewed"` which is split across an SVG icon node and a text node; unrelated to this scope

Coverage added (new tests):

| Test | What it verifies |
|---|---|
| `renders clinical and policy reasoning lines from structured annotations` | `reasoning_trace_annotated` scope filtering; Policy Reasoning section visible; clinical lines visible |
| `shows policy reasoning section on fallback path when raw trace contains policy prefix` | Fallback path correctly assigns `scope: "policy_reasoning"` from `"Policy reasoning:"` prefix |
| `renders new CommunicationScript fields when provided` | `summary_headline`, `top_findings`, `program_justification`, `next_actions` all render |

Existing tests that exercise the formatter changes:

- `normalizes core insights tokens and keeps decimal values in one sentence` — confirms snake_case tokens like `bp_stage2_htn` → `Stage 2 Hypertension` chip, and decimal values like `115.8 mg/dL` are **not** auto-highlighted (appear as plain text unless in `highlight_terms`)
- `highlights blood pressure values even when spaces exist around the slash` — `135 / 87 mmHg` renders as a `<strong>` chip

### Key highlight behavior confirmed

| Input | Expected | Reason |
|---|---|---|
| `135/87 mmHg` | ✅ highlighted | BP composite — UNIT_HIGHLIGHT_REGEX |
| `135 / 87 mmHg` | ✅ highlighted | BP composite with spaces — UNIT_HIGHLIGHT_REGEX |
| `92%` | ✅ highlighted | Percentage — UNIT_HIGHLIGHT_REGEX |
| `108.5 mg/dL` | ✅ not highlighted | Concentration value — excluded from UNIT_HIGHLIGHT_REGEX |
| `86 mL/min/1.73 m²` | ✅ not highlighted | eGFR unit — excluded from UNIT_HIGHLIGHT_REGEX |
| `Stage 2 Hypertension` | ✅ highlighted | HIGHLIGHT_PHRASES_REGEX |
| `Atherogenic Dyslipidemia` | ✅ highlighted | HIGHLIGHT_PHRASES_REGEX |
| `Colonoscopy` | ✅ highlighted | HIGHLIGHT_PHRASES_REGEX |
| `Influenza Vaccine` | ✅ highlighted | HIGHLIGHT_PHRASES_REGEX |
| `bp_stage2_htn` in text | ✅ highlighted as `Stage 2 Hypertension` | Dictionary (snake_case key) |
| `Stage 1 Hypertension confirmed` | ✅ phrase highlighted, "confirmed" plain | HIGHLIGHT_PHRASES_REGEX matches phrase; dictionary skips (no `_` in key) |

## Backend

### Unit Tests (pytest)

- `backend/tests/test_text_annotations.py` — validates policy-line filtering and deterministic sentiment labeling
- Run via: `python3 -m pytest tests/test_text_annotations.py`

Notes:

- Full backend suite execution may depend on runtime environment and external dependencies; this scope focused on isolated unit verification.
- LLM annotation path (`AnnotateReasoningLines`) is tested indirectly via frontend fixture tests using `reasoning_trace_annotated` payloads.
