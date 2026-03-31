# Solution — Audit Log 5-Dimension Schema Fix

**Date:** 2026-03-23

---

## What Was Done

All 4 gaps were fixed with targeted edits to `backend/src/services/audit.py`. No other files were changed. The hash chaining algorithm, the log file path, and all caller sites remained unchanged.

---

## Fix 1 — `request_id` added to `"where"` block

`"where"` now contains all 3 required fields from the spec: `service_id`, `client_ip`, `request_id`.

**Before:** `{ service_id, client_ip }`
**After:** `{ service_id, client_ip, request_id }`

---

## Fix 2 — `"what"` field names match the spec

The redundant `"prompt"` string field was removed. `"masked_context"` was renamed to `"masked_ai_prompt"`. `"masked_response"` was renamed to `"masked_ai_response"`.

**Before:** `{ "prompt": "...", "masked_context": {...}, "masked_response": {...}, latency_ms, model_id, safety_conflict_events }`
**After:** `{ "masked_ai_prompt": {...}, "masked_ai_response": {...}, latency_ms, model_id, safety_conflict_events }`

---

## Fix 3 — `"why"` block is now flat

The `"request_context"` sub-object wrapper was removed. All 4 fields are now directly inside `"why"`.

**Before:** `{ "request_context": { patient_id, patient_token, action_type, request_id } }`
**After:** `{ patient_id, patient_token, action_type, request_id }`

---

## Fix 4 — `log_decision()` is now consistent with `log_recommendation()`

Three new optional parameters were added with safe defaults: `user_role="physician"`, `client_ip="unknown"`, `request_id=""`.

The `"who"` block was changed to use `user_id` + `user_role`. A full `"where"` block was added. The `"why"` block was restructured to be flat and include `patient_id`, `action_type`, `request_id`, `decision`, `notes`.

**Before "who":** `{ patient_id, physician_id }`
**After "who":** `{ user_id, user_role }` — same shape as `log_recommendation`

**Before:** No `"where"` block
**After:** `{ service_id, client_ip, request_id }` — full traceability

---

## Resulting Log Entry Structure (both entry types)

```
{
  "timestamp": "2026-03-23T07:00:00.000Z",   ← Dimension 2: WHEN
  "who": { "user_id": "...", "user_role": "..." },   ← Dimension 1: WHO
  "where": { "service_id": "...", "client_ip": "...", "request_id": "..." },   ← Dimension 3: WHERE
  "what": { "masked_ai_prompt": {...}, "masked_ai_response": {...}, ... },   ← Dimension 4: WHAT
  "why": { "patient_id": "...", "action_type": "...", "request_id": "..." },   ← Dimension 5: WHY
  "previous_hash": "...",
  "current_hash": "..."
}
```
