# README — Lead Assignment Flow

**Workstream:** 13.3
**Date:** 2026-04-02
**Status:** Pending
**Scope:** Add a reach-out lane where executives assign pre-analyzed patients to sales as leads, with a new executive assignment screen, a sales lead view on the main page, and a read-only recommendation display component

---

## Context

The demo currently operates a single walk-in patient flow: sales/physician searches a patient, triggers live AI, views results. The client wants a **second flow for reach-out patients**: an executive assigns pre-analyzed ("pre-runned") patients to sales users as leads. Sales receives the assigned leads, views the pre-computed AI recommendation (no re-run), adds notes, and updates lead status.

This introduces the concept of lead ownership, lifecycle tracking, and a two-lane flow (walk-in vs reach-out) to the demo.

---

## Two-Lane Flow

| Lane | Trigger | AI Run | Who Initiates | Sales Action |
|---|---|---|---|---|
| Walk-in (existing) | Patient arrives, sales searches | Live AI call | Sales directly | View recommendation → approve/reject |
| Reach-out (new) | Executive assigns pre-analyzed patient | Pre-computed (no re-run) | Executive assigns → sales receives | View pre-runned recommendation → add notes → update status |

---

## Approach

1. **Shared fixtures:** `sales_users.json` (canonical assignees), `pre_runned_recommendations.json` (captured real payloads), `lead_assignments_seed.json` (demo seed data)
2. **Backend:** New `leads.py` route with in-memory store seeded from fixtures. 7 endpoints for CRUD + pre-runned patient access.
3. **Read-only view:** New `RecommendationReadOnlyView` component extracted from `RecommendationPanel` rendering logic — no fetch, no approval workflow.
4. **Executive screen:** New `/lead-assignment` route with two-panel layout (patient pool + assignment tracker).
5. **Sales view:** Tab toggle on existing `/` page ("Walk-in" | "My Leads") — no sidebar changes for sales.

---

## Related Documents

- [`problem.md`](./problem.md) — gap statement
- [`_discover.md`](./_discover.md) — codebase investigation findings
- [`plan.md`](./plan.md) — implementation plan with tracked tasks
- [`_development_summary.md`](./_development_summary.md) — filled after implementation
- [`_latest_test_results.md`](./_latest_test_results.md) — filled after implementation

---

## Files to Change

### Data Fixtures
| File | Change |
|---|---|
| `assets/sales_users.json` | **New** — 2 canonical sales personas |
| `assets/pre_runned_recommendations.json` | **New** — captured real recommendation payloads for 5-6 patients |
| `assets/lead_assignments_seed.json` | **New** — 2-3 seed assignments at various statuses |
| `assets/patient_registry.json` | Optionally add reach-out-only patients |

### Backend
| File | Change |
|---|---|
| `backend/src/api/routes/leads.py` | **New** — 7 endpoints: leads CRUD + pre-runned patients + sales users |
| `backend/src/api/main.py` | Register `leads.router` |

### Frontend — Types & API
| File | Change |
|---|---|
| `frontend/src/types/leads.ts` | **New** — `LeadStatus`, `LeadAssignment`, `PreRunnedPatient`, `SalesUser` |
| `frontend/src/services/api.ts` | `leadService` with 6 methods |

### Frontend — Components
| File | Change |
|---|---|
| `frontend/src/components/shared/RecommendationReadOnlyView.tsx` | **New** — pure display component extracted from RecommendationPanel |
| `frontend/src/components/lead-assignment/LeadAssignmentScreen.tsx` | **New** — executive two-panel assignment UI |
| `frontend/src/components/leads/LeadDevelopmentView.tsx` | **New** — sales expandable lead cards with AI summary + recommendation view |

### Frontend — Pages & Navigation
| File | Change |
|---|---|
| `frontend/src/app/lead-assignment/page.tsx` | **New** — executive route with role guard |
| `frontend/src/app/page.tsx` | Tab toggle for sales role: "Walk-in" / "My Leads" |
| `frontend/src/components/Sidebar.tsx` | Add "Lead Assignment" to `EXECUTIVE_MENU` |
| `frontend/src/app/login/page.tsx` | Add second sales persona (Arunee Srisawat) |

---

## Out of Scope

- Reach-out patients appearing in normal Patient Search (separate pool)
- Converting a reach-out lead into a walk-in flow
- Persistent lead storage (in-memory only — POC appropriate)
- Real voice-to-text (mock animation only)
- Email/notification on lead assignment
- Executive access to Config screen (separate RBAC question)
