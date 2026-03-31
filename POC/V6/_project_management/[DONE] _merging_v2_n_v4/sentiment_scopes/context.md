# Context: Sentiment Scopes (Evidence + Text Highlighting)

## Business Problem

The ROC dashboard presents:

- **Evidence highlights** (line-level evidence cards in the "Clinical Logic & Rationale" block)
- **Inline text highlights** (chip-like emphasized tokens inside "Core Health Insights" and related paragraphs)

Three issues drove this scope:

1. Evidence highlight colors were not clearly attributable to a single, authoritative source (frontend vs backend), creating uncertainty about correctness and maintainability.
2. Inline highlight formatting showed visible typography artifacts (excessive whitespace) and inconsistent token highlighting.
3. All highlight matching rules (60+ clinical phrases, BP regex, severity suffix parsing, sentence splitting) lived in the FE, making them FE-specific — a future FE overhaul would require migrating all of this logic.

## Current State (after this scope)

- Evidence-line sentiment is LLM-generated (`AnnotateReasoningLines` BAML function), with deterministic fallback via `text_annotations.py`.
- All highlight rules live in the backend — BAML prompt drives LLM-path; `find_highlight_terms()` drives fallback path.
- `reasoning_trace_annotated` is always present in the API response (`highlight_terms` always populated).
- `top_findings`, `next_actions` → `{ text, highlight_terms }[]`; FE renders chips from supplied terms.
- `priority_add_ons` → `{ label, severity }[]`; FE maps severity to CSS with `severityToStyles()`.
- The FE formatter (`renderHighlightedText`) is a dumb renderer: quote cleanup → apply highlight_terms → render chips.
- New FE or mobile FE only needs to implement span-finding and chip styling — no clinical knowledge required.

## Goal (achieved)

1. Establish clear rule ownership: **backend owns all annotation and matching rules; frontend only renders**.
2. Separate text highlight rules from `RecommendationPanel` into a reusable formatter module.
3. Ensure `highlight_terms` are always populated — LLM path or Python fallback.
4. Future-proof: any new FE can consume the structured API and render chips without porting clinical rule lists.

## Success Criteria (all met)

- Evidence-line sentiment produced by backend and delivered as structured annotations. ✅
- Highlight regex rules and clinical phrase lists live in the backend. ✅
- `135/87 mmHg` and `135 / 87 mmHg` highlight consistently (via `highlight_terms`). ✅
- Chip-heavy paragraphs no longer exhibit exaggerated whitespace gaps (`text-left`). ✅
- Named clinical terms (`Stage 2 Hypertension`, `Atherogenic Dyslipidemia`, `Colonoscopy`, `Influenza Vaccine`, etc.) highlighted when supplied in `highlight_terms`. ✅
- Generic numeric values (`108.5 mg/dL`, `/1.73 m²`) not auto-highlighted — come from LLM `highlight_terms` only. ✅
- `priority_add_ons` severity is structured — FE never parses `"Label (Red)"` strings. ✅
- FE formatter contains zero clinical phrase lists, zero regex sweeps, zero string parsers. ✅
