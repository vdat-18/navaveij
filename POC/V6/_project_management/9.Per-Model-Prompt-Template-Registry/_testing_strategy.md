# Testing Strategy — Per-Model Prompt Template Registry Repair

**Date:** 2026-03-30
**Status:** Proposed
**Purpose:** Define the test evidence required before approving the recommended overhaul for workstream 9

---

## Goal

Prove that the repaired implementation has one correct runtime path from `AI_ACTIVE_CLIENT` to:
- resolved client selection
- prompt template selection
- BAML call dispatch
- recommendation metadata
- cache partitioning
- LLM audit logging
- client validation tooling

This strategy is designed to reduce rollout risk by forcing each stage of the architecture to be testable in isolation before end-to-end verification.

---

## Approval Standard

The overhaul should not be considered approved until all of the following are true:

1. Unit tests prove active-client resolution is deterministic and fail-closed.
2. Integration tests prove the clinical workflow uses the resolved client/template pair consistently.
3. Contract tests prove the API surfaces the same resolved metadata.
4. Audit tests prove `LLMRequest` entries are accurate per call.
5. Cache tests prove responses are partitioned by active client and template version.
6. Validation tests prove each client is checked in an isolated process or isolated app context.
7. One focused end-to-end smoke run proves the repaired production path works with the real orchestration entrypoint.

---

## Test Layers

### Layer 1 — Resolver unit tests

Target:
- new active-client resolver service

Must prove:
- each valid client name resolves to the expected:
  - client name
  - provider
  - model id
  - prompt registry file
  - template version
- invalid client names raise a hard error
- no silent fallback occurs for stale env values such as `claude-haiku-4.5`

Key cases:
- `GeminiClient`
- `OpenAIClient`
- `AnthropicClient`
- `OpenRouterClient`
- `LocalHostedClient`
- invalid name
- missing env value if defaults are allowed

Failure policy:
- fail closed, not Gemini-by-default

### Layer 2 — Prompt registry unit tests

Target:
- prompt registry loader / selector

Must prove:
- prompt lookup is driven by the resolved client object, not a module-global fallback
- all required prompt keys exist for every supported client
- returned `template_version` matches the selected registry file
- malformed or incomplete YAML fails explicitly

Key cases:
- all 5 registries contain:
  - `analyze_clinical_risks`
  - `match_policy`
  - `write_narrative`
  - `annotate_reasoning_lines`
- bad YAML
- missing key
- invalid version field

### Layer 3 — Clinical dispatch integration tests

Target:
- workflow dispatch boundary in `clinical.py`

Must prove:
- each clinical call uses the resolved active client
- prompt template content comes from the same resolved active client
- annotation uses the same resolved client identity as the main workflow path
- each LLM call record contains the correct:
  - function name
  - client name
  - model id
  - template version
  - prompt template key

Implementation approach:
- stub or monkeypatch BAML client entry points
- assert that the dispatcher selected the expected call path
- capture the `system_prompt` passed into each function

Key cases:
- one test per client for `AnalyzeClinicalRisks`
- one parallel-agent test verifying `MatchPolicy` and `WriteNarrative` each record their own timing and metadata
- annotation success path
- annotation fallback path

### Layer 4 — API contract tests

Target:
- `/api/recommend`
- `/api/system-config`

Must prove:
- `/api/recommend` metadata returns the resolved:
  - active client
  - model id
  - template version
- `/system-config` reports the same validated active client that the resolver uses
- invalid active-client configuration returns an explicit failure instead of a misleading UI state

Key cases:
- valid client request
- invalid active-client config
- rule-based fallback path still preserves correct metadata behavior

### Layer 5 — Cache behavior tests

Target:
- recommendation cache key logic

Must prove:
- cache keys differ when:
  - active client differs
  - template version differs
  - resolved model id differs
- cache hits do not leak metadata from one client/template combination into another

Key cases:
- same patient + same ruleset + different active client
- same client + changed template version
- same payload repeated under same client/template should hit the same key

### Layer 6 — Audit accuracy tests

Target:
- `AuditLogger`
- workflow-to-orchestrator audit wiring
- audit normalization path

Must prove:
- each clinical LLM call generates one `LLMRequest` row
- each row contains the correct:
  - `function_name`
  - `action_type`
  - `client/model identity`
  - `template_version`
  - `prompt_template_key`
  - `latency_ms`
- `MatchPolicy` and `WriteNarrative` do not reuse one shared timing value
- normalized audit entries preserve LLM-specific fields for frontend consumption

Key cases:
- standard AI path
- partial failure path
- annotation fallback path

### Layer 7 — Validation script tests

Target:
- replacement for `scripts/validate_clients.py`

Must prove:
- each client validation runs in isolation
- the validation path uses the same resolver and dispatch path as production
- one client failure does not mask results for other clients
- output clearly identifies:
  - client
  - resolved model id
  - template version
  - pass/fail reason

Preferred implementation:
- subprocess-per-client execution

Why:
- avoids module caching and singleton contamination
- more closely simulates real startup semantics

### Layer 8 — End-to-end smoke gate

Target:
- orchestrator entrypoint

Must prove:
- one real recommendation run emits:
  - correct recommendation metadata
  - correct `LLMRequest` audit entries
  - correct normalized monitoring output

Scope:
- one happy-path smoke per supported active client is ideal
- if external credentials make that impractical, require at minimum:
  - one real client smoke
  - mocked integration coverage for the other clients

---

## Proposed Test Matrix

| Area | Gemini | OpenAI | Anthropic | OpenRouter | LocalHosted |
|---|---|---|---|---|---|
| Resolver unit | ✅ | ✅ | ✅ | ✅ | ✅ |
| Prompt registry unit | ✅ | ✅ | ✅ | ✅ | ✅ |
| Clinical dispatch integration | ✅ | ✅ | ✅ | ✅ | ✅ |
| API metadata contract | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cache partitioning | ✅ | ✅ | ✅ | ✅ | ✅ |
| Audit accuracy | ✅ | ✅ | ✅ | ✅ | ✅ |
| Validation isolation | ✅ | ✅ | ✅ | ✅ | ✅ |
| Real end-to-end smoke | preferred | preferred | preferred | preferred | preferred |

---

## Phase Gates

### Gate 1 — Architecture safe to merge behind feature work

Required:
- resolver tests passing
- prompt registry tests passing
- clinical dispatch integration tests passing

Meaning:
- the new control path is structurally sound

### Gate 2 — Backend contract integrity proven

Required:
- API metadata tests passing
- cache tests passing
- audit tests passing

Meaning:
- backend semantics are trustworthy

### Gate 3 — Operational verification proven

Required:
- validation script tests passing
- at least one orchestrator smoke run passing

Meaning:
- rollout and demo verification story is credible

### Gate 4 — Workstream re-approval

Required:
- all prior gates passing
- docs updated to reflect actual test evidence

Meaning:
- workstream can be marked complete

---

## Required Non-Happy-Path Tests

These are mandatory because the current implementation failed mainly on ambiguity and silent fallback:

- invalid `AI_ACTIVE_CLIENT`
- missing prompt registry file
- prompt registry missing one required key
- stale template version metadata
- audit write path with zero LLM calls
- annotation call cancelled or failed
- one client credential failure during validation
- cache hit from prior client/template combination

---

## Evidence Package Required For Sign-Off

Before final approval, collect:

1. Test command list with exact commands run
2. Pass/fail summary by layer
3. One sample `/api/recommend` payload showing correct metadata
4. One sample `LLMRequest` audit row
5. One sample validation-script run covering all clients
6. Note of any remaining external dependency limitations

---

## Recommendation

Proceed with the overhaul only if the implementation plan includes this testing strategy as a first-class deliverable, not a cleanup task at the end.

The implementation should be sequenced so that:
- test scaffolding is introduced early
- each architectural change has a corresponding proof point
- no status document claims completion until the evidence package exists

