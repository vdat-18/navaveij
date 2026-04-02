# Discovery — Lead Assignment Flow

**Date:** 2026-04-02
**Investigator:** Claude Code
**Trigger:** Client change request — executive assigns pre-runned patients to sales as leads
**Resolution:** Pending implementation

---

## Investigation Scope

Full audit of the patient flow, role-based navigation, recommendation rendering, and data model to understand what exists and what needs to be built for the two-lane (walk-in + reach-out) patient flow.

---

## Files Audited

### Patient Registry & Data Model

| File | Finding |
|---|---|
| `assets/patient_registry.json` | 3 demo patients: Boon-Mee Siriwat (35M, Healthy Routine), Fai Siriwat (51F, Metabolic Syndrome), Jarat Prasert (57M, Uncontrolled Hypertension) |
| `frontend/src/types/patient.ts` | `Patient` interface: `patient_id`, `patient_name`, `patient_token`, `age?`, `gender?`, `ethnicity?`, `mrn?`, `phone?`, `email?` |
| `backend/src/api/routes/patients.py` | Loads registry from JSON, caches in memory. `GET /api/v1/patients` + `GET /api/v1/patients/{patient_id}` |

### Current Patient Flow (Walk-in)

| File | Finding |
|---|---|
| `frontend/src/app/page.tsx:34` | `SEARCH_FLOW_ROLES = new Set(["physician", "sales"])` — both use the same search flow |
| `frontend/src/app/page.tsx:69-80` | `DashboardPage`: manages `selectedPatient`, `isRuleBasedForced`, screening gaps. Executive/sysadmin redirect away. |
| `frontend/src/app/page.tsx:149-179` | Search flow: utility bar → navbar (NavavejBrand + patient details + controls) → content area |
| `frontend/src/shared/patient-context.tsx` | `PatientContext` stores selected patient in localStorage. Shared across components. |

### Recommendation Panel (walk-in only)

| File | Finding |
|---|---|
| `frontend/src/components/dashboard/RecommendationPanel.tsx:59` | Props: `patientId`, `patientToken`, `privacyMode`, `onRecommendationLoad`, `isRuleBasedForced`, `hideCharts`, `onViewTimeline`, `patient` |
| `frontend/src/components/dashboard/RecommendationPanel.tsx:392-410` | State: `data`, `loading`, `currentStage`, `error`, `isSubmitting`, `decisionOutcome`, `notes`, `showRejectModal`, `rejectReason`, `isPackageRevealed`, `isAddOnsExpanded`, `revealedAddOns`, `riskToast`, `showDealsDrawer`, `selectedAddOns` — 16 state variables, most irrelevant to read-only view |
| `frontend/src/components/dashboard/RecommendationPanel.tsx:447-497` | `useEffect` on `patientToken`: checks client-side cache → calls `clinicalService.streamRecommendation()` → stores result. **This is the live AI fetch that must NOT fire for pre-runned leads.** |
| `frontend/src/components/dashboard/RecommendationPanel.tsx:499-507` | `handleEmailReport()`: pushes to `/report` — irrelevant for leads |
| `frontend/src/components/dashboard/RecommendationPanel.tsx:509+` | `handleApprove()`, `handleReject()` — physician governance workflow, irrelevant for leads |

### Recommendation Response Shape

| File | Finding |
|---|---|
| `backend/src/api/routes/contracts.py:39-65` | `RecommendResponse` Pydantic model: 20+ fields including `ai_recommended_tier`, `add_ons`, `reasoning_trace`, `reasoning_trace_annotated`, `communication_script`, `confidence_score`, `risk_summary`, `patient_high_alert`, `security_metadata`, `metadata` |
| `frontend/src/types/recommendation.ts` | `RecommendationResponse` TypeScript interface — mirrors the backend model |

### Navigation Structure

| File | Finding |
|---|---|
| `frontend/src/components/Sidebar.tsx:18-21` | `EXECUTIVE_MENU`: Executive Dashboard (`/management`) + Access Monitoring (`/access-monitoring`) |
| `frontend/src/components/Sidebar.tsx:30` | `SIDEBAR_HIDDEN_ROLES = new Set(["physician", "sales"])` — sales has no sidebar |
| `frontend/src/app/RoleAwareMain.tsx:8` | `NO_SIDEBAR_ROLES = new Set(["physician", "sales"])` — sales has no left padding |
| `frontend/src/app/page.tsx:149` | Sales renders inside `isSearchFlowRole` block — full-width, standalone layout |

### Login Personas

| File | Finding |
|---|---|
| `frontend/src/app/login/page.tsx` | 4 personas: Dr. Ananya Sharma (physician), Somying Srisuk (sales, `usr-sales-00001`), Wanchai Thongchai (executive, `usr-executive-00001`), System Admin (sysadmin) |

### Management Dashboard Data

| File | Finding |
|---|---|
| `frontend/src/data/manage_stats.json` | Hardcoded metrics including `nurse_adoption_rates.users` with 5 staff names + adoption percentages. These are display-only, not linked to auth. |

### Existing Lead/Assignment Concepts

| Finding |
|---|
| **None.** Searched for `lead`, `assignment`, `assign`, `reach-out` across entire codebase. Zero results. The system is fully stateless and session-based — no patient-to-user mapping exists. |

---

## Key Findings

1. **No existing lead infrastructure.** This is a net-new feature — new data model, new backend endpoints, new frontend screens, new fixture data.

2. **Sales stays no-sidebar.** The plan uses a tab toggle ("Walk-in" / "My Leads") on the existing main page rather than adding a sidebar. This avoids changes to `Sidebar.tsx` and `RoleAwareMain.tsx` for sales, and preserves the current walk-in UX.

3. **Executive sidebar needs one new item.** Add "Lead Assignment" to `EXECUTIVE_MENU` in `Sidebar.tsx`.

4. **RecommendationPanel cannot serve double duty.** The component is 110KB with 16 state variables, live streaming, client-side caching, and interactive workflows. A separate `RecommendationReadOnlyView` is needed — extract the rendering-only portions (tier card, add-ons, reasoning trace, risk summary, communication script, confidence badges) into a pure display component.

5. **Pre-runned data should be captured from real pipeline runs.** Hand-crafting `RecommendResponse` payloads (20+ fields, nested structures) is fragile. Running the actual backend once per patient and saving the JSON is schema-correct by definition.

6. **Sales user registry needed as shared fixture.** A canonical `assets/sales_users.json` shared across the executive assignment screen, login page, and backend API.

7. **The main page tab approach is minimal-churn.** Sales already renders in the `isSearchFlowRole` block. Adding a `salesTab` state variable and conditionally rendering either the existing search flow or a `LeadDevelopmentView` component keeps changes localized to `page.tsx`.

---

## Recommendation

1. Create shared fixtures first: `sales_users.json`, `pre_runned_recommendations.json`, `lead_assignments_seed.json`
2. Build backend leads API (in-memory store, seeded from fixtures)
3. Extract `RecommendationReadOnlyView` from `RecommendationPanel` rendering logic
4. Build executive Lead Assignment screen + sidebar item
5. Add sales tab toggle on main page + `LeadDevelopmentView` component
