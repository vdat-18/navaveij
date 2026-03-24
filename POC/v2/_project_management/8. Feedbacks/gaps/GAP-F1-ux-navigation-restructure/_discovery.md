# Discovery — GAP-F1

**Status:** Complete (pre-implementation analysis)

## Current State

- The app has 3 separate Next.js pages: `/` (Dashboard), `/trend-timeline`, `/access-monitoring`.
- Navigation between pages is handled by `Sidebar.tsx` with menu links for all 3 screens.
- All roles (nurse, doctor, admin, dpo) see the same sidebar navigation — no role-based
  menu differentiation currently implemented.
- `TrendTimelineScreen.tsx` is a self-contained component that handles its own data
  fetching (timeline, biomarker trends, screening gaps) using patient context.
- No modal overlay pattern exists anywhere in the current codebase.
- Patient selection state is shared via `patient-context.tsx` — available across all components.

## What Needs to Change

- For `nurse` and `doctor` roles: hide the "Trend & Timeline" sidebar link; replace with
  a button on the dashboard that opens a full-screen modal.
- The modal wraps `TrendTimelineScreen` directly — no need to duplicate data fetching logic.
- The `/trend-timeline` page route remains intact for admin/DPO direct access.
- `Sidebar.tsx` needs a role check: if `role === 'nurse' || role === 'doctor'`, omit the
  timeline menu item.

## Key Dependencies

- GAP-F7 (toast) must wire its CTA link to this modal trigger in Phase 3.
- `auth-context.tsx` already exposes `currentUser.role` — no new context needed.
- `TrendTimelineScreen` must not be refactored — it is reused as-is inside the modal.

## Risk Flags

- If `TrendTimelineScreen` triggers scroll-based effects or layout-dependent sizing,
  rendering inside a modal may need overflow/height adjustments.
- The `/trend-timeline` page must not break for admin users after the modal is introduced.
