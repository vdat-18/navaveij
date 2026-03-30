# Discovery — Scope 2: Navigation and Role Integration

**Status:** Closed (pre-implementation analysis)

---

## Starting Facts

- `POC/V6/frontend/src/app/management/` does not exist. Current app routes: `/`, `/trend-timeline`, `/access-monitoring`, `/audit`, `/report`, `/login`.
- `POC/V6/frontend/src/components/Sidebar.tsx` imports from `lucide-react`: `LayoutDashboard`, `LineChart`, `ShieldCheck`, `HelpCircle`. It does not import `Activity`.
- The `menuItems` array has 3 entries. The Management Metrics entry with `Activity` icon and `href: "/management"` is absent.
- `SIDEBAR_HIDDEN_ROLES` in V6's `Sidebar.tsx` is a `Set` containing `"physician"` and `"nurse"` — identical to v4. No change to this set is required.
- The v4 Sidebar uses `Activity` icon from `lucide-react` for the Management Metrics entry; confirmed available in the Lucide version installed in V6.
- The access-monitoring page (`app/access-monitoring/page.tsx`) demonstrates the standard V6 App Router page wrapper pattern.

---

## Questions Resolved

1. **Does adding a fourth `menuItems` entry break the existing Sidebar test?** — The existing test checks `aria-current` on the Trend & Timeline link when pathname is `/trend-timeline`. Adding a fourth item does not affect that assertion.
2. **Does the `/management` page need an explicit role guard?** — The Sidebar already hides for physician/nurse. No additional guard is required for this scope; belt-and-suspenders guards can be added as a follow-on if needed.
3. **Is `Activity` available in the version of `lucide-react` installed in V6?** — Yes, confirmed in v4's Sidebar and Lucide's API stability record.

---

## Exit Condition

`app/management/page.tsx` exists, `Sidebar.tsx` renders four nav items, TypeScript is clean, and the Sidebar test passes.
