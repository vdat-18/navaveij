# Plan — Demo Role Rename & Navigation Restructure

> Use checkbox (`- [ ]`) syntax to track steps during implementation. Execute tasks in order.

**Goal:** Rename demo personas (Nurse→Sales, DPO→Executive, Admin→SysAdmin) across all layers; split Access Monitoring into monitoring-only + new Configuration page; give each role a tightly scoped sidebar; fix all header/navigation issues post-rename.

**Architecture:** Rename-and-restructure. Role strings are consistent throughout the stack. Navigation is sidebar-driven for executive/sysadmin; standalone search flow for physician/sales.

**Tech Stack:** Python (FastAPI, Pydantic Settings), Next.js (App Router), React 19, TypeScript, Lucide React

---

## Phase 1 — Role Rename & Screen Restructure ✅ COMPLETE

### Task 1 — Backend role string rename ✅
- [x] `_ROLE_SCOPES` keys in `backend/src/api/security.py`: nurse→sales, dpo→executive, admin→sysadmin
- [x] `shared/settings.py`: default role/user IDs and allowed-role lists updated
- [x] `.env`: mirrored
- [x] `assets/monitoring.json`: RBAC matrix role keys + audit log sample entry updated
- [x] `contracts.py`: confirmed no hardcoded role strings

### Task 2 — Frontend UserRole type + role set constants ✅
- [x] `auth-context.tsx`: `UserRole = "physician" | "sales" | "executive" | "sysadmin"`
- [x] `page.tsx`: `SEARCH_FLOW_ROLES = new Set(["physician", "sales"])`
- [x] `RoleAwareMain.tsx`: `NO_SIDEBAR_ROLES = new Set(["physician", "sales"])`

### Task 3 — Login page persona + redirect update ✅
- [x] PERSONAS array: Nurse Somying Srisuk → Somying Srisuk (Sales); Wanchai Thongchai DPO → Wanchai Thongchai (Executive); admin → sysadmin sub IDs
- [x] `SEARCH_FLOW_ROLES`: nurse → sales
- [x] Post-login redirect: executive → `/management`, sysadmin → `/access-monitoring`, search roles → `/`

### Task 4 — Sidebar role-based navigation ✅
- [x] Removed single 4-item menu; replaced with role-specific menus
- [x] Executive menu: Executive Dashboard + Access Monitoring
- [x] SysAdmin menu: Access Monitoring + Configuration
- [x] `SIDEBAR_HIDDEN_ROLES`: nurse → sales
- [x] Added `Settings` icon from lucide-react

### Task 5 — Create Configuration screen ✅
- [x] `frontend/src/components/configuration/ConfigurationScreen.tsx` — 5 config tabs (reused existing tab components)
- [x] `frontend/src/app/configuration/page.tsx` — sysadmin-only page

### Task 6 — Update Access Monitoring screen (monitoring-only) ✅
- [x] `AccessMonitoringScreen.tsx`: removed 5 config tabs + config state + config data loading
- [x] Role prop: `"admin" | "dpo"` → `"executive" | "sysadmin"`
- [x] `access-monitoring/page.tsx`: role check updated; subtitle updated

### Task 7 — Page access guards (initial) ✅
- [x] `management/page.tsx`: executive-only guard; non-executive → `router.replace("/")`
- [x] `trend-timeline/page.tsx`: redirects all roles to their home screen

### Task 8 — Rename UI strings ✅
- [x] "Nurse Adoption Rates" → "Sales Adoption Rates" in ManagementDashboard
- [x] `api.ts`: role type annotations + fallback defaults updated
- [x] `app/api/auth/context/route.ts`: ROLE_SCOPES dict updated
- [x] Test files updated: Sidebar.test.tsx, trend-timeline/page.test.tsx, AuditLogSearchPanel.test.tsx

**Phase 1 result:** 72/72 frontend tests passing, zero TypeScript errors in production code.

---

## Phase 2 — Header & Navigation Fix ✅ COMPLETE

*Root cause: hardcoded `href="/"` and `router.replace("/")` break navigation after the role rename, because executive and sysadmin should never land on the clinical root `/`. Logout button is absent from all executive/sysadmin screens.*

### Design principle

| Role | Screens | Navigation | Logout |
|---|---|---|---|
| Physician | `/` (standalone) | none | already in page header |
| Sales | `/` (standalone) | none | already in page header |
| Executive | `/management` ↔ `/access-monitoring` | Sidebar | add to Sidebar |
| SysAdmin | `/access-monitoring` ↔ `/configuration` | Sidebar | add to Sidebar |
| Report | `/report` (standalone) | Close button only | not applicable |

---

### Task 9 — Add logout to Sidebar ✅

**Files:**
- Modify: `frontend/src/components/Sidebar.tsx`

- [x] **Step 1:** Add `LogOut` to lucide-react import.
- [x] **Step 2:** Destructure `logout` from `useAuth()` (already imported).
- [x] **Step 3:** Add Logout button below Support button in the `mt-auto` section.

---

### Task 10 — Root `/` redirect for executive and sysadmin ✅

**Files:**
- Modify: `frontend/src/app/page.tsx`

- [x] **Step 1:** Add `useRouter` import from `next/navigation`.
- [x] **Step 2:** Add redirect `useEffect` at the top of `DashboardPage`:
  - executive → `/management`
  - sysadmin → `/access-monitoring`
- [x] **Step 3:** Add early `return null` guard while redirect fires.
- [x] **Step 4:** Fix stale comment `// physician/nurse flow only` → `// physician/sales flow only`.

---

### Task 11 — Fix `/management` redirect destination ✅

**Files:**
- Modify: `frontend/src/app/management/page.tsx`

- [x] **Step 1:** Change `router.replace("/")` to role-aware target:
  - sysadmin → `/access-monitoring`
  - others → `/`

---

### Task 12 — Remove "Back to Summary" from Access Monitoring ✅

**Files:**
- Modify: `frontend/src/app/access-monitoring/page.tsx`

- [x] **Step 1:** Remove `<Link href="/">Back to Summary</Link>` entirely.
- [x] **Step 2:** Right side of header: `[Privacy Mode Toggle] [Role Badge]` only.

---

### Task 13 — Replace access-denied card in Configuration with immediate redirect ✅

**Files:**
- Modify: `frontend/src/app/configuration/page.tsx`

- [x] **Step 1:** Add `useRouter` import.
- [x] **Step 2:** Add redirect `useEffect`: executive → `/management`, others → `/`.
- [x] **Step 3:** Replace the full access-denied JSX block with `return null`.

---

### Task 14 — Add Close button to Report page ✅

**Files:**
- Modify: `frontend/src/components/report/ReportPage.tsx`

- [x] **Step 1:** Add `useRouter` import from `next/navigation`.
- [x] **Step 2:** Instantiate `const router = useRouter()` inside the component.
- [x] **Step 3:** Add Close button BEFORE Print button in the action bar.

---

## Final Verification (Phase 2) ✅

- [x] **Test suite:** 72/72 tests passing (15 test files)
- [x] **TypeScript check:** zero errors in production code (`tsc --noEmit | grep -v "\.test\."`)
- [x] **Test mocks updated:** `page.test.tsx` + `ReportPage.test.tsx` — added `next/navigation` mock for `useRouter`

- [x] **Navigation smoke test:**

  | Scenario | Expected |
  |---|---|
  | Executive sidebar | Executive Dashboard · Access Monitoring · Support · Logout |
  | SysAdmin sidebar | Access Monitoring · Configuration · Support · Logout |
  | Executive hits `/` | → `/management` |
  | Executive hits `/configuration` | → `/management` |
  | SysAdmin hits `/` | → `/access-monitoring` |
  | SysAdmin hits `/management` | → `/access-monitoring` |
  | Access Monitoring header | No "Back to Summary" link |
  | Report page | Close button present; returns to previous screen |

- [x] **Update checkpoint docs** (`_development_summary.md`, `_latest_test_results.md`).
