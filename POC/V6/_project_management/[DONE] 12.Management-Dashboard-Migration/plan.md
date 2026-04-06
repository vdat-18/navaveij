# Plan — Management Dashboard Migration

> Use checkbox (`- [ ]`) syntax to track steps during implementation. Execute scopes in order; do not start a later scope until the earlier scope's gate passes.

**Goal:** Port the v4 Management Dashboard into V6 — component, data file, Next.js route, and Sidebar nav item — with the single import path adaptation required by the V6 data directory convention.

**Architecture:** Minimal-diff port. The v4 component is production-validated. The only required code change inside the component is the import path. The data file is copied verbatim. The page wrapper follows the same App Router pattern used in v4. The Sidebar modification adds one icon import and one `menuItems` entry.

**Tech Stack:** Next.js (App Router), React 19, Tailwind CSS, Framer Motion, Recharts, Lucide React

---

## Scope Map

1. `1.Component-and-Data-Port` — data file + component (import fix only)
2. `2.Navigation-and-Role-Integration` — page wrapper + Sidebar update
3. `3.Verification-and-Visual-Consistency` — dev server + build verification

Each scope has its own checkpoint docs: `README.md`, `_discover.md`, `_development_summary.md`, `_latest_test_results.md`.

---

## Scope 1: Component and Data Port

### Task 1: Create the data file

**Files:**
- Create: `V6/frontend/src/data/manage_stats.json`

- [ ] **Step 1:** Copy the full content verbatim from `v4/frontend/src/assets/manage_stats.json` into `V6/frontend/src/data/manage_stats.json`. No content changes needed.

- [ ] **Step 2:** Verify the file is well-formed JSON.

Run from `V6/frontend/`:

```bash
node -e "JSON.parse(require('fs').readFileSync('src/data/manage_stats.json','utf8')); console.log('valid JSON')"
```

Expected:

```
valid JSON
```

---

### Task 2: Port the component with the import path fix

**Files:**
- Create: `V6/frontend/src/components/management/ManagementDashboard.tsx`

- [ ] **Step 3:** Copy the full content from `v4/frontend/src/components/management/ManagementDashboard.tsx`. Apply exactly one change — update the import on line 35:

  Before:
  ```ts
  import dashboardData from "@/assets/manage_stats.json";
  ```

  After:
  ```ts
  import dashboardData from "@/data/manage_stats.json";
  ```

  No other changes to the component body.

- [ ] **Step 4:** Confirm the TypeScript compiler accepts the file.

Run from `V6/frontend/`:

```bash
npx tsc --noEmit
```

Expected: zero errors related to the new files.

- [ ] **Step 5:** Update Scope 1 checkpoint docs (`_development_summary.md`, `_latest_test_results.md`).

---

## Scope 2: Navigation and Role Integration

### Task 3: Create the Next.js page wrapper

**Files:**
- Create: `V6/frontend/src/app/management/page.tsx`

- [ ] **Step 1:** Create `frontend/src/app/management/page.tsx` mirroring the v4 11-line pattern:

  ```tsx
  import React from "react";
  import { ManagementDashboard } from "@/components/management/ManagementDashboard";

  export default function ManagementPage() {
    return (
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-white">
        <ManagementDashboard />
      </main>
    );
  }
  ```

---

### Task 4: Add the Management Metrics nav item to the Sidebar

**Files:**
- Modify: `V6/frontend/src/components/Sidebar.tsx`

- [ ] **Step 2:** Add `Activity` to the existing Lucide import line in `Sidebar.tsx`.

  Before:
  ```ts
  import { LayoutDashboard, LineChart, ShieldCheck, HelpCircle } from "lucide-react";
  ```

  After:
  ```ts
  import { LayoutDashboard, LineChart, ShieldCheck, HelpCircle, Activity } from "lucide-react";
  ```

- [ ] **Step 3:** Append the fourth `menuItems` entry after the Access Monitoring entry:

  ```ts
  { icon: Activity, label: "Management Metrics", id: "management", href: "/management" },
  ```

- [ ] **Step 4:** Confirm TypeScript compiler accepts the modified Sidebar.

Run from `V6/frontend/`:

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 5:** Run the existing Sidebar test.

Run from `V6/frontend/`:

```bash
npm test -- --testPathPattern=Sidebar
```

Expected: existing test passes; the new nav item is present in the rendered output.

- [ ] **Step 6:** Update Scope 2 checkpoint docs.

---

## Scope 3: Verification and Visual Consistency

### Task 5: End-to-end smoke verification

- [ ] **Step 1:** Start the V6 dev server and navigate to `/management`.

Run from `V6/frontend/`:

```bash
npm run dev
```

Verify:
- Page renders without a white screen or console error
- All four dashboard sections are visible: overview metrics, weekly performance, rejection reasons, nurse adoption rates
- Recharts bar charts render correctly
- Framer Motion entrance animations play on load
- `navavej-card` styling is applied (matching the v4 visual appearance)

- [ ] **Step 2:** Verify the Sidebar nav item.

Checks:
- "Management Metrics" appears in the Sidebar when logged in as `admin`
- "Management Metrics" appears in the Sidebar when logged in as `dpo`
- Clicking the item navigates to `/management`
- The active state (teal highlight) applies to the Management Metrics item when on `/management`
- Physician and nurse logins show no Sidebar at all (existing behavior unchanged)

- [ ] **Step 3:** Verify production build.

Run from `V6/frontend/`:

```bash
npm run build
```

Expected: build completes with zero TypeScript errors and zero missing module errors.

- [ ] **Step 4:** Update Scope 3 and top-level checkpoint docs (`_development_summary.md`, `_latest_test_results.md`).

---

## Execution Handoff

This plan is saved at `_project_management/12.Management-Dashboard-Migration/plan.md`. Execute scope-by-scope, updating each scope's checkpoint docs before moving to the next.
