## Status: Complete

### Implementation Details
- Added `--sidebar-width: 16rem` in `globals.css` as the single source of truth for navigation width.
- Updated root layout to use `padding-left: var(--sidebar-width)` instead of hardcoded `pl-64`.
- Updated sidebar width class to `w-[var(--sidebar-width)]` to keep sidebar and content alignment synchronized.
- Replaced slash-delimited alert summary with labeled severity badges in `LiveMetricsBar.tsx`.
- Reworked snapshot loading UI with card-structure skeleton matching the loaded metrics layout to reduce layout shift.

### Files Modified
- `POC/v2/frontend/src/app/globals.css`
- `POC/v2/frontend/src/app/layout.tsx`
- `POC/v2/frontend/src/components/Sidebar.tsx`
- `POC/v2/frontend/src/components/access-monitoring/LiveMetricsBar.tsx`
