# Development Summary — Lead Assignment Flow

**Workstream:** 13.3
**Status:** Implementation complete
**Date:** 2026-04-03

---

## Feature Overview

Workstream 13.3 adds a reach-out lane to the Navavej demo alongside the existing walk-in lane.

- **Executive:** A new sidebar-accessible screen (`/lead-assignment`) where executives see a pool of pre-analyzed patients and assign them to sales users as leads.
- **Sales:** A tab toggle ("Walk-in" / "My Leads") on the existing `/` page. "My Leads" shows assigned leads with pre-computed AI recommendations, status tracking, and note-taking.
- **Walk-in flow:** Completely unchanged.

---

## Key Architectural Decisions

### 1. Separate patient pools (walk-in vs lead)
Walk-in patients (`patient_registry.json`) and lead patients (`pre_runned_recommendations.json`) are completely separate sets. No patient ID, token, or name overlaps between the two pools. This is enforced by a non-overlap assertion in the backend test suite. The separation means walk-in search never surfaces lead patients, and lead views never reference walk-in profiles.

### 2. Fixture-backed pre-runned payloads
Pre-runned recommendation payloads are stored as static JSON fixtures. For this implementation, the lead-only patient set uses curated schema-compatible payloads with distinct patient identities and distinct clinical profiles from the walk-in lane. The lead flow never triggers a live AI call — `ReadOnlyRecommendationView` is a pure display component with no fetch or stream logic.

### 3. Header-based auth enforcement
All lead API endpoints use the existing header-based auth pattern consistent with `patients.py` and `contracts.py`. Executive-only endpoints return HTTP 403 for non-executive callers. Sales-only endpoints enforce ownership (sales users can only read and update their own leads).

### 4. In-memory storage
Lead assignments are stored in-memory and seeded from `lead_assignments_seed.json` on startup. This is appropriate for the POC — persistent storage is out of scope.

### 5. ReadOnlyRecommendationView as a separate component
Rather than adding mode flags to `RecommendationPanel`, a dedicated `ReadOnlyRecommendationView` component was created. It renders the display-relevant sections needed for the lead lane: package/tier summary, priority add-ons, reasoning trace, and risk summary. It contains no live fetch, no client-side cache, no approval/reject workflow, and no email/report actions.

### 6. Tests as first-class deliverables
Backend tests (`test_leads_api.py`) cover all role/scope combinations and include the non-overlap assertion. Frontend Vitest coverage was added for sidebar gating, sales tab toggle behavior, lead panel rendering, and the read-only recommendation view.

---

## Files Created / Modified

| File | Change |
|---|---|
| `assets/sales_users.json` | New — 2 sales personas |
| `assets/pre_runned_recommendations.json` | New — lead-only patients with fixture-backed payloads |
| `assets/lead_assignments_seed.json` | New — seed assignments (lead-only patient IDs) |
| `assets/patient_registry.json` | Unchanged |
| `backend/src/api/routes/leads.py` | New — 7 endpoints with auth enforcement |
| `backend/src/api/main.py` | Modified — register leads router |
| `scripts/tests/test_leads_api.py` | New — behavioral tests + non-overlap assertion |
| `frontend/src/types/leads.ts` | New — TypeScript types |
| `frontend/src/services/api.ts` | Modified — `leadService` (6 methods) |
| `frontend/src/components/leads/ReadOnlyRecommendationView.tsx` | New — pure display component |
| `frontend/src/components/leads/ExecutiveLeadAssignmentScreen.tsx` | New — executive assignment UI |
| `frontend/src/components/leads/SalesLeadDevelopmentPanel.tsx` | New — sales lead view |
| `frontend/src/app/lead-assignment/page.tsx` | New — executive route |
| `frontend/src/app/page.tsx` | Modified — tab toggle for sales |
| `frontend/src/components/Sidebar.tsx` | Modified — Lead Assignment in executive menu |
| `frontend/src/app/login/page.tsx` | Modified — second sales persona (Arunee Srisawat) |

---

## Known Constraints

- **No persistent storage.** Lead assignments reset on backend restart. In-memory only — POC appropriate.
- **No live AI re-run for leads.** Pre-runned payloads are static. If a lead recommendation needs updating, the fixture must be replaced manually.
- **No voice-note capability was implemented.** Sales updates are text notes plus lifecycle status changes only.
- **Second sales user is fully seeded.** `usr-sales-00002` (Arunee Srisawat) is registered in `sales_users.json`, available on the login page, and receives one seeded lead in the default fixture.
- **Config screen changes excluded.** Prompt editing is covered by 13.2B. Free-form model-name editing remains a separate follow-up.
