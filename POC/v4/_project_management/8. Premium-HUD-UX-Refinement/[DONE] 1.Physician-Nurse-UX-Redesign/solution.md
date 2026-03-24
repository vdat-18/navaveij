# Solution

## Decisions

- Role detection at render time using existing `useAuth().role` — no new context or API needed.
- `layout.tsx` is a Server Component and cannot call React hooks. Extracted `RoleAwareMain.tsx` as a thin `"use client"` wrapper to conditionally apply sidebar padding.
- `Sidebar.tsx` returns `null` for physician/nurse — cleaner than CSS visibility toggling, avoids DOM overhead.
- Charts are not always rendered for physicians; they open on demand via a slide-up drawer wrapping the existing `TrendTimelineScreen` — no chart component rewrite.
- Admin/DPO layout is untouched — no risk of regression for governance users.

## Approach

### Role-Split Render Branch
`page.tsx` derives `isSearchFlowRole` from role at render time. When true:
- No patient selected → `PatientSearchEntry` (full page, no sidebar padding)
- Patient selected → full-width Clinical Hub + optional `ClinicalDrawer`

When false (admin/dpo) → original 3-column layout with sidebar.

### Sidebar Suppression
`Sidebar.tsx` returns `null` for `SIDEBAR_HIDDEN_ROLES`. `RoleAwareMain.tsx` removes the corresponding left padding. Both changes are self-contained and role-driven.

### On-Demand Charts
`ClinicalDrawer` is a controlled overlay (`isOpen` / `onClose` props). It only mounts `TrendTimelineScreen` when open, avoiding unnecessary API calls and render cost.

### Back Navigation
`handleBackToSearch()` clears `selectedPatient` and all derived state (recommendation, security metadata, timestamps). The search screen re-fetches the patient list from cache on the next render.

## What Was Not Changed

- `TrendTimelineScreen` — reused as-is inside `ClinicalDrawer`
- `RecommendationPanel` — reused as-is in both physician and admin layouts
- Admin/DPO flow — unchanged
- Backend — no API changes required
