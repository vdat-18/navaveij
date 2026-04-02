# Discovery — Demo Role Rename & Navigation Restructure

**Date:** 2026-03-31
**Investigator:** Claude Code
**Trigger:** TOR alignment review — demo persona names and navigation layout do not match business pitch narrative
**Resolution:** Pending implementation

---

## Investigation Scope

Full codebase audit of every location that references role strings (`nurse`, `dpo`, `admin`) or makes role-based rendering decisions. Frontend and backend both covered.

---

## Files Audited

### Role Type Definition

| File | Finding |
|---|---|
| `frontend/src/shared/auth-context.tsx:7` | `UserRole = "physician" \| "nurse" \| "dpo" \| "admin"` — this is the canonical type; all role comparisons flow from here |

### Demo Persona Configuration

| File | Finding |
|---|---|
| `frontend/src/app/login/page.tsx:9–14` | `PERSONAS` array: 4 entries with hardcoded `role`, `sub`, `name`, `label`. Nurse sub=`usr-nurse-00001`, DPO sub=`usr-dpo-00001`, Admin sub=`usr-admin-00001` |
| `frontend/src/app/login/page.tsx:28` | `SEARCH_FLOW_ROLES = new Set(["physician", "nurse"])` — controls post-login redirect destination |
| `frontend/src/app/login/page.tsx:47–52` | Redirect: search flow roles → `/`, else → `/access-monitoring` |

### Frontend Role-Based UI

| File | Finding |
|---|---|
| `frontend/src/components/Sidebar.tsx:26` | `SIDEBAR_HIDDEN_ROLES = new Set(["physician", "nurse"])` |
| `frontend/src/components/Sidebar.tsx:17–23` | Single `menuItems` array — same 4 items shown to ALL non-hidden roles (no per-role filtering) |
| `frontend/src/app/RoleAwareMain.tsx:8` | `NO_SIDEBAR_ROLES = new Set(["physician", "nurse"])` — controls left-padding |
| `frontend/src/app/page.tsx:34` | `SEARCH_FLOW_ROLES = new Set(["physician", "nurse"])` — controls which UX flow renders |

### Access Monitoring Page & Component

| File | Finding |
|---|---|
| `frontend/src/app/access-monitoring/page.tsx` | Role check gates the page — currently allows `admin` and `dpo` |
| `frontend/src/components/access-monitoring/AccessMonitoringScreen.tsx:16` | Prop type: `role: "admin" \| "dpo"` |
| `frontend/src/components/access-monitoring/AccessMonitoringScreen.tsx:19` | `TabKey = "role" \| "mapping" \| "master" \| "mcp_config" \| "ai_config"` — all 5 tabs defined |
| `frontend/src/components/access-monitoring/AccessMonitoringScreen.tsx:40` | `Promise.all` loads all 8 data sources: snapshot, alerts, audit, rbac, mappings, programs, addOns, sysConfig |
| Imports in AccessMonitoringScreen | `RoleManagementTab`, `MappingToolTab`, `MasterDataTab`, `MCPConfigsTab`, `AIConfigsTab` — all exist as separate components and can be re-imported by a new ConfigurationScreen |

### Management (Executive Dashboard) Page

| File | Finding |
|---|---|
| `frontend/src/app/management/page.tsx` | No role guard — accessible to any non-physician/nurse user (relies on Sidebar visibility only) |
| `frontend/src/components/management/ManagementDashboard.tsx` | Contains "Nurse Adoption Rates" section title and table; no other hardcoded "nurse" strings in the UI copy |

### Trend & Timeline Page

| File | Finding |
|---|---|
| `frontend/src/app/trend-timeline/page.tsx` | Redirect check blocks `physician` and `nurse` only; does not block `dpo`/`admin` |

### Backend Role Definitions

| File | Finding |
|---|---|
| `backend/src/api/security.py:29–35` | `_ROLE_SCOPES` dict — keys: `physician`, `nurse`, `pharmacist`, `dpo`, `admin` |
| `backend/src/api/routes/contracts.py` | `MONITORING_ALLOWED_ROLES` and `RECOMMENDATION_ALLOWED_ROLES` parsed from settings |
| `shared/settings.py:69–71` | `recommendation_allowed_roles = "physician,nurse,pharmacist,admin,dpo"`, `monitoring_allowed_roles = "admin,dpo"`, `api_auth_default_role = "admin"`, `api_auth_default_user_id = "usr-admin-00001"` |
| `.env:44–52` | Env vars mirror settings.py defaults — must be updated in parallel |
| `assets/monitoring.json:200–261` | RBAC matrix with role keys `physician`, `nurse`, `pharmacist`, `admin`, `dpo` |

---

## Key Findings

### Finding 1 — Role strings are consistent throughout (no hidden divergence)

Every layer uses the same string values (`nurse`, `dpo`, `admin`). There are no aliases or mappings between layers. A rename is a straightforward find-and-replace across well-identified files. No hidden coupling found.

### Finding 2 — Sidebar shows identical items to all non-clinical roles

`Sidebar.tsx` has zero per-role filtering. All 4 nav items (Clinical Dashboard, Trend & Timeline, Access Monitoring, Management Metrics) are visible to every user who sees the Sidebar. The new design requires role-based item sets — Executive gets 2 items, SysAdmin gets 2 different items.

### Finding 3 — Config tabs live entirely inside AccessMonitoringScreen

The 5 config tab components (`RoleManagementTab`, `MappingToolTab`, `MasterDataTab`, `MCPConfigsTab`, `AIConfigsTab`) are self-contained and already imported by `AccessMonitoringScreen.tsx`. They can be re-imported directly into a new `ConfigurationScreen.tsx` with no refactoring of the tab components themselves.

### Finding 4 — Management page has no explicit role guard

`/management/page.tsx` has no redirect or access check. Access is currently controlled only by Sidebar visibility (physician/nurse don't see the link). After the rename, `sysadmin` should not see Management Metrics — a route-level guard is required.

### Finding 5 — Trend & Timeline redirect does not cover new role names

`trend-timeline/page.tsx` currently redirects `physician` and `nurse`. After the rename, neither `executive` nor `sysadmin` should reach this page. The redirect set needs to cover all non-clinical roles explicitly.

### Finding 6 — Login redirect hardcoded to /access-monitoring for all non-search roles

Currently both Admin and DPO land on `/access-monitoring` after login. With the new design, Executive should land on `/management` (their primary screen) and SysAdmin should stay on `/access-monitoring`. The redirect logic in `login/page.tsx` needs to be role-aware.

---

## Design Decisions

| Decision | Rationale |
|---|---|
| Rename role strings in ALL layers (not display-only) | Keeps UI role names consistent with backend auth context; avoids mapping shims between display names and internal identifiers |
| Create a new `/configuration` page rather than hiding tabs inside Access Monitoring | Gives SysAdmin a clean, purpose-built entry point; Executive's Access Monitoring view becomes unambiguously monitoring-only |
| Reuse existing tab components in ConfigurationScreen | The 5 tabs are already implemented and working; no logic changes needed, only re-homing |
| Executive loses Clinical Dashboard and Trend & Timeline | An Executive's story is revenue/conversion; clinical patient navigation is irrelevant and distracting for that demo persona |
| Keep persona Thai names, update titles only | Names provide cultural authenticity; only the role labels ("Nurse", "DPO") need to change |
| SysAdmin sub ID changes from `usr-admin-00001` to `usr-sysadmin-00001` | Consistency with renamed role; this is a demo auth system with no persistent user state to migrate |
