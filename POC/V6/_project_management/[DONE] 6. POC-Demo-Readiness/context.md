# Context — POC Demo-Readiness Gap Closure

**Date:** 2026-03-20
**Folder:** `_project_management/6. POC-Demo-Readiness/`

---

## 1. What Is This Project?

**Navaveij** is a Smart Health Checkup Recommendation Dashboard being built for Navavej International Hospital (Bangkok). The system uses a hybrid Rule + AI model to recommend personalised annual checkup packages and add-on examinations for patients, and presents the output to a physician (ROC Staff) via a web dashboard.

The POC evaluation scoring is weighted as:

| Criterion | Weight |
|---|---|
| Hybrid Recommendation Engine + MCP | 35% |
| Pluggable AI + FHIR terminology | 25% |
| UX / XAI Explainability | 20% |
| Security, Privacy & Audit | 20% |

---

## 2. What Is This Exercise?

The **improved v2** (`POC/v2`) is the primary codebase — it has a complete 3-screen frontend, full contract routes, Stage-2 schema, security/RBAC, caching, and a comprehensive test suite. Core engine functionality is complete.

A **gap assessment** conducted on 2026-03-20 identified gaps between the current implementation and the specific POC evaluation criteria. The gaps fall into three scoring areas:

### Criterion 2 — Pluggable AI + Data Standards (25%)
The BAML client names in code (`NavaveijClient`, `OpenRouterClient`) do not match the architecture specification (`GPT4o`, `Claude35Sonnet`, `LocalLlama`, `ActiveModel`), which evaluators will inspect. The config key for model switching (`LLM_MODEL`) does not match the expected `AI_ACTIVE_CLIENT`. The Mapping Tool UI tab exists but is a static display with no interactive functionality. There is no System Config page to demonstrate the pluggable AI architecture visually. Docker containerization is absent.

### Criterion 3 — UX / Explainability (20%)
Patient selection resets when navigating between screens (local state only — not persisted). The Screening Gap view (Screen 4 per TOR) exists in the Trend Timeline screen but not in the Clinical Dashboard. The Master Data Management tab is basic. There is no Executive Dashboard (Uplift Revenue, Adoption Rate). There is no structured Rejection Reason capture when a physician rejects a recommendation.

### Criterion 4 — Security, Privacy & Audit (20%)
The system runs in `poc_claims` mode with header-based auth. There is no visible SMART on FHIR OAuth flow for evaluators to inspect — this is an explicitly named scoring criterion. The audit log retention policy is not surfaced in the UI.

---

## 3. Scope of This Exercise

In scope (12 implementation tasks):

1. BAML client rename — add GPT4o, Claude35Sonnet, LocalLlama, ActiveModel named clients
2. Config key — rename to `AI_ACTIVE_CLIENT`, expose in system config endpoint
3. System Config tab — new tab in Access Monitoring showing active model, all BAML clients, MCP tool status
4. Mapping Tool UI — make interactive: search, filter, detail panel, mock Add Mapping
5. SNOMED CT audit — confirm coverage in event timeline tool
6. Docker — Dockerfiles + docker-compose.yml for frontend and backend
7. Patient persistence — global context with localStorage, shared across all screens
8. Screening Gap panel — add to Clinical Dashboard (reuse existing component)
9. Master Data tab — add 4 sub-tabs (Programs, Add-On Library, Tier Rules, Clinical Thresholds)
10. Executive Dashboard — placeholder tab with mock KPIs and charts
11. Rejection Reason modal — structured reason capture on reject action
12. SMART on FHIR simulated OAuth — /login page with Keycloak-style consent, mock JWT, route protection, scopes in navbar

Out of scope:
- Core recommendation engine changes (engine is complete)
- Medical Acceptance Test (validation exercise, not code)
- Upstream HIS/FHIR integration (Data Platform boundary)
- Unit Conversion Service (Data Platform boundary)
- Full production hardening beyond POC criteria

---

## 4. Key Reference Documents

- `doc_outputs/onboarding/ai-team-onboarding.md`
- `doc_inputs/ENG_POC_ Smart Health Checkup Recommendation Dashboard_FINAL.md`
- `doc_inputs/ENG_TOR - Smart Health Checkup Recommendation Dashboard v7_Final.md`
- `POC/v2/_project_management/6. POC-Demo-Readiness/gap-closure-plan.md`
- `POC/v2/_project_management/6. POC-Demo-Readiness/implementation/_development_summary.md`
- `POC/v2/baml_src/clients.baml`
- `POC/v2/shared/settings.py`
- `POC/v2/frontend/src/shared/privacy-mode.tsx` (pattern for patient-context.tsx)
- `POC/v2/frontend/src/components/access-monitoring/AccessMonitoringScreen.tsx`
- `POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx`
- `POC/v2/backend/src/api/routes/contracts.py`
