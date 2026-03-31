# Discovery — Scope 2: Workflow Dispatch and Audit Integrity

**Status:** Closed

## Starting Facts

- `clinical.py` currently records `settings.llm_model` as the model id for all clients.
- `MatchPolicy` and `WriteNarrative` currently share one combined timing measurement.
- `AnnotateReasoningLines` must stay on the same active-client path as the main clinical flow.

## Questions To Resolve

1. Explicit dispatch was implemented through BAML per-call `client` overrides instead of client-specific wrapper regeneration.
2. The resolved `model_id` now comes from `ResolvedActiveClient`, not from `settings.llm_model` for non-Gemini clients.
3. Parallel timing is now measured at each awaited LLM call boundary, producing separate `latency_ms` values for `MatchPolicy` and `WriteNarrative`.

## Exit Condition

Workflow dispatch and LLM audit rows are now trustworthy for client/model/template/function identity and per-call latency.
