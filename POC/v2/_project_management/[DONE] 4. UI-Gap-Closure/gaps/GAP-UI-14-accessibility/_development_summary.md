## Status: Complete

### Implementation Details
- Added explicit navigation accessibility semantics in `Sidebar.tsx` with `aria-label="Main navigation"` and active-link `aria-current="page"`.
- Replaced sidebar logo `<img>` with Next `Image` and fixed dimensions (`120x48`) to reduce layout instability.
- Added accessible naming for patient search in `PatientList.tsx` with `aria-label="Search patients"`.
- Added root-level `ErrorBoundary` client component and wrapped layout route content with it.

### Files Modified
- `POC/v2/frontend/src/components/Sidebar.tsx`
- `POC/v2/frontend/src/components/dashboard/PatientList.tsx`
- `POC/v2/frontend/src/components/ErrorBoundary.tsx`
- `POC/v2/frontend/src/app/layout.tsx`
