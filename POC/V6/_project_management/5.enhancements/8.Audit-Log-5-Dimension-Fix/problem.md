# Problem — Audit Log 5-Dimension Schema Fix

**Date:** 2026-03-23

---

## Problem Statement

The `AuditLogger` in `backend/src/services/audit.py` did not fully match the 5-dimension schema required by Section 6.3 of the TOR. Four specific gaps were found:

---

### Gap 1 — `request_id` missing from the `"where"` block

**Dimension:** WHERE (source traceability)

The spec says `"where"` must contain `service_id`, `client_ip`, AND `request_id`. The existing code only stored `service_id` and `client_ip`. The `request_id` was written to the `"why"` block and `"metadata"` — but NOT to `"where"`.

**Impact:** Compliance tools that check the `"where"` block for a full source trail would find the request ID missing — even though it existed elsewhere in the entry.

---

### Gap 2 — Wrong field names in the `"what"` block

**Dimension:** WHAT (transaction record)

The spec requires fields named `masked_ai_prompt` and `masked_ai_response`. The actual code stored these as `"prompt"`, `"masked_context"`, and `"masked_response"` — three fields instead of two, and none matching the official name.

**Impact:** PDPA auditors and automated log scanners looking for `"masked_ai_prompt"` would find nothing — even though the data was there under a different name.

---

### Gap 3 — `"why"` fields buried inside a sub-object called `"request_context"`

**Dimension:** WHY (clinical purpose)

The spec says `"why"` should be flat: `{ patient_id, action_type, request_id }`. The actual code wrapped these inside `"why" > "request_context" > { ... }`.

**Impact:** Code that reads `entry["why"]["patient_id"]` would throw a KeyError. You had to write `entry["why"]["request_context"]["patient_id"]` — one extra level deep.

---

### Gap 4 — `log_decision()` used inconsistent field names in `"who"` and had no `"where"` block

**Dimension:** WHO + WHERE

`log_recommendation()` used `{ "user_id": ..., "user_role": ... }` in the `"who"` block. But `log_decision()` used `{ "patient_id": ..., "physician_id": ... }` — completely different keys. Additionally, `log_decision()` had no `"where"` block at all, so physician decision entries had no source traceability.

**Impact:** The two entry types could not be queried consistently. Code that looked for `entry["who"]["user_id"]` would succeed on inference entries but fail on decision entries.
