# Problem — Management Dashboard Migration

**Date:** 2026-03-30
**Source:** v4-to-v6 feature parity review

---

## Problem Statement

V6 is missing the Management Dashboard that exists in v4.

The v4 system ships a 364-line React component (`ManagementDashboard.tsx`) that renders a HUD-style "Control Room" view for hospital executives. It presents four sections of operational data:

- `overview_metrics` — revenue, uplift revenue, recommended items, packages sold
- `weekly_performance` — per-week uplift revenue and recommendation counts
- `rejection_reasons` — breakdown of why CDSS recommendations were declined
- `nurse_adoption_rates` — per-nurse adoption performance with trend indicators

The v4 component is fully implemented, tested visually, and in use. V6 is built on the same tech stack (Next.js App Router, React 19, Tailwind CSS, Framer Motion, Recharts, Lucide React) and the v4 component is directly portable with one import path change.

V6 also lacks the `/management` route and the Sidebar nav item pointing to it.

---

## Specific Gaps

### Gap 1 — Component absent from V6 components tree

`frontend/src/components/management/ManagementDashboard.tsx` does not exist in V6. The `management/` subdirectory under `components/` does not exist.

### Gap 2 — Data file placed in wrong directory convention

V6 has no `frontend/src/assets/` directory. Data files live under `frontend/src/data/` (confirmed by `metric_severity_rules.json` and `hospital-urls.ts`). The v4 component imports from `@/assets/manage_stats.json`. That import path will not resolve in V6 without updating it to `@/data/manage_stats.json`.

The data file itself (`manage_stats.json`) requires no content changes.

### Gap 3 — No Next.js route for `/management`

`frontend/src/app/management/page.tsx` does not exist in V6. There is no `app/management/` directory.

### Gap 4 — Sidebar lacks the Management Metrics nav item

V6's `Sidebar.tsx` currently has 3 nav items:

1. Clinical Dashboard → `/`
2. Trend & Timeline → `/trend-timeline`
3. Access Monitoring & Audit Log → `/access-monitoring`

The Management Metrics item (`Activity` icon, `/management` href) present in v4's Sidebar is absent from V6.

---

## Impact

- Hospital executives using V6 have no dedicated operational metrics view.
- The "Control Room" dashboard is a scheduled demo deliverable; its absence from V6 blocks demo readiness.
- Without the nav item, users cannot discover the route even if the component and page were created.
