# Scope 3 — API Metadata, Cache, and Admin Consistency

**Parent Workstream:** 9.Per-Model-Prompt-Template-Registry
**Status:** ✅ Completed and checkpointed
**Goal:** Make API payloads, cache keys, and access-monitoring views reflect the same resolved active-client state.

---

## Why This Scope Exists

The backend and UI currently risk telling different stories about which client and template were active.

This scope aligns:
- recommendation metadata
- cache partitioning
- system-config output
- access-monitoring display of LLM audit fields

This scope is now complete. Downstream scopes can assume:
- recommendation metadata derives from the resolved active client path instead of hardcoded `v1.0`
- cache keys partition by active client, model id, and template version
- `/api/system-config` reports the validated active client state and no longer advertises the legacy fallback chain
- normalized monitoring entries and the access-monitoring UI preserve resolved LLM runtime identity

---

## Primary Deliverables

- real `template_version` in API responses
- cache keys partitioned by active client/model/template
- validated system-config output
- frontend contract alignment

## Files Completed

- `backend/src/api/routes/contracts.py`
- `scripts/tests/test_api_contract_routes.py`
- `scripts/tests/test_access_monitoring_contract.py`
- `scripts/tests/test_backend_cache_ttl.py`
- `frontend/src/types/access-monitoring.ts`
- `frontend/src/components/access-monitoring/AuditLogSearchPanel.tsx`
- `frontend/src/components/access-monitoring/AuditLogSearchPanel.test.tsx`
- `frontend/src/components/access-monitoring/AIConfigsTab.tsx`
