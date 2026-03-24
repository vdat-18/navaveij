# GAP-F1 — UX Navigation Restructure

**Title:** Single-entry dashboard for nurses & doctors; timeline/graphs as full-screen modal sub-screens
**Status:** Not started
**Phase:** 3 (architecture)

---

## Objective

Restructure the navigation for `nurse` and `doctor` roles from a 3-page sidebar model to a
single-entry point where the clinical dashboard is the primary screen and the trend/timeline
view opens as a full-screen modal overlay. Admin and DPO roles retain the existing navigation.

## Scope

1. Create `TrendTimelineModal.tsx` — full-screen modal wrapper around the existing `TrendTimelineScreen`.
2. On `page.tsx`: for nurse/doctor roles, hide the sidebar "Trend & Timeline" link; add a
   "View Trend & Timeline" button within the dashboard that opens the modal.
3. `Sidebar.tsx`: conditionally hide the timeline menu item based on user role.
4. Wire the toast link from GAP-F7 to the modal trigger (Phase 3 dependency).
5. Admin/DPO flow: no changes to sidebar or page routing.

## Primary Files

- `POC/v2/frontend/src/app/page.tsx` — main dashboard; add modal state and trigger
- `POC/v2/frontend/src/components/Sidebar.tsx` — role-gated menu items
- `POC/v2/frontend/src/components/trend-timeline/TrendTimelineScreen.tsx` — reused inside modal
- `POC/v2/frontend/src/app/trend-timeline/page.tsx` — keep as-is for admin direct access

## New Files

- `POC/v2/frontend/src/components/modals/TrendTimelineModal.tsx`

## Design Decisions

- **Modal vs. new page:** Full-screen modal chosen (client feedback). Existing `TrendTimelineScreen`
  component is reused — no duplication of data fetching or layout logic.
- **Route `/trend-timeline` retained:** Still accessible by URL for admin/DPO; modal is an
  overlay entry point only for clinical roles.
- **No prop changes to TrendTimelineScreen:** Modal wraps it with a patient context already
  available from the shared `patient-context.tsx`.

## Checkpoint Files

- `_discovery.md`
- `_development_summary.md`
- `_latest_test_results.md`

## Feedback Reference

`feedbacks.md` — "New flow for nurses & doctors: 1 single entry point → search bar → select
patient → Clinical Dashboard → clinical timeline and graphs are sub-screens that pops up when clicked"
