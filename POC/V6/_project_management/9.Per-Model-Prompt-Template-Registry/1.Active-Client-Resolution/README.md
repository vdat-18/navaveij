# Scope 1 — Active Client Resolution

**Parent Workstream:** 9.Per-Model-Prompt-Template-Registry
**Status:** ✅ Completed and checkpointed
**Goal:** Establish a single fail-closed resolver for active client, model id, prompt registry, and template version.

---

## Why This Scope Exists

The current implementation allows the configured active client, the prompt registry, and the inferred runtime model path to diverge.

This scope fixes the foundation first:
- validate `AI_ACTIVE_CLIENT`
- resolve one authoritative client identity
- remove silent fallback behavior from prompt selection

No later scope should proceed until this one is complete.

This scope is now complete. Downstream scopes can assume:
- active-client names are validated
- invalid values fail closed
- prompt selection is driven from the resolved client identity instead of silent Gemini fallback

---

## Primary Deliverables

- backend active-client resolver
- resolver-driven prompt selection
- fail-closed behavior for invalid active-client values
- tests proving deterministic resolution for all supported clients

## Files Completed

- `backend/src/services/active_client.py`
- `backend/src/services/prompt_selector.py`
- `scripts/tests/test_active_client_resolution.py`
- `scripts/tests/test_prompt_selector_paths.py`
