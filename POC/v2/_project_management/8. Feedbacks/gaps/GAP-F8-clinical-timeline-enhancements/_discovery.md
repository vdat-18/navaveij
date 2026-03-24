# Discovery — GAP-F8

**Status:** Complete (pre-implementation analysis)

## Current State

- `ClinicalEventTimeline.tsx` renders a vertical list of time-ordered clinical events.
- Each event row shows: a type badge (Diagnosis, Lab, Screening, Medication), a date, a
  title, a detail value, and FHIR terminology codes.
- The date/time element is displayed as small gray text — not prominent.
- Events are listed chronologically but **not grouped by check-up visit** — all events
  are flat in a single list.
- **No good/bad sign annotation** exists per result.
- No clinical sign definitions datasource exists anywhere in the codebase.

## Timeline Type Fields (from `frontend/src/types/timeline.ts`)

Need to verify whether `TimelineEvent` has:
- A `check_up_event_id` or similar visit grouping field
- A `value` and `reference_range` for lab results (to drive sign annotation)
- A `severity` or `sign` field (likely absent)

If `check_up_event_id` is absent, grouping will use same calendar date as proxy.

## Clinical Sign Definitions Datasource

No static sign definitions exist in the codebase. The nearest reference is
`clinicalConstants.ts` which has threshold values for BMI and blood pressure.

New file `clinical-sign-definitions.ts` to be created with minimum 10 entries:
HbA1c (4548-4), eGFR (33914-3), LDL (2089-1), HDL (2085-9),
Total Cholesterol (2093-3), BMI (39156-5), SBP (8480-6), DBP (8462-4),
FBG (14743-9), WBC (6690-2), Hb (718-7).

Reference ranges should match the guidelines already cited in `clinicalConstants.ts`
(ADA, ACC/AHA, WHO).

## Risk Flags

- If the current `TimelineEvent` type does not include a numeric `value` field for lab
  results, the sign annotation cannot derive from a range comparison. May need to check
  if the value is in the `detail` string field and parse it — or default to severity
  field mapping.
- Visit grouping by date assumes events from the same day are from the same check-up.
  This is a reasonable proxy for demo but may not be clinically accurate for all cases.
