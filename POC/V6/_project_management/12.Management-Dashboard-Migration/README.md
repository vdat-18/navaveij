# README — Management Dashboard Migration

**Workstream:** 12
**Date:** 2026-03-30
**Status:** 🔲 Pending
**Scope:** Port the v4 Management Dashboard component and data file into V6, create the Next.js route, and add the Management Metrics nav item to the V6 Sidebar

---

## Summary

This workstream adds the hospital-executive Management Dashboard (HUD-style "Control Room") from v4 into V6.

The migration involves three file creations and one file modification:

- `frontend/src/components/management/ManagementDashboard.tsx` — ported from v4, import path updated from `@/assets/` to `@/data/`
- `frontend/src/data/manage_stats.json` — copied from v4 unchanged
- `frontend/src/app/management/page.tsx` — simple Next.js App Router page wrapper
- `frontend/src/components/Sidebar.tsx` — Management Metrics nav item added as 4th entry

No CSS adaptation is required: `navavej-card` is already defined in V6's `globals.css`. No new library dependencies are required: Recharts, Framer Motion, and Lucide React are already present in V6. Role-gating follows the existing Sidebar pattern — physician and nurse roles already have the entire Sidebar hidden, so the Management route is automatically admin/DPO-only.

---

## Scope Status

1. [`1.Component-and-Data-Port`](./1.Component-and-Data-Port/README.md) — 🔲 Pending
2. [`2.Navigation-and-Role-Integration`](./2.Navigation-and-Role-Integration/README.md) — 🔲 Pending
3. [`3.Verification-and-Visual-Consistency`](./3.Verification-and-Visual-Consistency/README.md) — 🔲 Pending

Master sequence:
- [`plan.md`](./plan.md)

Each scope keeps its own:
- `README.md`
- `_discover.md`
- `_development_summary.md`
- `_latest_test_results.md`

---

## Related Documents

- [`problem.md`](./problem.md) — gap statement
- [`_discover.md`](./_discover.md) — gap analysis and file audit
- [`plan.md`](./plan.md) — implementation plan with tracked tasks
- [`_development_summary.md`](./_development_summary.md) — filled after implementation
- [`_latest_test_results.md`](./_latest_test_results.md) — filled after implementation
