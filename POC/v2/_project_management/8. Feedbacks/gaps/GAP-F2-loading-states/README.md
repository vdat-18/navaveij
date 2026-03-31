# GAP-F2 — Loading States (Colorful Step-by-Step Model Thinking)

**Title:** Replace generic loading spinner with a colorful step-by-step AI workflow progress indicator
**Status:** Implemented (2026-03-24)
**Phase:** 1 (quick wins)

---

## Objective

When the AI recommendation is being generated, show a named step-by-step progress indicator
that communicates which stage of the pipeline is running, using distinct colors and icons per step.
This replaces the current generic spinner in `RecommendationPanel.tsx`.

## Scope

1. Create `LoadingSteps.tsx` with 6 hardcoded named steps and step-specific colors/icons.
2. Wire it into `RecommendationPanel.tsx` as the loading state replacement.
3. Use frontend-only timed progression (no backend SSE needed for POC).

## Named Steps

| Step | Label | Color |
|------|-------|-------|
| 1 | Fetching clinical constraints | Teal |
| 2 | Loading clinical signals | Blue |
| 3 | Retrieving biomarker trends | Purple |
| 4 | Evaluating program ruleset | Orange |
| 5 | Running AI analysis | Red/Amber |
| 6 | Validating safety rules | Green |

## Primary Files

- `POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx` — wire in new loading component

## New Files

- `POC/v2/frontend/src/components/dashboard/LoadingSteps.tsx`

## Design Decisions

- **Frontend-only timed animation:** Steps advance on a ~1.5s timer while the real API call
  is in-flight. On response arrival, jump to "done" regardless of which step the timer is on.
  This avoids backend SSE complexity for POC.
- **Steps are hardcoded to match the known MCP + AI workflow:** `get_hard_constraints`,
  `get_clinical_signals`, `get_biomarker_trends`, `get_program_ruleset`, AI inference,
  safety validation.

## Checkpoint Files

- `_discovery.md`
- `_development_summary.md`
- `_latest_test_results.md`

## Feedback Reference

`feedbacks.md` — "Model thinking/loading needs to be more colorful and informative (which step, doing what)"
