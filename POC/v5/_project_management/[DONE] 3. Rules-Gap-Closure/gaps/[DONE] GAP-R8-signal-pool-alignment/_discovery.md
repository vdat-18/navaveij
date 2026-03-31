# Discovery

Status: Complete

## Clinical Decision Ledger (GAP-R8)

| signal_id | pool | current_state | framework_reference | clinical_guideline_source | decision_status |
| --- | --- | --- | --- | --- | --- |
| fbs_upward_trend | ADVANCED low-moderate | missing | framework §3.2 low-moderate pool | clinical-guidelines-reference.md §1.1 trend monitoring | approved_add |
| diagnosis_fatty_liver | ADVANCED low-moderate | missing | framework §3.2 low-moderate pool | clinical-guidelines-reference.md §8.1 NAFLD risk pathway | approved_add |
| family_hx_early_heart_attack | ADVANCED low-moderate | undocumented extra | not traceable in framework pool ledger | no traceable guideline source in derivation ledger | approved_remove |
| symptom_fatigue | ADVANCED low-moderate | undocumented extra | not traceable in framework pool ledger | no traceable guideline source in derivation ledger | approved_remove |
| history_loss_of_consciousness | ADVANCED low-moderate | undocumented extra | not traceable in framework pool ledger | no traceable guideline source in derivation ledger | approved_remove |
| occupational_risk_factory | ADVANCED low-moderate | undocumented extra | not traceable in framework pool ledger | no traceable guideline source in derivation ledger | approved_remove |
| diabetes_confirmation_required | PREMIUM_MULTI_SIGNAL | missing | framework §3.2 moderate pool | clinical-guidelines-reference.md §1.2 DM confirmation pathway | approved_add |
| history_syncope | PREMIUM_MULTI_SIGNAL | missing | framework §3.2 moderate pool | clinical-guidelines-reference.md cardiac risk screening pathway | approved_add |

## Outcome

1. Applied framework-aligned add/remove decisions to signal pools in `sample_ruleset_tier_config.json`.
2. Introduced regression tests to enforce pool membership and duplicate-free constraints.
