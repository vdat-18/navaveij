# Discovery — Email this Report Feature

**Date:** 2026-03-30
**Investigator:** Claude (post-implementation bug investigation)

---

## Investigation Trigger

After initial implementation, the feature was reported as broken:
- Clicking "Email this Report" refreshes the page and re-triggers the AI recommendation rerun.
- The `/report` page does not work (never renders content).

---

## Files Audited

| File | Status |
|---|---|
| `src/components/dashboard/RecommendationPanel.tsx` | Code is correct — button, handler, sessionStorage write, `router.push` all present |
| `src/app/report/page.tsx` | Code present — **Bug 1 found here** |
| `src/components/report/ReportPage.tsx` | Code is correct — all 13 sections render |
| `src/app/layout.tsx` | **Bug 2 found here** — sidebar injected for all routes |
| `src/components/Sidebar.tsx` | Hides for physician/nurse roles but not by pathname |
| `src/app/RoleAwareMain.tsx` | Applies `paddingLeft` for admin/DPO — no pathname awareness |
| `src/app/page.tsx` | `patient={selectedPatient}` passed to both RecommendationPanel call sites ✓ |
| `src/app/globals.css` | Print CSS block present and correct ✓ |

---

## Bug 1 — React Strict Mode double-effect (Breaking)

### Location
`src/app/report/page.tsx` — `useEffect` at line ~19

### Root Cause
Next.js development mode uses React 18 Strict Mode, which intentionally runs every `useEffect` **twice** (setup → cleanup → setup) to surface side-effect purity violations.

The sequence in `report/page.tsx`:

| Step | What happens |
|---|---|
| Effect run 1 | Reads `navaveij_report_export` from sessionStorage → deletes it → `setData(parsed)` |
| Effect run 2 (Strict Mode) | sessionStorage key is now gone → `router.replace("/")` executes |
| Result | User is sent back to `/`, `RecommendationPanel` unmounts → React state is lost → AI reruns |

### Why it's hard to spot
- Code looks correct in isolation.
- The bug only manifests in development (Strict Mode). Production builds run effects once.
- No error is thrown — the redirect is intentional fallback behaviour that fires incorrectly.

### Fix
Add a `useRef` flag to gate the effect body. Refs persist across React Strict Mode's double-invocation (they are NOT reset between the two setup calls), so the second run hits `return` immediately.

```tsx
const hasRunRef = useRef(false);
useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;
    // ... rest of existing logic unchanged
}, [router]);
```

---

## Bug 2 — Sidebar and left-margin shown on `/report` page (Visual)

### Location
- `src/app/layout.tsx` — always renders `<Sidebar />` and `<RoleAwareMain>`
- `src/components/Sidebar.tsx` — hides only for physician/nurse roles, not by pathname
- `src/app/RoleAwareMain.tsx` — applies `paddingLeft: var(--sidebar-width)` for admin/DPO, no pathname check

### Root Cause
The root layout does not distinguish between dashboard routes and the standalone `/report` route. Admin and DPO users navigating to `/report` see the sidebar and a `16rem` left offset, breaking the standalone full-width layout designed for print/PDF export.

### Fix
Two targeted changes — no route group restructuring needed:

1. **`Sidebar.tsx`** — add `pathname === '/report'` to the existing early-return guard. `usePathname` is already imported.
2. **`RoleAwareMain.tsx`** — import `usePathname`, exclude `/report` from the `hasSidebar` calculation.

---

## Test Coverage Gap

No tests exist for any part of the email report feature:
- `handleEmailReport` in `RecommendationPanel` — not tested
- `ReportPage` component — not tested
- `report/page.tsx` route — not tested

The existing `RecommendationPanel.test.tsx` (426 lines, 11 cases) does not mock `next/navigation`, so `useRouter` would need to be mocked to add button-click tests.

---

## No Other Issues Found

- `patient` prop is correctly wired in both physician/nurse and admin/DPO flows in `page.tsx`.
- The `handleEmailReport` guard (`if (!data || !patient) return`) is correct.
- The `mailto:` construction uses `encodeURIComponent` correctly.
- Print CSS is present and targets the right class names.
- No missing dependencies — no new npm packages required.