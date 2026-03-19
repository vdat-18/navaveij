# GAP-UI-16 — Privacy Mode: Incomplete PII Masking

**Title:** Extend privacy mode to gate all PII-containing fields consistently
**Status:** Complete
**Wave:** 1

---

## Objective
Ensure privacy mode gates PII-containing fields consistently across screens. Earlier implementations masked only `reasoning_trace`, leaving demographics, patient identifiers, and package/alert details visible.

## Scope
1. Gate demographics display in `page.tsx` line 211 — show `"— / — / —"` in privacy mode instead of hardcoded "35 Yrs / Male / Asian"
2. Gate patient name/ID display in `TrendTimelineScreen.tsx` line 153 — mask or omit `patientToken` and `patientName` in privacy mode
3. Define and document the exact scope of privacy mode: which fields are masked and which are intentionally shown
4. If full masking is not feasible for POC, add a visible disclaimer in the UI when privacy mode is active: "Partial de-identification — some identifying fields may still be visible"
5. Ensure privacy mode state is consistent across all three screens (page.tsx, TrendTimelineScreen.tsx, access-monitoring) — if toggled on one screen, applies everywhere

## Primary Files
- `src/app/page.tsx`
- `src/components/dashboard/RecommendationPanel.tsx`
- `src/components/trend-timeline/TrendTimelineScreen.tsx`

## Depends On
GAP-UI-2 — demographics wiring should complete before extending privacy gating, to avoid gating hardcoded data

## Checkpoint Files
- `_discovery.md`
- `_development_summary.md`
- `_lastest_test_results.md`

## TOR Reference
Security, Privacy & Audit 20% · TOR §5.2 (PII handling)
