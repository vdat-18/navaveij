# Plan — Unify Patient Search/Card Column Across Screens

## Summary

Standardize the patient-search-and-cards column used in Dashboard and Trend Timeline so both screens use the exact same reusable component, with identical CSS classes and UI behavior.

## Current State Analysis

- Dashboard renders the patient column inline at:
  - [page.tsx:L141-L150](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v2/frontend/src/app/page.tsx#L141-L150)
  - Uses wrapper classes: `xl:col-span-2` + inner `bg-[#fcfdfe] p-4 rounded-[20px] border border-navavej-border min-h-[600px] shadow-inner`.
- Trend Timeline renders a very similar but not identical inline column at:
  - [trend-timeline/page.tsx:L45-L53](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v2/frontend/src/app/trend-timeline/page.tsx#L45-L53)
  - Uses wrapper classes: `xl:col-span-3` + inner `... min-h-[640px] ...`.
- Both columns mount the same list component:
  - [PatientList.tsx](file:///Users/nguyen.tran/Documents/GitHub/navavej/navaveij/POC/v2/frontend/src/components/dashboard/PatientList.tsx)
- Because wrappers are duplicated inline with different classes, visual width/height behavior diverges between screens.

## Assumptions & Decisions

- Scope: `POC/v2` frontend only.
- Target screens: Dashboard + Trend Timeline.
- Strictness: exact same width/styles and behavior in both screens.
- Canonical styling source for the shared column: reuse Dashboard’s existing wrapper classes (`xl:col-span-2`, `min-h-[600px]`) to avoid introducing new visual design decisions.

## Proposed Changes

### 1) Introduce one shared patient column wrapper component

#### New file
- `POC/v2/frontend/src/components/dashboard/PatientDirectoryColumn.tsx`

#### What/Why/How
- Create a reusable component that encapsulates:
  - Outer grid column class (fixed to `xl:col-span-2`).
  - Inner container class (`bg-[#fcfdfe] p-4 rounded-[20px] border border-navavej-border min-h-[600px] shadow-inner`).
  - `<PatientList />` mounting with passthrough props (`onSelectPatient`, `selectedId`, `privacyMode`).
- This removes inline duplication and guarantees exact class parity across both screens.

### 2) Replace Dashboard inline patient column with shared component

#### File
- `POC/v2/frontend/src/app/page.tsx`

#### What/Why/How
- Replace the inline patient column block (current lines ~141–150) with `<PatientDirectoryColumn ... />`.
- Keep current props behavior unchanged (`handleSelectPatient`, `selectedPatient?.patient_id`, `privacyMode`).
- Preserve all surrounding layout behavior except replacing duplicated wrapper markup.

### 3) Replace Trend Timeline inline patient column with shared component

#### File
- `POC/v2/frontend/src/app/trend-timeline/page.tsx`

#### What/Why/How
- Replace the inline patient column block (current lines ~45–53) with the same `<PatientDirectoryColumn ... />`.
- Keep current selection behavior unchanged (`setSelectedPatient`, `selectedPatient?.patient_id`, `privacyMode`).
- Remove trend-specific wrapper classes so both screens render the exact same shell.

### 4) Add focused tests to lock component parity behavior

#### Files
- `POC/v2/frontend/src/components/dashboard/PatientList.test.tsx` (update/add assertions if needed)
- `POC/v2/frontend/src/app/page.test.tsx` (existing)
- `POC/v2/frontend/src/app/trend-timeline/page.test.tsx` (new test if absent)

#### What/Why/How
- Add/adjust tests to confirm both pages render the shared patient column component and not separate inline wrappers.
- Keep tests implementation-focused on rendered structure/behavior parity (same shell class presence and same PatientList interactions) to prevent future drift.

## Verification Steps

1. Run targeted frontend tests for changed screens/components:
- Dashboard page test(s)
- Trend Timeline page test(s)
- Patient list test(s)

2. Manual UI verification in v2 frontend:
- Open Dashboard and Trend Timeline.
- Confirm patient column width, container style, and min-height are visually identical.
- Confirm search bar behavior, filtering, and patient-card selection interactions remain identical in both screens.

3. Regression sanity:
- Run a broader v2 frontend test subset related to dashboard/trend components to ensure no side effects.
