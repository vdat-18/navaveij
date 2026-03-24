# Discovery — GAP-F13

**Status:** Complete (pre-implementation analysis)

## Current State

- `SystemConfigTab.tsx` contains sections for system configuration in the admin panel.
- One section is labeled "BAML Client Registry" (or similar) showing registered AI model
  clients — this should be renamed to "AI Gateway".
- An "Auth Configuration" section exists in `SystemConfigTab.tsx` — this should be removed.
- Current registry/gateway entries do not have a `provider_logo_url` or logo field.
- The type in `access-monitoring.ts` for registry entries does not include a logo field.

## What Needs to Change

1. **Label rename:** Find the "BAML Client Registry" string in `SystemConfigTab.tsx` and
   replace with "AI Gateway". Also check if this label appears in any other component
   or type (`access-monitoring.ts`, `MasterDataTab.tsx`).

2. **Provider logo:** Add a small `<img>` or icon next to each model entry. For POC,
   use a static model-ID → logo mapping (e.g., `claude-sonnet` → Anthropic logo,
   `gpt-4o` → OpenAI logo, `llama` → Meta logo) rather than a database-backed URL.
   Only add `provider_logo_url` to the type if the backend actually returns it.

3. **Remove Auth Configuration:** Find the Auth Config section in `SystemConfigTab.tsx`
   and remove it. If it wraps demo-critical functionality, comment it out with a
   `// REMOVED per client feedback — 2026-03-24` note.

## Scope Confirmation

- No backend changes needed.
- No BAML changes needed.
- Purely a UI label and section cleanup in `SystemConfigTab.tsx` and
  optionally `access-monitoring.ts`.

## Risk Flags

- Before removing Auth Configuration, confirm that no other component depends on
  any state or callback from that section. A quick `grep -r "AuthConfig"` or
  `grep -r "auth_config"` in the frontend source will confirm.
- The "BAML Client Registry" string may appear in more than one place — check all
  files in `/components/access-monitoring/` for this term.
