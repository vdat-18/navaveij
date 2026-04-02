# Discovery — Scope 3: API Metadata, Cache, and Admin Consistency

**Status:** Open

## Starting Facts

- normalized recommendation metadata still hardcodes `template_version = "v1.0"`.
- recommendation cache keys still include the same hardcoded version.
- `/system-config` can expose an invalid active-client value while the prompt selector falls back elsewhere.

## Questions To Resolve

1. Should `/api/recommend` metadata expose both `active_client` and resolved `model_id` explicitly?
2. Should invalid active-client configuration fail at startup or return a structured API error at request time?
3. Does the frontend need any schema extension beyond what `AuditLogSearchPanel` already supports?

## Exit Condition

The API, cache layer, and admin UI all present one consistent resolved client/template story.

