# Development Summary — Scope 1: Active Client Resolution

**Status:** ✅ Complete

## Summary

Implemented the Scope 1 foundation for active-client resolution.

The repair introduced a dedicated resolver service and refactored prompt selection to consume it directly. Unsupported `AI_ACTIVE_CLIENT` values now raise a `ValueError` instead of silently loading the Gemini prompt registry.

## Files Changed

- `backend/src/services/active_client.py`
  - Added `ResolvedActiveClient`
  - Added `resolve_active_client()`
  - Centralized supported-client mapping for provider, model id, and prompt registry key
- `backend/src/services/prompt_selector.py`
  - Replaced the local fallback map with resolver-driven construction
  - Added `get_prompt_selector()`
  - Bound selector metadata (`client_name`, `provider`, `model_id`) to the resolved client
- `scripts/tests/test_active_client_resolution.py`
  - Added direct resolver coverage for all supported clients plus invalid input
- `scripts/tests/test_prompt_selector_paths.py`
  - Updated tests to instantiate selectors from resolved clients
  - Added explicit invalid-client rejection coverage

## Scope Notes

- Gemini now resolves through the provider-native Gemini config path (`GOOGLE_API_KEY` + `GEMINI_MODEL`) rather than the legacy shared `LLM_*` keys.
- The current local `.env` still contains stale client/model values; after this scope, those values now fail closed instead of being tolerated silently.
