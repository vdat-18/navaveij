# Problem Statement

## 1) Navigation Duplication

- Sidebar exposed both `/access-monitoring` and `/audit` for effectively the same monitoring experience.
- Labels suggested different destinations (“Access Monitoring” vs “Governance”) while behavior overlapped.

## 2) Route Behavior Inconsistency

- `/access-monitoring` applied role-gated access behavior.
- `/audit` directly rendered the monitoring screen with a fixed role path, creating a mismatch.

## 3) Privacy Display Quality Gap

- Dashboard privacy fallback values used static placeholders (`tok_name_entity`, `tok_id_entity`, `tok_mrn_entity`, `tok_phone_entity`, `tok_email_entity`).
- Recommendation package/value in privacy mode displayed generic `"Masked"` text.
- This reduced trust in the masking/rehydration demonstration because values looked synthetic instead of backend token-driven.
