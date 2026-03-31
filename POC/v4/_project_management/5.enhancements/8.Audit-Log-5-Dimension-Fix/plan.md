# Plan — Audit Log 5-Dimension Schema Fix

**Date:** 2026-03-23

---

## Approach

All 4 gaps are pure naming/nesting fixes inside one file: `backend/src/services/audit.py`. No database migration, no API contract change, no frontend change required. Existing log entries on disk will keep their old format — only new entries written after this fix will use the corrected schema.

---

## Tasks

### Task 1 — Add `request_id` to `"where"` block in `log_recommendation()`
- File: `backend/src/services/audit.py`, method `log_recommendation()`
- Action: Add `"request_id": resolved_request_id` to the `"where"` dict

### Task 2 — Rename fields in `"what"` block
- File: `backend/src/services/audit.py`, method `log_recommendation()`
- Action: Remove `"prompt"` field. Rename `"masked_context"` to `"masked_ai_prompt"`. Rename `"masked_response"` to `"masked_ai_response"`.

### Task 3 — Flatten `"why"` block (remove `"request_context"` sub-object)
- File: `backend/src/services/audit.py`, method `log_recommendation()`
- Action: Move `patient_id`, `patient_token`, `action_type`, `request_id` to the top level of `"why"` — remove the `"request_context"` wrapper dict.

### Task 4 — Fix `log_decision()` consistency
- File: `backend/src/services/audit.py`, method `log_decision()`
- Action:
  - Change `"who"` to use `user_id` + `user_role` (same as `log_recommendation`)
  - Add a full `"where"` block with `service_id`, `client_ip`, `request_id`
  - Flatten `"why"` to contain `patient_id`, `action_type`, `request_id`, `decision`, `notes`
  - Add `user_role` and `client_ip` and `request_id` as optional parameters with safe defaults

---

## Risk

- **Zero runtime risk**: These are field renaming changes only. The hash chaining algorithm is unchanged.
- **Existing log entries on disk**: Will keep old format. No migration script needed for a POC.
- **Callers of `log_decision()`**: The method signature gains 3 new optional parameters with defaults — fully backward compatible.

---

## Out of Scope

- Retention policy (3-year, cold-tier archival) — infrastructure concern, separate ticket
- RBAC enforcement for audit log read access — depends on SMART on FHIR scope coordination, separate ticket
