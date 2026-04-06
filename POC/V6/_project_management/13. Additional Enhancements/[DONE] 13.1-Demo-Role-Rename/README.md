# README — Demo Role Rename & Navigation Restructure

**Workstream:** 13.1
**Date:** 2026-04-03
**Status:** ✅ Complete
**Scope:** Rename demo personas (Nurse→Sales, DPO→Executive, Admin→SysAdmin) across all layers, split the Access Monitoring screen into monitoring-only + new Configuration page, and make each role's sidebar tightly scoped to what they actually need to see

---

## Context

The demo currently uses clinical-sounding role names that do not match the business audience Navavej is pitching to. Per the TOR alignment request, the four demo personas need to reflect actual stakeholders:

- **Nurse → Sales**: frontline staff who promote recommended checkup plans to patients
- **DPO → Executive**: leadership who tracks revenue uplift and conversion rates
- **Admin → SysAdmin**: technical operator for system configuration and governance

The current `/access-monitoring` screen is also a monolith — it combines live monitoring (Live Metrics, Anomaly Alerts, Audit Log) with operational configuration (Role Management, Mapping Tool, Master Data, MCP Configs, AI Configs) in a single tab interface visible to both Admin and DPO. This conflation is confusing for demo purposes. The restructure separates it into two purpose-built screens.

---

## Final Role → Navigation Mapping

| Role (new) | Was | Sidebar items | Landing page on login |
|---|---|---|---|
| `physician` | unchanged | — (no sidebar, patient search flow) | `/` |
| `sales` | `nurse` | — (no sidebar, patient search flow) | `/` |
| `executive` | `dpo` | Executive Dashboard, Access Monitoring | `/management` |
| `sysadmin` | `admin` | Access Monitoring, Configuration | `/access-monitoring` |

**Executive Dashboard** = renamed sidebar label for `/management` (the Management Metrics page)
**Access Monitoring** = monitoring-only view: Live Metrics Bar + Anomaly Alerts + Audit Log Search (no config tabs)
**Configuration** = new `/configuration` page: Role Management + Mapping Tool + Master Data + MCP Configs + AI Configs

---

## Scope

Single-phase implementation — no subdirectory scopes needed. All tasks execute in order within this workstream.

Master sequence: [`plan.md`](./plan.md)

---

## Related Documents

- [`problem.md`](./problem.md) — gap statement
- [`_discover.md`](./_discover.md) — codebase investigation findings
- [`plan.md`](./plan.md) — implementation plan with tracked tasks
- [`_development_summary.md`](./_development_summary.md) — filled after implementation
- [`_latest_test_results.md`](./_latest_test_results.md) — filled after implementation

---

## Post-Review Cleanup

A follow-up verification sweep on **2026-04-03** found and fixed a second wave of stale role-rename leftovers outside the main production-path implementation:

- backend/script test helpers still defaulting to `admin`
- fixture user IDs in `assets/monitoring.json` still using `usr-admin-*`, `usr-dpo-*`, and `usr-nurse-*`
- stale role comments in `page.tsx` and `RoleAwareMain.tsx`
- a remaining user-facing dashboard label mentioning `nurses`
- the internal dashboard data key `nurse_adoption_rates`

The workstream is now considered complete with those cleanup items folded in.

---

## Files to Change

### Backend
| File | Change |
|---|---|
| `shared/settings.py` | Role strings in `recommendation_allowed_roles`, `monitoring_allowed_roles`, `api_auth_default_role`, `api_auth_default_user_id` |
| `backend/src/api/security.py` | `_ROLE_SCOPES` dict keys |
| `backend/src/api/routes/contracts.py` | Any hardcoded role string refs |
| `.env` | Env var values mirroring settings.py |
| `assets/monitoring.json` | RBAC matrix role keys |

### Frontend — Core Auth
| File | Change |
|---|---|
| `frontend/src/shared/auth-context.tsx` | `UserRole` type: `"nurse"→"sales"`, `"dpo"→"executive"`, `"admin"→"sysadmin"` |
| `frontend/src/app/login/page.tsx` | PERSONAS array, SEARCH_FLOW_ROLES, redirect logic |
| `frontend/src/app/page.tsx` | SEARCH_FLOW_ROLES set, role string refs |
| `frontend/src/app/RoleAwareMain.tsx` | NO_SIDEBAR_ROLES set |

### Frontend — Navigation
| File | Change |
|---|---|
| `frontend/src/components/Sidebar.tsx` | Role-based menu items per role; rename "Management Metrics"→"Executive Dashboard"; add Configuration entry; SIDEBAR_HIDDEN_ROLES |

### Frontend — Pages / Access Guards
| File | Change |
|---|---|
| `frontend/src/app/access-monitoring/page.tsx` | Role check: `"admin"\|"dpo"` → `"executive"\|"sysadmin"` |
| `frontend/src/app/management/page.tsx` | Restrict to `executive` only; title rename |
| `frontend/src/app/trend-timeline/page.tsx` | Update redirect — neither executive nor sysadmin should reach it |
| `frontend/src/app/configuration/page.tsx` | **NEW** — SysAdmin-only configuration page |

### Frontend — Components
| File | Change |
|---|---|
| `frontend/src/components/access-monitoring/AccessMonitoringScreen.tsx` | Strip config tabs; update role prop type; remove config data loading |
| `frontend/src/components/configuration/ConfigurationScreen.tsx` | **NEW** — houses the 5 config tabs (reuse existing tab components) |
| `frontend/src/components/management/ManagementDashboard.tsx` | "Nurse Adoption Rates" → "Sales Adoption Rates"; any "nurse" label strings |

---

## Out of Scope

- Redesigning the clinical recommendation flow or BAML prompts
- Adding new data to the Management Dashboard
- Changing audit log retention or RBAC permission semantics
- Production auth changes (SMART on FHIR, POC Claims modes) — only the `smart_on_fhir_demo` persona list is affected
- Adding automated component tests for the new ConfigurationScreen
