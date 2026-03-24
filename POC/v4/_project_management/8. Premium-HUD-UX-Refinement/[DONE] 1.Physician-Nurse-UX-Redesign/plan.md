# Implementation Plan

## Step 1 — Hide sidebar for physician/nurse

Update `frontend/src/components/Sidebar.tsx`:
- Import `useAuth` from `@/shared/auth-context`
- Define `SIDEBAR_HIDDEN_ROLES = new Set(["physician", "nurse"])`
- Return `null` early when role is in that set (or when user is not logged in)

Update `frontend/src/app/layout.tsx`:
- `layout.tsx` is a Server Component — it cannot call `useAuth()` directly
- Replace `<main style={{ paddingLeft: "var(--sidebar-width)" }}>` with `<RoleAwareMain>`

Create `frontend/src/app/RoleAwareMain.tsx` (new file):
- `"use client"` component
- Reads role from `useAuth()`
- Applies sidebar padding only for non-search-flow roles (admin, dpo)
- Removes padding entirely for physician/nurse

## Step 2 — Build PatientSearchEntry component

Create `frontend/src/components/dashboard/PatientSearchEntry.tsx` (new file):
- Full-page centered layout
- Large text input for searching by patient name
- Fetches full patient list from `patientService.getAll()`
- Filters list in real-time as user types
- Renders matched patients as clickable cards in a responsive grid
- Calls `onPatientSelect(patient)` callback on card click

## Step 3 — Build ClinicalDrawer component

Create `frontend/src/components/ClinicalDrawer.tsx` (new file):
- Slide-up overlay panel (fixed, bottom of viewport, full width)
- Wraps existing `TrendTimelineScreen` — no chart rewrite needed
- Props: `{ patient, privacyMode, isOpen, onClose }`
- Closes on: Escape key, backdrop click, X button
- Locks `document.body.style.overflow` while open to prevent background scroll

## Step 4 — Role-split main page

Update `frontend/src/app/page.tsx`:
- Add `SEARCH_FLOW_ROLES = new Set(["physician", "nurse"])`
- Derive `isSearchFlowRole` from `useAuth().role`
- Add `drawerOpen` state (boolean, default false)
- Add `handleBackToSearch()` — clears `selectedPatient` and all derived state
- Add "← Search" button to navbar (only when physician/nurse + patient selected)
- Branch render:
  - `isSearchFlowRole && !selectedPatient` → `<PatientSearchEntry>`
  - `isSearchFlowRole && selectedPatient` → full-width Clinical Hub + drawer button + `<ClinicalDrawer>`
  - else → original 3-column admin/dpo layout (unchanged)

## Step 5 — Verification

Run TypeScript type checker:
```
cd POC/v4/frontend && npx tsc --noEmit
```
Zero errors in application source files expected.
