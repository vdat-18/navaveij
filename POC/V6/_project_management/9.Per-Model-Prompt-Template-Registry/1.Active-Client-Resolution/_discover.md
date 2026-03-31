# Discovery — Scope 1: Active Client Resolution

**Status:** Closed

## Starting Facts

- `shared.settings.settings` currently reads `AI_ACTIVE_CLIENT` once at import time.
- `prompt_selector` is a module-level singleton.
- unknown client names currently fall back to Gemini prompt selection.
- the current BAML fallback configuration is not sufficient proof of active-client routing.

## Questions To Resolve

1. The resolver now lives as a small service module exposing a validated `ResolvedActiveClient` value object.
2. Missing `AI_ACTIVE_CLIENT` still falls back to `settings.ai_active_client`, but unsupported values now fail closed.
3. `template_version` is still loaded from the prompt registry file, but the file selection now comes from the resolved active client instead of a silent fallback map.

## Exit Condition

Resolver design is final for Scope 1 and downstream consumers can now depend on it without reading raw settings directly for client selection.
