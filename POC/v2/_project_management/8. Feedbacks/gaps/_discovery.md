# Discovery — Feedbacks Gap-Closure Baseline

**Status:** In progress (WS-A follow-up updates applied on 2026-03-24)

## Newly confirmed findings

- Loading UX intent has shifted from step-card-first to **hero horizontal loading bar** with compact secondary steps.
- Risk gauge trust concern is valid at contract level:
  - frontend expects top-level `overall_risk_level`
  - backend response model previously omitted this field, despite clinical signals carrying risk level.
- Risk can appear “dummy” in missing-record fallback paths (`overall_risk_level = "Low"` with empty signals), so provenance is required for transparent UI interpretation.
- Native hover-style risk-info interactions are fragile in real use; explicit click-triggered summary toast provides reliable visibility.
- Generic “definition-style” risk summary wording is insufficient; summary text now needs to be patient-specific and generated from risk drivers.
- AI Gateway baseline updates are delivered, but additional refactor direction (information hierarchy and visual density) is still needed and now explicitly documented in GAP-F13.

## Scope impact

- WS-A follow-up now includes:
  - loading hierarchy refinement
  - risk contract + provenance wiring
  - risk meaning explainability in UI (anchored click-toast + backend-generated summary wording)
  - documentation of deferred AI Gateway refactor
