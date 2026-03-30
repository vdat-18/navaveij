# Scope 1 — Component and Data Port

**Parent Workstream:** 12.Management-Dashboard-Migration
**Status:** 🔲 Pending
**Goal:** Place `manage_stats.json` in the V6 data directory and port `ManagementDashboard.tsx` with the corrected import path.

---

## Why This Scope Exists

The v4 component references `@/assets/manage_stats.json`, which is the v4 data directory convention. V6 uses `@/data/` instead. This scope creates the two missing files and makes the single import path change required to resolve the module correctly in V6. No later scope should proceed until TypeScript accepts both files without errors.

---

## Primary Deliverables

- `frontend/src/data/manage_stats.json` — verbatim copy from v4
- `frontend/src/components/management/ManagementDashboard.tsx` — v4 component with import path corrected

---

## Verification Gate

- `node -e "JSON.parse(...)"` confirms `manage_stats.json` is valid JSON
- `npx tsc --noEmit` from `V6/frontend/` passes with zero new errors
