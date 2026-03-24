# GAP-F12 — Clinical Evidence Trace Good/Bad Sign Annotation

**Title:** Annotate each AI reasoning trace / clinical evidence item as a positive finding or concern
**Status:** Not started
**Phase:** 2 (clinical annotation)

---

## Objective

In the recommendation panel's AI reasoning / clinical logic section, each supporting evidence
item should be annotated with a sign badge: "✓ Positive Finding" (green) or "⚠ Concern"
(amber/red). The annotation uses a static clinical sign definitions datasource as the primary
source, with AI inference + sessionStorage cache as a fallback for signals without a static
definition.

## Scope

1. In `RecommendationPanel.tsx`, locate the reasoning trace / clinical logic section
   (where supporting evidence signals are listed).
2. For each evidence item: look up its signal ID or LOINC code in `clinical-sign-definitions.ts`
   (created in GAP-F8).
3. If found: compare value against reference thresholds → derive "Positive" or "Concern".
4. If not found and item has a `severity` field: map `Low/Moderate` → "Positive Finding",
   `High/Critical` → "Concern".
5. If no static definition and no severity: call a lightweight AI classification endpoint
   (or a local heuristic) and cache the result in `sessionStorage` by signal ID.
6. Render the badge inline with each evidence row.

## Primary Files

- `POC/v2/frontend/src/components/dashboard/RecommendationPanel.tsx` — reasoning trace section
- `POC/v2/frontend/src/types/recommendation.ts` — `CriticalSignal`: `signal_id`, `severity`,
  `label`, `clinical_note` (confirmed present)
- `POC/v2/frontend/src/shared/clinical-sign-definitions.ts` — shared datasource (created in GAP-F8)

## Optional Backend File (AI fallback only)

- `POC/v2/backend/src/api/routes/clinical.py` — add `/api/clinical/sign-classify` endpoint
  if AI fallback beyond severity-mapping is required

## Sign Derivation Logic (Priority Order)

```
1. Static lookup: clinical-sign-definitions.ts[signal_id or loinc_code]
   → compare value vs threshold_low / threshold_high
   → "positive" if within normal range, "concern" if outside

2. Severity field fallback:
   severity in ["Low", "Moderate"] → "positive"
   severity in ["High", "Critical"] → "concern"

3. AI inference fallback (sessionStorage cached):
   POST /api/clinical/sign-classify { signal_id, label, value, unit }
   → { sign: "positive" | "concern" }
   → cache in sessionStorage[`sign:${signal_id}`]

4. Unknown: render neutral "—" badge
```

## Design Decisions

- **Static-first to avoid latency:** The reasoning trace renders alongside the recommendation.
  AI inference on cache miss would add round-trip latency for every uncached signal.
  Expanding the static definitions map is always preferred over relying on AI inference.
- **Severity-field fallback before AI:** `CriticalSignal.severity` is already in the API
  response and gives a reliable signal-level annotation for the most common cases.
- **SessionStorage cache scope:** Signals are patient-specific in context but sign
  classifications are signal-type-specific (e.g., "elevated HbA1c = concern" is universal).
  Cache by `signal_id` across the session — safe and effective.
- **Shared datasource with GAP-F8:** `clinical-sign-definitions.ts` is created once in
  GAP-F8 and imported here. Maintain it as a single source of truth.

## Checkpoint Files

- `_discovery.md`
- `_development_summary.md`
- `_latest_test_results.md`

## Feedback Reference

`feedbacks.md` — "Clinical logics should indicate if an evidence trace is good sign or bad sign"
