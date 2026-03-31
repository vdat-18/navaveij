# Actual Development

## Changes

- `Sidebar.tsx` — returns `null` for `physician`/`nurse`; sidebar hidden for those roles
- `layout.tsx` — replaced static sidebar padding with `<RoleAwareMain>` (server component cannot use `useAuth` directly)
- `RoleAwareMain.tsx` (new) — `"use client"` wrapper; applies sidebar padding only for admin/dpo
- `PatientSearchEntry.tsx` (new) — full-page centered search + patient card grid; calls `onPatientSelect`
- `ClinicalDrawer.tsx` (new) — slide-up overlay wrapping `TrendTimelineScreen`; closes on Escape / backdrop click / X; locks body scroll
- `page.tsx` — added `SEARCH_FLOW_ROLES`, `isSearchFlowRole`, `drawerOpen` state, `handleBackToSearch()`, "← Search" navbar button, and role-split render branch

## Verification

`npx tsc --noEmit` — zero errors in application source files.
Pre-existing test file errors (`vi`/`describe` not found) are Vitest config issues unrelated to this change.

## Outcome

Physicians/nurses: search screen → single-patient Clinical Hub → slide-up charts drawer.
Admins/DPOs: original 3-column layout unchanged.
