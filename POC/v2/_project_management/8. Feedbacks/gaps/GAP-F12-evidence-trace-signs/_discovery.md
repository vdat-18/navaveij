# Discovery — GAP-F12

**Status:** Complete (pre-implementation analysis)

## Current State

- The recommendation panel has a section showing AI reasoning trace / clinical logic
  / supporting evidence (the explainability section).
- `CriticalSignal` type has: `signal_id?`, `label?`, `severity?`, `clinical_note?`.
- `severity` field values confirmed: "Low", "Moderate", "High", "Critical".
- No good/bad sign annotation is currently displayed per evidence item.
- No static clinical sign definitions datasource exists in the codebase.
- The reasoning trace may also include items from `reasoning_trace[]` in the API response —
  need to confirm the exact field name and structure when implementing.

## Data Sources Available

| Source | What it provides | Reliability |
|--------|-----------------|-------------|
| `CriticalSignal.severity` | Risk level of the signal | High (always present) |
| `clinical-sign-definitions.ts` (new) | Static LOINC → sign criteria | High for known codes |
| AI inference endpoint (new, optional) | Classification for unknown signals | Medium (adds latency) |

## Sign Derivation Priority (Confirmed with Client)

1. Static definitions map (primary — no latency)
2. Severity field fallback (Low/Moderate → positive, High/Critical → concern)
3. AI inference with sessionStorage cache (fallback for unknowns)
4. Neutral "—" (for truly unknowns even after AI fallback)

## Shared Dependency with GAP-F8

`clinical-sign-definitions.ts` is created in GAP-F8 and imported here.
GAP-F8 must be implemented before or in parallel with GAP-F12.
If developing in parallel, create the definitions file first as a shared foundation.

## Risk Flags

- The `reasoning_trace[]` field name and its item structure in the API response must be
  confirmed before building the annotation UI. The type definition may need to be read
  directly from `recommendation.ts` before implementation.
- sessionStorage cache invalidation: if a patient is changed mid-session, cached sign
  results from the previous patient may be stale. Cache key should include `patient_id`
  as a prefix: `sign:${patient_id}:${signal_id}`.
