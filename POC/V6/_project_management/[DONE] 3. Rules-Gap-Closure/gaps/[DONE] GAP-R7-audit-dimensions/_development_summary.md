## Status: Implemented and verified

## Code Changes

1. Updated `backend/src/services/audit.py`:
   - added WHO fields (`user_id`, `user_role`)
   - added WHERE fields (`service_id`, `client_ip`)
   - added WHAT fields (`prompt`, `masked_context`, `masked_response`, `latency_ms`)
   - added WHY request context (`patient_id`, `patient_token`, `action_type`, `request_id`)
2. Updated `backend/src/services/orchestrator.py` to forward audit context dimensions and measured latency.
3. Updated `backend/src/api/routes/contracts.py` route to build audit context from auth + request metadata and pass through to orchestrator.
4. Updated `_normalize_runtime_audit_entries()` to parse new payload dimensions for runtime monitoring views.
