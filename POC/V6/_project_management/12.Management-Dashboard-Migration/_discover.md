# Discovery — Management Dashboard Migration

**Date:** 2026-03-30
**Investigator:** Codex
**Trigger:** v4-to-v6 feature parity review — Management Dashboard absent from V6
**Resolution:** Pending implementation

---

## Investigation Trigger

V6 has no Management Dashboard, no `/management` route, and no Sidebar nav item linking to it. The v4 implementation is complete and stable. This discovery audits the gap between v4 and V6 to confirm exactly what needs to be ported and whether any adaptation is required beyond the import path change.

---

## Files Audited

| File | Finding |
|---|---|
| `POC/v4/frontend/src/components/management/ManagementDashboard.tsx` | 364-line React component; imports from `@/assets/manage_stats.json`; uses Recharts, Framer Motion, Lucide React, and `cn` from `@/shared/utils`; ready to port with one import path change |
| `POC/v4/frontend/src/assets/manage_stats.json` | 158-line JSON with four top-level keys: `overview_metrics`, `weekly_performance`, `rejection_reasons`, `nurse_adoption_rates`; no v6-specific adaptation needed |
| `POC/v4/frontend/src/app/management/page.tsx` | 11-line Next.js App Router page wrapper; imports `ManagementDashboard`; directly portable |
| `POC/v4/frontend/src/components/Sidebar.tsx` | Contains `Activity` icon import and Management Metrics nav item at position 4; confirms icon name and href to use in V6 |
| `POC/V6/frontend/src/components/Sidebar.tsx` | 3 nav items; `SIDEBAR_HIDDEN_ROLES` set includes `physician` and `nurse`; Management entry absent; `Activity` icon not imported |
| `POC/V6/frontend/src/app/globals.css` | `.navavej-card` class defined; `.navavej-card:hover` variant also defined; no CSS changes required |
| `POC/V6/frontend/src/data/` | Contains `metric_severity_rules.json` and `hospital-urls.ts`; confirms `src/data/` is the correct destination for `manage_stats.json` |
| `POC/V6/frontend/src/app/` | Routes present: `/`, `/trend-timeline`, `/access-monitoring`, `/audit`, `/report`, `/login`; no `/management` directory |
| `POC/V6/frontend/src/components/` | No `management/` subdirectory |
| `POC/V6/frontend/package.json` | Recharts, Framer Motion, and Lucide React confirmed present; no new dependencies required |
| `POC/V6/frontend/src/shared/utils.ts` | `cn` utility confirmed present; used by existing V6 components |

---

## Root Causes (Gap Analysis)

### RC-1 — Component and data file not ported during v4→V6 migration

The V6 migration carried over the clinical dashboard, trend-timeline, and access-monitoring features but did not include the management component tree. The `management/` subdirectory was never created under `frontend/src/components/` or `frontend/src/app/`.

### RC-2 — Asset directory convention changed between v4 and V6

V4 uses `frontend/src/assets/` for static JSON data files. V6 standardised on `frontend/src/data/` (confirmed by `metric_severity_rules.json` and `hospital-urls.ts`). The v4 component's import `@/assets/manage_stats.json` will not resolve in V6. This is the only code change required in the component body.

### RC-3 — Sidebar not updated because component migration was omitted

Because the component was never ported, the corresponding Sidebar update was never made. The `Activity` icon import and the fourth `menuItems` entry are both absent from V6's `Sidebar.tsx`.

---

## Design Decisions

| Decision | Rationale |
|---|---|
| Copy `manage_stats.json` with zero content changes | Data schema matches what the component expects; no V6-specific fields are referenced |
| Update only the import path in the component, not the component logic | The component is production-validated in v4; minimising diff reduces regression risk |
| Place `manage_stats.json` under `src/data/` | Consistent with the existing V6 convention (`metric_severity_rules.json`, `hospital-urls.ts`) |
| Use the existing `SIDEBAR_HIDDEN_ROLES` mechanism for role-gating | Physician and nurse roles already see no Sidebar at all; no additional guard logic is needed on the management page itself |
| Do not add automated component tests in this migration scope | The component is a direct port with one import line changed; visual verification in the dev server and a clean build are sufficient; tests can be added as a follow-on |
