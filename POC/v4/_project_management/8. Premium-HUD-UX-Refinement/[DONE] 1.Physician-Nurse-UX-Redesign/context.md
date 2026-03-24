# Context — Physician/Nurse UX Redesign

**Date:** 2026-03-23

---

## Problem

All roles saw the same 3-column layout (sidebar + patient list | recommendations | charts). Physicians and nurses work one patient at a time — this layout wasted space and had no clear starting point.

## Solution

Role-split UX:
- **physician / nurse** → no sidebar, centered search screen first, then full-width single-patient view, charts open on demand via slide-up drawer
- **admin / dpo** → original layout unchanged

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/components/Sidebar.tsx` | Returns `null` for physician/nurse |
| `frontend/src/app/layout.tsx` | Uses `<RoleAwareMain>` instead of static padding |
| `frontend/src/app/RoleAwareMain.tsx` | **New** — conditionally applies sidebar padding |
| `frontend/src/components/dashboard/PatientSearchEntry.tsx` | **New** — search + patient cards entry screen |
| `frontend/src/components/ClinicalDrawer.tsx` | **New** — slide-up drawer for charts/timeline |
| `frontend/src/app/page.tsx` | Role-split render, drawer state, back-to-search |
