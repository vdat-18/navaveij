# Implementation Plan: Sentiment Scopes

## Phase 1 — Backend-Owned Evidence Sentiment (DONE)

1. Add a backend service that:
   - Normalizes `reasoning_trace` into lines
   - Filters policy reasoning lines
   - Assigns a `good|bad|neutral` sentiment label to each line
2. Extend recommendation response contract to include `reasoning_trace_annotated`.
3. Update the frontend to prefer backend annotations when present.

## Phase 2 — Extract Text Highlight Rules (DONE)

1. Extract inline text formatting rules from `RecommendationPanel` into a shared formatter module.
2. Centralize:
   - measurement highlighting regex
   - token normalization and dictionary substitution
   - severity suffix parsing for highlight items
   - sentence splitting helper
3. Update `RecommendationPanel` to use the shared module.

## Phase 3 — Fix Formatting Artifacts (DONE)

1. Improve measurement matching:
   - Support `135 / 87 mmHg` (spaces around slash)
   - Support `mm Hg` in addition to `mmHg`
2. Reduce whitespace artifacts:
   - Replace `text-justify` with `text-left` in chip-heavy blocks

## Phase 4 — Future Enhancements (PLANNED)

1. Make backend sentiment classifier configurable:
   - Move keyword lists into a config file or rule store
   - Add per-scope rule sets (e.g., Evidence vs Consultation text)
2. Consider a parallelizable endpoint for richer annotation:
   - Return token-level highlight metadata from backend (not only sentiment)
   - Optionally compute richer semantic categories (risk domain, signal group, actionability)
3. If a model is required later:
   - Add a dedicated backend annotation worker/endpoint and keep UI deterministic.
