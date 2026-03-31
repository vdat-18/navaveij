# Implementation — Audit Log 5-Dimension Schema Fix

**Date:** 2026-03-23
**Status:** DONE

---

## Files Changed

| File | Change |
|------|--------|
| `backend/src/services/audit.py` | Fixed `log_recommendation()` and `log_decision()` — 4 gaps resolved |

---

## Detailed Changes

### `log_recommendation()` — lines 47–111

1. **`"where"` block** — added `"request_id": resolved_request_id`
2. **`"what"` block** — removed `"prompt"` field; renamed `"masked_context"` to `"masked_ai_prompt"`; renamed `"masked_response"` to `"masked_ai_response"`
3. **`"why"` block** — removed `"request_context"` sub-object; `patient_id`, `patient_token`, `action_type`, `request_id` are now flat at the top level of `"why"`

### `log_decision()` — lines 113–167

1. **Method signature** — added 3 new optional parameters: `user_role: str = "physician"`, `client_ip: str = "unknown"`, `request_id: str = ""`
2. **`"who"` block** — changed from `{ patient_id, physician_id }` to `{ user_id: physician_id, user_role }` — now consistent with `log_recommendation()`
3. **`"where"` block** — added new block: `{ service_id, client_ip, request_id }` — was missing entirely before
4. **`"why"` block** — restructured to flat: `{ patient_id, action_type, request_id, decision, notes }`
5. **`"metadata"` block** — added `request_id` field

---

## Verification

No automated test was run for this fix (test suite covers integration scenarios, not log schema shape). Manual verification: inspect `logs/audit.jsonl` after running a recommendation request — confirm `"where"` contains `request_id`, `"what"` uses `masked_ai_prompt` / `masked_ai_response`, and `"why"` has flat fields.

---

## Out of Scope (separate tickets)

- Retention policy (3-year, cold-tier archival)
- RBAC enforcement for audit log read access via SMART on FHIR scopes
