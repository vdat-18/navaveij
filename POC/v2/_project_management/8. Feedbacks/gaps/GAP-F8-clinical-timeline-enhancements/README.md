# GAP-F8 — Clinical Timeline Enhancements

**Title:** Bold datetime, visit-based event grouping, and good/bad sign annotation per result
**Status:** Not started
**Phase:** 2 (clinical annotation)

---

## Objective

Improve the clinical event timeline to make timestamps more readable, group events from the
same check-up visit together, and annotate each result with a good/bad sign badge derived
from a static clinical sign definitions datasource.

## Scope

1. **Datetime prominence:** Make the event date/time the lead element of each row — larger,
   bolder font, full date format (e.g., "15 Jan 2025, 09:30").
2. **Visit grouping:** Group events that share the same date (or `check_up_event_id` if
   available) under a collapsible visit header (e.g., "Annual Check-up — 15 Jan 2025").
3. **Good/bad sign badge:** Each result row shows either "✓ Good Sign" (green) or
   "⚠ Concern" (amber/red) based on:
   - Primary: look up LOINC code in `clinical-sign-definitions.ts` + compare value against
     reference range.
   - Fallback: use existing `severity` annotation if available.
   - Unknown: show a neutral "—" badge rather than guess.

## Primary Files

- `POC/v2/frontend/src/components/trend-timeline/ClinicalEventTimeline.tsx`
- `POC/v2/frontend/src/types/timeline.ts` — `TimelineEvent` (check available fields)
- `POC/v2/frontend/src/shared/clinicalConstants.ts` — reference range constants (reuse)

## New Files

- `POC/v2/frontend/src/shared/clinical-sign-definitions.ts` — static LOINC → sign criteria map
  (shared with GAP-F12; create here, import in both)

## Datasource Design

`clinical-sign-definitions.ts` maps LOINC code (or signal ID) to:
```ts
{
  good_condition: string,   // human-readable description of a good finding
  concern_condition: string, // human-readable description of a concern
  threshold_low?: number,
  threshold_high?: number,
  unit?: string,
}
```
Seed with: HbA1c (4548-4), eGFR (33914-3), LDL (2089-1), HDL (2085-9),
Total Cholesterol (2093-3), BMI (39156-5), SBP (8480-6), DBP (8462-4),
FBG (14743-9), WBC (6690-2), Hb (718-7).

## Design Decisions

- **Static-first:** Deterministic reference-range comparison avoids AI inference latency on
  the timeline page, which may render many events at once.
- **Neutral fallback for unknowns:** Showing "—" is preferable to guessing — clinical staff
  should not be misled by a sign annotation that has no evidence basis.
- **Visit grouping by date:** If `check_up_event_id` is not available in the current timeline
  payload, group by same calendar date as a safe proxy.

## Checkpoint Files

- `_discovery.md`
- `_development_summary.md`
- `_latest_test_results.md`

## Feedback Reference

`feedbacks.md` — "Clinical Timeline: Datetime more prominent"
`feedbacks.md` — "Clinical Timeline: Group test results by check-up event"
`feedbacks.md` — "Clinical Timeline: Add annotation to show severity (good sign or bad sign) of each result"
