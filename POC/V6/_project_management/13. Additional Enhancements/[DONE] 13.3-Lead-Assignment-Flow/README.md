# README — Lead Assignment Flow

**Workstream:** 13.3
**Date:** 2026-04-02 (updated 2026-04-03)
**Status:** Implementation complete — docs updated to reflect corrected architecture
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

## Patient Pool Separation

**Walk-in pool** and **lead pool** are completely separate data sets with no overlap.

| Pool | Source file | Patient identities |
|---|---|---|
| Walk-in | `assets/patient_registry.json` | 3 patients: `id_33cc44dd`, `id_1a2b3c4d`, `id_d4f2b7e6` |
| Lead (reach-out) | `assets/pre_runned_recommendations.json` | Lead-only patients with distinct IDs, tokens, and names |

**Rules:**
- Lead patients must never appear in walk-in search (`patientService.getAll()` reads only `patient_registry.json`).
- Walk-in patients must never appear in the lead fixture.
- `test_leads_api.py` includes a non-overlap assertion that enforces this at test time.

---

## Approach

1. **Separate lead fixtures:** `sales_users.json` (canonical assignees), `pre_runned_recommendations.json` (lead-only patients with fixture-backed payloads — real captured AI output where available, schema-valid curated payloads otherwise), `lead_assignments_seed.json` (demo seed data referencing only lead-only patient IDs).
2. **Backend:** New `leads.py` route with in-memory store seeded from fixtures. 7 endpoints for CRUD + pre-runned patient access. All endpoints enforce the existing header-based auth pattern with explicit executive-only and sales-only scope checks.
3. **Read-only view:** New `ReadOnlyRecommendationView` component — pure display, no live fetch, no approval workflow.
4. **Executive screen:** New `/lead-assignment` route with two-panel layout (patient pool + assignment tracker).
5. **Sales view:** Tab toggle on existing `/` page ("Walk-in" | "My Leads") — no sidebar changes for sales.

---

## Related Documents

- [`problem.md`](./problem.md) — gap statement
- [`_discover.md`](./_discover.md) — codebase investigation findings
- [`plan.md`](./plan.md) — implementation plan with tracked tasks
- [`_development_summary.md`](./_development_summary.md) — architectural decisions and file inventory
- [`_latest_test_results.md`](./_latest_test_results.md) — test run results

---

## Files Changed

### Data Fixtures
| File | Change |
|---|---|
| `assets/sales_users.json` | **New** — 2 canonical sales personas |
| `assets/pre_runned_recommendations.json` | **New** — lead-only patients with fixture-backed recommendation payloads (no walk-in overlap) |
| `assets/lead_assignments_seed.json` | **New** — seed assignments referencing only lead-only patient IDs |
| `assets/patient_registry.json` | **Unchanged** — walk-in-only, 3 patients |

### Backend
| File | Change |
|---|---|
| `backend/src/api/routes/leads.py` | **New** — 7 endpoints with auth enforcement |
| `backend/src/api/main.py` | Register `leads.router` |

### Backend Tests
| File | Change |
|---|---|
| `scripts/tests/test_leads_api.py` | **New** — role/scope coverage + non-overlap assertion |

### Frontend — Types & API
| File | Change |
|---|---|
| `frontend/src/types/leads.ts` | **New** — `LeadStatus`, `LeadAssignment`, `PreRunnedPatient`, `SalesUser` |
| `frontend/src/services/api.ts` | `leadService` with 6 methods |

### Frontend — Components
| File | Change |
|---|---|
| `frontend/src/components/leads/ReadOnlyRecommendationView.tsx` | **New** — pure display, no fetch/stream/actions |
| `frontend/src/components/leads/ExecutiveLeadAssignmentScreen.tsx` | **New** — executive two-panel assignment UI |
| `frontend/src/components/leads/SalesLeadDevelopmentPanel.tsx` | **New** — sales lead workspace with status + notes updates |

### Frontend — Pages & Navigation
| File | Change |
|---|---|
| `frontend/src/app/lead-assignment/page.tsx` | **New** — executive route with role guard |
| `frontend/src/app/page.tsx` | Tab toggle for sales role: "Walk-in" / "My Leads" |
| `frontend/src/components/Sidebar.tsx` | Add "Lead Assignment" to `EXECUTIVE_MENU` |
| `frontend/src/app/login/page.tsx` | Add second sales persona (Arunee Srisawat) |

---

## Out of Scope

- Reach-out patients appearing in normal Patient Search (separate pool — by design)
- **Reusing walk-in patient identities in the lead lane** (explicitly rejected — see patient pool separation above)
- Converting a reach-out lead into a walk-in flow
- Persistent lead storage (in-memory only — POC appropriate)
- Real voice-to-text or audio capture
- Email/notification on lead assignment
- Free-form model-name editing or config screen changes (separate follow-up)
