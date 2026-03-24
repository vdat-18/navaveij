# Context — Feedback Gap-Closure Exercise

**Date:** 2026-03-24
**Author:** Architecture Review
**Folder:** `_project_management/8. Feedbacks/`

---

## 1. What Is This Exercise?

The previous gap-closure rounds (folders `1. POC-Gap-Closure`, `2. v3-Migration`,
`3. Rules-Gap-Closure`, `4. UI-Gap-Closure`) brought the POC v2 into alignment with
API contracts, FHIR standards, rules framework compliance, and baseline UI layout.

This exercise addresses **client and clinical feedback** collected after the POC v2
demonstration. The feedback covers UX flow, visual design, clinical data presentation,
and admin panel features. These are not technical compliance gaps — they are
product quality gaps identified by the end users and client stakeholders.

---

## 2. Why This Matters

| Criterion | Weight | Feedback Impact |
|-----------|--------|-----------------|
| UX/UI Design & Explainability | 20% | Navigation flow, confidence score display, timeline annotations, graph annotations |
| Recommendation Logic & Explainability | 35% | Package presentation, add-on rationale, evidence trace sign annotation |
| Security, Privacy & Auditing | 20% | Audit log de-anonymization eye icons |

Additionally, the client flagged the overall UI tone as too soft for a sales-driven
consultation context, which affects perceived product value across all screens.

---

## 3. What Previous Exercises Already Delivered

- Complete 3-screen navigation (Dashboard, Trend+Timeline, Access Monitoring) — `1. POC-Gap-Closure`
- Risk gauge component with Low/Medium/High/Critical levels — `4. UI-Gap-Closure`
- Add-on recommendations surfaced with priority badges — `4. UI-Gap-Closure`
- Clinical timeline with FHIR terminology codes — `4. UI-Gap-Closure`
- Biomarker trend charts with reference lines — `4. UI-Gap-Closure`
- Audit log panel with SHA-256 hash chain — `1. POC-Gap-Closure`
- Role-based access control (admin/dpo/nurse/doctor) — `1. POC-Gap-Closure`

---

## 4. Scope of This Exercise

In scope:

1. UX navigation restructure for nurse/doctor roles (single-entry + modal sub-screens).
2. Visual enhancements: loading states, risk gauge, confidence score, package seals, UI tone.
3. Add-on display restructure: single column, collapsible, per-add-on rationale.
4. Clinical timeline and graph annotation improvements.
5. Cross-screen linking (toast/popup to trend & timeline).
6. Audit log de-anonymization eye icons (in-memory demo).
7. Clinical good/bad sign datasource and annotation (timeline + evidence trace).
8. Admin panel: rename AI Gateway, remove Auth Config.

Out of scope:

- API contract changes and backend logic changes not driven by these feedbacks.
- FHIR data pipeline changes (owned by Data Platform team).
- Medical Acceptance Test (MAT) re-run (triggered separately after major logic changes).
- Changes to the rule synthesis framework.

---

## 5. Key Reference Documents

- `POC/v2/_project_management/8. Feedbacks/feedbacks.md` (raw client feedback)
- `doc_outputs/onboarding/ai-team-onboarding.md` (UI/UX requirements §4)
- `doc_inputs/ENG_POC_ Smart Health Checkup Recommendation Dashboard_FINAL.md`
- `doc_inputs/ENG_TOR - Smart Health Checkup Recommendation Dashboard v7_Final.md`
- `POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx`
- `POC/v2/frontend/src/components/trend-timeline/ClinicalEventTimeline.tsx`
- `POC/v2/frontend/src/components/trend-timeline/BiomarkerTrendGrid.tsx`
- `POC/v2/frontend/src/components/access-monitoring/AuditLogSearchPanel.tsx`
- `POC/v2/frontend/src/shared/clinicalConstants.ts`
- `POC/v2/frontend/src/types/recommendation.ts`
