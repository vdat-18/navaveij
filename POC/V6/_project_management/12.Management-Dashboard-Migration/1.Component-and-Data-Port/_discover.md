# Discovery — Scope 1: Component and Data Port

**Status:** Closed (pre-implementation analysis)

---

## Starting Facts

- `POC/v4/frontend/src/assets/manage_stats.json` is 158 lines of valid JSON with four top-level sections: `overview_metrics`, `weekly_performance`, `rejection_reasons`, `nurse_adoption_rates`.
- `POC/v4/frontend/src/components/management/ManagementDashboard.tsx` is 364 lines; the only V6-incompatible line is the import on line 35: `import dashboardData from "@/assets/manage_stats.json"`.
- `POC/V6/frontend/src/data/` exists and contains `metric_severity_rules.json` and `hospital-urls.ts`, confirming the data directory convention.
- `POC/V6/frontend/src/components/management/` does not exist.
- All libraries imported by the component (Recharts, Framer Motion, Lucide React, `cn` from `@/shared/utils`) are present in V6.
- The component is marked `"use client"` and has no server-only dependencies. It is safe to render inside an App Router page wrapper.

---

## Questions Resolved

1. **Does `manage_stats.json` need any schema changes for V6?** — No. The component reads the file directly and no V6-specific fields are referenced.
2. **Does the component use any V6-incompatible API or hook?** — No. It uses standard React hooks only.
3. **Is `cn` from `@/shared/utils` available in V6?** — Yes, confirmed present in `Sidebar.tsx` and other V6 components.
4. **Does V6's `tsconfig.json` have JSON module resolution enabled?** — Yes, confirmed by existing usage of `metric_severity_rules.json` via import in V6.

---

## Exit Condition

Both files exist in V6, `manage_stats.json` is valid JSON, and `npx tsc --noEmit` passes without errors attributable to the new files.
