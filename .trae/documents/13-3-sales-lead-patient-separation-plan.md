# Plan — 13.3 Sales-Lead Patient Separation

## Summary

Correct the lead-assignment implementation so the sales-lead lane uses its own patient set, completely separate from the 3 existing walk-in patients:

- `id_33cc44dd`
- `id_1a2b3c4d`
- `id_d4f2b7e6`

The lead-assignment UI and APIs already exist in `POC/V6`. The mistake is in fixture ownership: the current lead pool reuses the same patient identities, profiles, and recommendations as walk-in. The correction is to replace that reused lead data with a distinct lead-only patient set and then update the dependent tests and workstream docs.

## Current State Analysis

### Confirmed walk-in source of truth

- `POC/V6/assets/patient_registry.json` contains exactly the 3 walk-in patients and is used by `POC/V6/backend/src/api/routes/patients.py`.
- `POC/V6/frontend/src/services/api.ts` exposes `patientService.getAll()`, which feeds walk-in search components including:
  - `POC/V6/frontend/src/components/dashboard/PatientSearchEntry.tsx`
  - `POC/V6/frontend/src/components/dashboard/PatientList.tsx`

### Confirmed lead flow source of truth

- Lead APIs already load separate lead fixtures from:
  - `POC/V6/assets/pre_runned_recommendations.json`
  - `POC/V6/assets/lead_assignments_seed.json`
  - `POC/V6/assets/sales_users.json`
- Those fixtures are consumed by:
  - `POC/V6/backend/src/api/routes/leads.py`
  - `POC/V6/frontend/src/components/leads/ExecutiveLeadAssignmentScreen.tsx`
  - `POC/V6/frontend/src/components/leads/SalesLeadDevelopmentPanel.tsx`
  - `POC/V6/frontend/src/components/leads/ReadOnlyRecommendationView.tsx`

### Confirmed mistake

- `POC/V6/assets/pre_runned_recommendations.json` currently reuses the same patient IDs, tokens, names, and scenario identities as the walk-in registry.
- `POC/V6/assets/lead_assignments_seed.json` then reuses those same identities for seeded sales leads.
- `POC/V6/scripts/tests/test_leads_api.py` hardcodes those reused walk-in patient IDs and tokens.
- `POC/V6/_project_management/13. Additional Enhancements/13.3-Lead-Assignment-Flow/README.md`
  and `plan.md` currently describe or imply a shared-patient approach that is now explicitly rejected.

## Assumptions & Decisions

- The 3 walk-in patients stay unchanged in `POC/V6/assets/patient_registry.json`.
- The lead-assignment flow will use a new lead-only patient set with new:
  - `patient_id`
  - `patient_token`
  - `patient_name`
  - profile fields
  - recommendation payloads
- No new runtime UI or API contract is required for this correction because the lead flow is already sourced from lead-specific fixtures; only the contents of those fixtures and their tests/docs need to change.
- To prevent regression, verification must explicitly prove there is no overlap between walk-in patient identities and lead patient identities.

## Proposed Changes

### 1. Replace reused lead patients with lead-only demo patients

**Files**

- `POC/V6/assets/pre_runned_recommendations.json`
- `POC/V6/assets/lead_assignments_seed.json`

**What**

- Remove the reused walk-in patients from the pre-runned lead fixture.
- Create a new lead-only patient set for the sales-lead lane.
- Ensure each new lead patient has:
  - a unique `patient_id`
  - a unique `patient_token`
  - a unique display name
  - distinct scenario/profile framing
  - a complete recommendation payload compatible with the current `PreRunnedRecommendationResponse`

**How**

- Keep the existing file schema unchanged so current code paths continue to work.
- Use 3 lead-only patients so the executive screen still has a meaningful pool and the seeded assignments can cover multiple statuses.
- Keep recommendation payload shape compatible with the fields already rendered by:
  - `ReadOnlyRecommendationView.tsx`
  - `ExecutiveLeadAssignmentScreen.tsx`
  - `SalesLeadDevelopmentPanel.tsx`

### 2. Keep walk-in registry isolated

**Files**

- `POC/V6/assets/patient_registry.json`

**What**

- Do not add the new sales-lead patients to the walk-in registry.
- Preserve the current 3 walk-in patients as walk-in-only fixtures.

**Why**

- Walk-in search is already driven by `patient_registry.json`, so keeping the new lead patients out of this file preserves the intended separation without changing the walk-in flow.

### 3. Update lead tests to target the new lead-only identities

**Files**

- `POC/V6/scripts/tests/test_leads_api.py`

**What**

- Replace all hardcoded reused walk-in patient IDs/tokens with the new lead-only IDs/tokens.
- Keep the same behavioral coverage:
  - executive can create an assignment
  - sales sees only own leads
  - sales can update allowed lead
  - unauthorized actions are rejected
  - pre-runned recommendation returns stored payload

**Additional acceptance assertion**

- Add an explicit non-overlap assertion that no `patient_id` or `patient_token` in the lead fixture exists in `patient_registry.json`.

### 4. Refresh workstream documentation to match the corrected architecture

**Files**

- `POC/V6/_project_management/13. Additional Enhancements/13.3-Lead-Assignment-Flow/README.md`
- `POC/V6/_project_management/13. Additional Enhancements/13.3-Lead-Assignment-Flow/_discover.md`
- `POC/V6/_project_management/13. Additional Enhancements/13.3-Lead-Assignment-Flow/plan.md`
- `POC/V6/_project_management/13. Additional Enhancements/13.3-Lead-Assignment-Flow/_development_summary.md`
- `POC/V6/_project_management/13. Additional Enhancements/13.3-Lead-Assignment-Flow/_latest_test_results.md`

**What**

- Update the docs so they clearly state:
  - walk-in patients and sales-lead patients are separate pools
  - the lead lane does not reuse walk-in profiles or recommendations
  - verification included a fixture non-overlap check

**Note**

- `_development_summary.md` and `_latest_test_results.md` do not currently exist and should be created during implementation if they are still missing.

### 5. Leave runtime code unchanged unless fixture compatibility breaks

**Files reviewed**

- `POC/V6/backend/src/api/routes/leads.py`
- `POC/V6/frontend/src/types/leads.ts`
- `POC/V6/frontend/src/services/api.ts`
- `POC/V6/frontend/src/components/leads/ExecutiveLeadAssignmentScreen.tsx`
- `POC/V6/frontend/src/components/leads/SalesLeadDevelopmentPanel.tsx`
- `POC/V6/frontend/src/app/page.tsx`
- `POC/V6/frontend/src/app/lead-assignment/page.tsx`
- `POC/V6/frontend/src/components/Sidebar.tsx`
- `POC/V6/frontend/src/app/login/page.tsx`

**Decision**

- Do not change these files for this correction unless the new lead fixtures expose a compatibility gap during test execution.
- Their current contracts are already generic enough to accept a different lead-only patient set.

## Verification Steps

### Data verification

- Confirm `POC/V6/assets/patient_registry.json` still contains only the 3 walk-in patients.
- Confirm every patient in `POC/V6/assets/pre_runned_recommendations.json` is distinct from every walk-in patient by:
  - `patient_id`
  - `patient_token`
  - `patient_name`

### Backend verification

- Run targeted pytest for `POC/V6/scripts/tests/test_leads_api.py`.
- Ensure all tests pass after swapping to lead-only patient identities.

### Frontend sanity verification

- Verify the executive lead-assignment screen still renders the new lead-only pool from `/api/pre-runned-patients`.
- Verify the sales “My Leads” view still loads seeded assignments and recommendation previews for the new lead-only patients.
- Verify walk-in search continues to surface only the original 3 walk-in patients.

## Execution Sequence

1. Replace the reused lead fixtures with a new lead-only patient set.
2. Update seeded assignments to point only to those new lead patients.
3. Update `test_leads_api.py` to reference the new lead IDs/tokens and add a non-overlap assertion.
4. Run targeted tests and fix any compatibility break.
5. Update the 13.3 workstream docs to record the corrected separation rule and verified results.
