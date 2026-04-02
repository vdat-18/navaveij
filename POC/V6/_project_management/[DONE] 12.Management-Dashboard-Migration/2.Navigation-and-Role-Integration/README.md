# Scope 2 — Navigation and Role Integration

**Parent Workstream:** 12.Management-Dashboard-Migration
**Status:** 🔲 Pending
**Goal:** Create the Next.js App Router page at `/management` and add the Management Metrics nav item to the V6 Sidebar.

---

## Why This Scope Exists

The component and data file from Scope 1 are inert without a route that renders them and a Sidebar entry that exposes them. This scope wires the navigation layer. Role-gating is implicit: `SIDEBAR_HIDDEN_ROLES` already includes `physician` and `nurse`, so the management route is admin/DPO-only from the Sidebar perspective without any additional logic.

No later scope should proceed until `Sidebar.test.tsx` passes and `npx tsc --noEmit` is clean.

---

## Primary Deliverables

- `frontend/src/app/management/page.tsx` — 11-line Next.js page wrapper
- `frontend/src/components/Sidebar.tsx` — `Activity` icon imported; fourth `menuItems` entry added

---

## Verification Gate

- `npx tsc --noEmit` passes with zero errors
- `npm test -- --testPathPattern=Sidebar` passes (existing test) and the new nav item renders
