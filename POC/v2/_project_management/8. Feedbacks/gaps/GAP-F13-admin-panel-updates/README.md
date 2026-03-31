# GAP-F13 — Admin Panel Updates

**Title:** Rename BAML Client Registry → AI Gateway, add provider logo, remove Auth Configuration section
**Status:** Implemented with deferred refactor note (2026-03-24)
**Phase:** 1 (quick wins)

---

## Objective

Make two targeted changes to the admin panel:
1. Rename the "BAML Client Registry" section to "AI Gateway" and add a provider logo field
   to each registry entry.
2. Remove the "Auth Configuration" section from the System Config tab.

## Scope

1. In `SystemConfigTab.tsx`: find and update the "BAML Client Registry" label to "AI Gateway".
2. Add `provider_logo_url?: string` to the relevant type in `access-monitoring.ts`.
3. In the AI Gateway list UI, render a small provider logo `<img>` (or icon) next to each
   model entry using the logo URL, or a static model-name → logo map for demo.
4. Find and remove (or hide) the "Auth Configuration" section from `SystemConfigTab.tsx`.
   If the section contains any live demo functionality, comment it out rather than delete,
   and add a `// REMOVED per client feedback` note.

## Primary Files

- `POC/v2/frontend/src/components/access-monitoring/SystemConfigTab.tsx` — label rename +
  section removal
- `POC/v2/frontend/src/types/access-monitoring.ts` — add `provider_logo_url` field

## Design Decisions

- **"AI Gateway" rename:** Aligns with the architectural naming used in `ai-team-onboarding.md`
  (Component: AI Gateway). The term "BAML Client Registry" was an implementation-level name;
  "AI Gateway" is the correct business-level name for the client-facing demo.
- **Provider logo:** For demo purposes, use a static map of model ID → logo URL
  (e.g., GPT-4o → OpenAI logo, Claude → Anthropic logo, Llama → Meta logo) rather than
  requiring each registry entry to store a logo URL. Only add `provider_logo_url` to the
  type if the API actually returns it; otherwise handle entirely in the frontend.
- **Auth Configuration removal:** Client explicitly requested removal. No backend impact
  — this is a UI-only section. If any auth config fields are actively used in the demo
  flow, confirm before deleting.

## Checkpoint Files

- `_discovery.md`
- `_development_summary.md`
- `_latest_test_results.md`

## Feedback Reference

`feedbacks.md` — "Add logo of provider to BAML Client Registry → renamed to AI Gateway"
`feedbacks.md` — "Remove the Auth Configuration."

---

## Open Follow-up Note

AI Gateway baseline updates are implemented for this phase, but a deeper refactor is still pending:

- Improve information hierarchy (active model vs fallback chain readability)
- Rebalance visual density in the registry table
- Revisit provider branding strategy for production-consistent identity treatment

This follow-up is intentionally deferred to a dedicated UI refinement pass.
