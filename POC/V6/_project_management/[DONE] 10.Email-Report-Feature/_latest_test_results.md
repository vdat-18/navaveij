# Latest Test Results — Email this Report Feature

**Date:** 2026-03-30
**Run command:** `npm test` (Vitest 3.2.4)
**Environment:** Development (Next.js Turbopack)

---

## Summary

```
Test Files  1 failed | 11 passed (12)
     Tests  15 failed | 34 passed (49)
  Duration  2.03s
```

---

## Failing Tests (15) — All in `RecommendationPanel.test.tsx`

**Root cause:** Adding `useRouter()` to `RecommendationPanel.tsx` (for the email report button) caused all existing tests to throw `invariant expected app router to be mounted`. The tests render the component without a Next.js router context, and `useRouter()` requires one.

```
Error: invariant expected app router to be mounted
 ❯ useRouter  node_modules/next/src/client/components/navigation.ts:149:11
 ❯ RecommendationPanel  src/components/dashboard/RecommendationPanel.tsx:391:20
```

| Test | Error |
|---|---|
| shows the risk summary popover when clicked | invariant expected app router to be mounted |
| renames the add-on section and renders highlight severity | invariant expected app router to be mounted |
| shows insufficient critical signals instead of fabricated alerts | invariant expected app router to be mounted |
| renders risk gauge label for Critical | invariant expected app router to be mounted |
| renders risk gauge label for High | invariant expected app router to be mounted |
| renders risk gauge label for Medium | invariant expected app router to be mounted |
| renders risk gauge label for Low | invariant expected app router to be mounted |
| calls recordDecision with selected patient and recommendation hash | invariant expected app router to be mounted |
| shows '-' for package name and price, and masked alert text when privacy mode is on | invariant expected app router to be mounted |
| uses left-aligned clinical conclusion text instead of justified spacing | invariant expected app router to be mounted |
| renders highlight chips for named diagnoses supplied via top_findings highlight_terms | invariant expected app router to be mounted |
| highlights blood pressure values supplied via top_findings highlight_terms | invariant expected app router to be mounted |
| renders clinical and policy reasoning lines from structured annotations | invariant expected app router to be mounted |
| renders without error when reasoning_trace_annotated is absent | invariant expected app router to be mounted |
| renders new CommunicationScript fields when provided | invariant expected app router to be mounted |

**Fix required:** Add `vi.mock("next/navigation", ...)` to `RecommendationPanel.test.tsx`.

---

## Passing Tests (34)

| File | Tests |
|---|---|
| `src/components/access-monitoring/MasterDataTab.test.tsx` | 8 passed |
| `src/components/access-monitoring/AuditLogSearchPanel.test.tsx` | 1 passed |
| `src/app/audit/page.test.tsx` | 1 passed |
| `src/app/page.test.tsx` | 1 passed |
| `src/components/Sidebar.test.tsx` | ? passed |
| `src/components/trend-timeline/TrendTimelineScreen.test.tsx` | ? passed |
| `src/components/trend-timeline/BiomarkerTrendGrid.test.tsx` | ? passed |
| `src/app/trend-timeline/page.test.tsx` | ? passed |
| `src/components/dashboard/PatientDirectoryColumn.test.tsx` | ? passed |
| `src/components/dashboard/PatientList.test.tsx` | ? passed |

---

## Tests Not Yet Written — Email Report Feature

| Scope | Count | Status |
|---|---|---|
| `RecommendationPanel` email button (visibility, click behaviour) | 3 | Not written |
| `ReportPage` component (sections, mailto href, conditional rendering) | 10 | Not written |
| `report/page.tsx` (Strict Mode guard, redirect on missing data) | 2 | Not written |

---

## Final State (after bug-fix pass — 2026-03-30)

```
Test Files  13 passed (13)
     Tests  62 passed (62)
  Duration  2.01s
```

All bugs fixed, all tests passing. Changes made:
1. `vi.mock("next/navigation", ...)` added to `RecommendationPanel.test.tsx` → restored 15 tests
2. 3 new email button test cases added to `RecommendationPanel.test.tsx`
3. `ReportPage.test.tsx` created with 10 cases (all passing)
4. Bug 1: `useRef` guard in `report/page.tsx` — Strict Mode redirect loop fixed
5. Bug 2: `/report` pathname checks in `Sidebar.tsx` and `RoleAwareMain.tsx`