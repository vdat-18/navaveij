# Context: Sentiment Scopes (Evidence + Text Highlighting)

## Business Problem

The ROC dashboard presents:

- **Evidence highlights** (line-level evidence cards in the "Clinical Logic & Rationale" block)
- **Inline text highlights** (chip-like emphasized tokens inside "Core Health Insights" and related paragraphs)

Two issues emerged during review:

1. The "evidence highlight" colors were not clearly attributable to a single, authoritative source (frontend vs backend), creating uncertainty about correctness and maintainability.
2. Inline highlight formatting showed visible typography artifacts (excessive whitespace) and inconsistent token highlighting (e.g. `Stage 1 Hypertension (BP 135/87 mmHg)` where the middle value was not highlighted in some strings).

## Current State (before this scope)

- Evidence-line sentiment was computed inside a large frontend component (`RecommendationPanel.tsx`) via a local keyword matcher.
- Inline highlight regex and formatting logic was also embedded in `RecommendationPanel.tsx`, making the component difficult to evolve and review.
- Inline chips combined with `text-justify` caused visible "wide whitespace" gaps on chip-heavy lines.
- Blood-pressure values could fail to highlight when spaces appeared around `/` (e.g. `135 / 87 mmHg`).

## Goal

1. Establish a clear rule ownership model:
   - Backend owns evidence-line sentiment classification output.
   - Frontend renders sentiment and highlights without embedding the classifier logic.
2. Separate text highlight rules from `RecommendationPanel` into a reusable formatter module.
3. Improve readability by reducing whitespace artifacts and ensuring consistent highlighting of clinical measurement tokens.

## Success Criteria

- Evidence-line sentiment is produced by backend and delivered as structured annotations.
- Highlight regex rules live outside `RecommendationPanel` and can be maintained independently.
- `135/87 mmHg` and `135 / 87 mmHg` highlight consistently.
- Chip-heavy paragraphs no longer exhibit exaggerated whitespace gaps.
- Named clinical terms (`Stage 2 Hypertension`, `Atherogenic Dyslipidemia`, `Colonoscopy`, `Influenza Vaccine`, etc.) are highlighted when they appear as human-readable prose.
- Generic numeric values (`108.5 mg/dL`, `100 mg/dL`, `/1.73 m²`) are **not** auto-highlighted — these come from the LLM's per-line `highlight_terms` only.
- Dictionary substitution only fires on snake_case identifiers (e.g. `bp_stage1_htn`) — it does not abbreviate already-readable LLM prose.
