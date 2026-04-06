# Scope 3 — Verification and Visual Consistency

**Parent Workstream:** 12.Management-Dashboard-Migration
**Status:** 🔲 Pending
**Goal:** Confirm the ported dashboard renders correctly at `/management` in the V6 dev environment, the Sidebar nav item navigates and highlights correctly, role visibility is correct, and the production build is clean.

---

## Why This Scope Exists

File existence and TypeScript compliance (Scopes 1–2) do not guarantee correct runtime behavior. This scope performs the human-in-the-loop visual and navigational checks that confirm the dashboard matches v4's visual appearance, that all four data sections render, that charts display, and that role guards behave as designed. It also produces the final passing `npm run build` evidence that closes the workstream.

---

## Primary Deliverables

- Visual confirmation that all four dashboard sections render: overview metrics, weekly performance, rejection reasons, nurse adoption rates
- Confirmation that Recharts bar charts and Framer Motion animations function correctly
- Confirmation that `navavej-card` styling is applied (matching v4 appearance)
- Confirmation of Sidebar nav item active state on `/management`
- Confirmation that physician/nurse logins do not see the Sidebar (existing behavior unchanged)
- Clean `npm run build` output

---

## Verification Gate

- `npm run dev` → manual navigation to `/management` passes all visual checks above
- `npm run build` completes with zero errors
- Top-level `_development_summary.md` and `_latest_test_results.md` filled in
