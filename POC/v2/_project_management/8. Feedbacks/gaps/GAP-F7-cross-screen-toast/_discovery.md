# Discovery — GAP-F7

**Status:** Complete (pre-implementation analysis)

## Current State

- No toast or notification system is currently present in the frontend.
- `CriticalSignal[]` with `severity` field is already present in the API response and
  in the `RecommendationResponse` type.
- There is currently no cross-screen linking mechanism from the dashboard to the
  trend & timeline view (other than the sidebar navigation).

## What Needs to Change

- **Toast library:** Determine if a toast/notification library is available in the project
  dependencies. If not, add a lightweight one (e.g., `sonner`, which integrates cleanly
  with Next.js App Router) or implement a simple custom toast.
- **Trigger logic:** After recommendation API response is received, check if any
  `critical_signals` have `severity === "High"` or `severity === "Critical"`. If yes,
  trigger the toast.
- **Toast content:** "⚠ Critical signals detected — View Trend & Timeline for context"
  with an inline button/link.
- **Phase 1 link target:** `console.log` or `alert()` placeholder (GAP-F1 not yet built).
- **Phase 3 link target:** Opens `TrendTimelineModal` (after GAP-F1 is complete).

## Phase Dependency

This gap has a deliberate 2-phase delivery:
- Phase 1: Toast triggers and renders. Link is a placeholder.
- Phase 3: After GAP-F1 delivers the modal, wire the toast CTA to `openTrendTimelineModal()`.

This is intentional — the toast itself provides value even before the modal exists,
as it draws attention to critical findings.
