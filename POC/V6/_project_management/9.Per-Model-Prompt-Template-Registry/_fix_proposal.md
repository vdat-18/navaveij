# Fix Proposal — Per-Model Prompt Template Registry

**Date:** 2026-03-30
**Status:** Proposed, not yet implemented
**Goal:** Repair workstream 9 so model selection, prompt selection, metadata, cache behavior, and audit logging all derive from one explicit and verifiable runtime path

---

## Recommendation

Use a controlled overhaul rather than another narrow patch.

The current design spreads “active client” behavior across:
- BAML fallback configuration
- Python settings
- a prompt-selector singleton
- API normalization
- audit logging
- a smoke-test script

That fragmentation is the root problem. The repair should replace implicit behavior with one explicit runtime resolution path and make every downstream consumer depend on it.

---

## Options Considered

### Option A — Minimal patch on the current design

Approach:
- keep the current BAML fallback clients
- patch `template_version` propagation
- patch audit metadata
- patch the validation script

Pros:
- smallest code diff
- least disruption to surrounding files

Cons:
- still relies on ambiguous BAML fallback semantics for active-client routing
- still leaves model selection and prompt selection partially decoupled
- hard to prove correctness

Assessment:
- Not recommended. It reduces symptoms but does not repair the architecture.

### Option B — Explicit runtime dispatch in Python, with client-specific BAML entry points

Approach:
- resolve the active client in Python
- dispatch to the matching client-bound BAML call explicitly
- load the matching prompt template from the same resolved client object
- derive API metadata, cache keys, and audit fields from that same object

Pros:
- one source of truth
- easy to test
- easy to audit
- fail-closed behavior is straightforward

Cons:
- larger change set
- requires touching BAML function definitions or adding client-specific wrappers

Assessment:
- Recommended. This is the cleanest way to restore structural integrity.

### Option C — Startup-generated registry from config plus dynamic indirection

Approach:
- generate or assemble runtime client mappings at startup from settings
- keep most call sites unchanged

Pros:
- centralized configuration

Cons:
- more moving parts than Option B
- less obvious control flow
- harder to verify than direct dispatch

Assessment:
- Acceptable, but weaker than explicit dispatch.

---

## Recommended Target Architecture

### 1. Introduce one explicit active-client resolver

Create a backend service whose job is:
- validate `AI_ACTIVE_CLIENT`
- map that value to provider, resolved model id, prompt registry file, and audit/cache metadata
- fail closed on unknown values

This object becomes the only supported source of truth for:
- active client shown in system-config
- prompt template selection
- model id recorded in audit logs
- metadata returned in `/api/recommend`
- cache key partitioning

### 2. Remove implicit BAML routing for clinical calls

Do not rely on the current `ActiveModel` fallback chain to mean “use the active client.”

Recommended implementation shape:
- either define client-specific clinical BAML functions or client-specific wrappers
- dispatch in Python based on the resolved active client

Examples of the dispatch boundary:
- `AnalyzeClinicalRisks` for Gemini
- `AnalyzeClinicalRisks` for OpenAI
- `AnalyzeClinicalRisks` for Anthropic
- `AnalyzeClinicalRisks` for OpenRouter
- `AnalyzeClinicalRisks` for LocalHosted

The same rule applies to:
- `MatchPolicy`
- `WriteNarrative`
- `AnnotateReasoningLines`

This looks heavier, but it is much easier to reason about and test than a hidden fallback strategy that pretends to be dynamic.

### 3. Make prompt selection request-safe and resolver-driven

Replace the current singleton assumption with resolver-driven lookup:
- no silent fallback to Gemini on invalid config
- no hidden dependency on import order
- prompt version and prompt content must come from the same resolved client object

### 4. Make metadata and caching derive from resolved client state

The recommendation payload should expose:
- active client name
- resolved model id
- resolved template version

The cache key should include:
- active client
- resolved model id
- resolved template version

This prevents collisions between responses generated under different model-template combinations.

### 5. Make LLM audit rows truthful

Each LLM request row should record:
- function name
- active client
- resolved model id
- template version
- prompt template key
- actual per-call latency

Parallel Agent 2 calls must be timed independently. Shared gather duration is not sufficient.

### 6. Rebuild the validation path around isolated execution

The smoke test should not mutate env vars inside one already-initialized process.

Recommended validation strategies:
- run one isolated subprocess per client, or
- expose a testable resolver + dispatch API and validate each client through that API in a fresh app context

The validation script should verify:
- resolver accepts the client
- prompt template version matches the client
- request path reaches the expected client binding
- failures are reported clearly per client

---

## Concrete Change Areas

### Backend

Needs redesign:
- `backend/src/services/prompt_selector.py`
- `backend/src/services/workflows/clinical.py`
- `backend/src/services/orchestrator.py`
- `backend/src/api/routes/contracts.py`
- any new service used to resolve active-client state

Likely BAML changes:
- `baml_src/clients.baml`
- `baml_src/clinical/recommendation_output.baml`
- regenerated `baml_client/`

### Frontend

Likely smaller follow-on updates:
- system-config should surface the validated active client only
- the UI should not quietly display a stale or invalid active-client value
- audit UI can remain mostly as-is once backend fields are corrected

### Scripts and verification

Must be rewritten or replaced:
- `scripts/validate_clients.py`
- tests that currently only prove import-time prompt loading

---

## Required Tests Before Implementation Can Be Considered Complete

### Resolver tests

Add tests that verify:
- valid `AI_ACTIVE_CLIENT` values resolve to the expected provider/model/template tuple
- invalid values raise a hard error

### API metadata tests

Add tests that verify:
- `/api/recommend` returns the real `template_version`
- cache keys differ when active client or template version differs

### Audit tests

Add tests that verify:
- `LLMRequest` rows include accurate `function_name`
- `model_id` matches the resolved client
- parallel Agent 2 calls have independent latency values

### Validation tests

Add tests that verify:
- the validation script isolates each client run
- prompt selector and resolver use the same client value
- invalid configuration fails closed

---

## Suggested Execution Order

1. Introduce the active-client resolver and fail-closed validation.
2. Refactor prompt selection to consume that resolver.
3. Replace implicit clinical-call routing with explicit client dispatch.
4. Propagate resolved client metadata into API responses and cache keys.
5. Correct LLM audit logging and per-call timing.
6. Replace the validation script with isolated client verification.
7. Add regression tests for the repaired path.
8. Update workstream docs only after the repaired behavior is proven by tests.

---

## Definition of Done

This workstream is complete only when:
- model routing is explicit and testable
- prompt selection uses the same resolved client state
- invalid config fails closed
- metadata and cache keys use real template version values
- audit logs contain truthful per-call records
- validation proves the production path instead of simulating it loosely

