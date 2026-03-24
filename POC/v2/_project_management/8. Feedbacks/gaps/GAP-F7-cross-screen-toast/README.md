# GAP-F7 — Cross-screen Toast / Popup linking to Trend & Timeline

**Title:** Toast notification on critical signal detection with a link to the trend & timeline view
**Status:** Not started
**Phase:** 1 (quick wins)

---

## Objective

After a recommendation loads and critical signals are detected (severity High or Critical),
surface a toast notification prompting the user to view the trend & timeline for context.
The toast includes a clickable link. In Phase 1, the link uses a placeholder; in Phase 3
(GAP-F1), it is wired to the real `TrendTimelineModal`.

## Scope

1. Add a toast component to `RecommendationPanel.tsx` or `page.tsx` (or install a toast
   library if not already present — e.g., `sonner` or `react-hot-toast`).
2. Trigger condition: recommendation response received AND `critical_signals[]` contains at
   least one item with `severity === "High"` or `severity === "Critical"`.
3. Toast content: "⚠ Critical signals detected — View Trend & Timeline for context" with
   a clickable link/button.
4. Phase 1: link triggers `console.log` or a `window.alert` placeholder.
5. Phase 3 (GAP-F1): link replaced with modal open trigger.
6. Toast auto-dismisses after 6 seconds; user can dismiss manually.

## Primary Files

- `POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx` — trigger logic
- `POC/v2/frontend/src/app/page.tsx` — toast provider setup (if library requires root provider)
- `POC/v2/frontend/src/types/recommendation.ts` — `CriticalSignal.severity` (already present)

## Design Decisions

- **Phase-split wiring:** Toast is built and triggers in Phase 1 even though the modal
  target (GAP-F1) lands in Phase 3. This avoids a hard dependency block.
- **Trigger on High AND Critical:** "High" severity signals are clinically meaningful enough
  to warrant the prompt, not just Critical. This increases the utility of the feature.
- **Auto-dismiss at 6s:** Long enough to read; short enough not to obstruct the dashboard.

## Checkpoint Files

- `_discovery.md`
- `_development_summary.md`
- `_latest_test_results.md`

## Feedback Reference

`feedbacks.md` — "Add popup/toast that links to trend & timeline"
