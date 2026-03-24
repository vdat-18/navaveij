# Discovery — GAP-F2

**Status:** Complete (pre-implementation analysis)

## Current State

- `RecommendationPanel.tsx` shows a loading state while the `/api/recommend` call is in-flight.
- The current loading UI is a generic spinner or a simple "Loading..." text — no step names,
  no colors, no progress indication.
- The backend workflow has 6 known steps in order: `get_hard_constraints`, `get_clinical_signals`,
  `get_biomarker_trends`, `get_program_ruleset`, AI inference (BAML), safety validation.
- The backend does not emit server-sent events (SSE) or WebSocket progress updates.
- Total API call duration is typically 5–30 seconds depending on patient type (new vs existing).

## What Needs to Change

- Replace the current loading spinner with a `LoadingSteps` component showing 6 named steps.
- Steps advance on a frontend timer (~1.5s each) while the API call is in-flight.
- On API response, immediately advance to "complete" state regardless of timer position.
- Each step has a distinct color and icon to communicate progress visually.

## Key Design Constraint

- **No backend changes required.** The step progression is a frontend UX simulation based
  on the known workflow order. Real step timing from the backend is available in `phase_timings`
  on the response but only after the call completes — not useful for live progress display.
- If backend SSE is added in a future sprint, `LoadingSteps` can be wired to real events
  without changing its visual contract.
