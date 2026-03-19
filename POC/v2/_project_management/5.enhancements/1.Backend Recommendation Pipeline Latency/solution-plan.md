# Solution Plan — Backend Recommendation Pipeline Latency

**Date:** 2026-03-19
**Input context:** `context.md`
**Goal:** Reduce end-to-end recommendation latency and add processing stage visibility, without breaking the existing regression suite or the Stage-2 contract.

---

## 1. Planning Principles

1. **Measure before fixing**
   - ENH-1 (instrumentation) is the first deliverable. Per-phase timing data validates the bottleneck estimates before code changes are made to the pipeline.

2. **Regression-safe delivery**
   - The existing regression suite is the acceptance gate. No tests may regress at any step.

3. **Additive, not destructive**
   - Each enhancement is a targeted replacement or addition. No contract routes, RBAC, or 3-screen frontend structure is changed.

4. **Reuse existing code**
   - `RuleEvaluator` (`backend/src/services/rules.py`) is already implemented and used in the graceful fallback path. ENH-2 wires it into safety validation rather than building a new validator.

5. **Impact-first sequencing**
   - ENH-1 (measure) → ENH-2 (largest single saving) → ENH-3 → ENH-4 → ENH-5 → ENH-6.

---

## 2. Bottleneck Detail

### Bottleneck 1 — Four Sequential LLM Calls (Critical, 8–32s)

`backend/src/services/workflows/clinical.py:125-138` + `backend/src/services/safety.py:11-36`

The pipeline makes four LLM API calls in strict sequence:

| Call | BAML Function | Data Dependency | Avoidable? |
|------|--------------|-----------------|------------|
| 1 | `AnalyzeClinicalRisks` | None | No — distinct medical analysis step |
| 2 | `MatchProgramRules` | Call 1 `ClinicalRiskProfile` | **Mergeable with Call 3** |
| 3 | `ComposeRecommendation` | Call 1 + Call 2 output | **Mergeable with Call 2** |
| 4 | `ValidateRecommendation` | Call 3 output | **Yes — replace with RuleEvaluator** |

**Why true parallelism is not possible:** Agent 3 depends on both Agent 1 and Agent 2. The chain is inherently serial. However, it can be collapsed.

**Two independent savings available:**
- **ENH-2:** Call 4 is a safety rule check wrapped in an LLM call. `RuleEvaluator` in `backend/src/services/rules.py` already implements equivalent deterministic logic. Replacing it eliminates one LLM round-trip (2–8s) and removes the unbounded timeout risk.
- **ENH-7:** Calls 2 and 3 share the same inputs (`risk_profile` + `program_ruleset`). Merging them into `MatchAndCompose` eliminates another LLM round-trip. Agent 1 is kept separate — focused medical analysis benefits from specialised prompting.
- **ENH-8 (complementary):** `ClinicalRiskProfile` (Agent 1 output) is deterministic given the same clinical signals. Caching it by `sha256(signals + trends)` skips Agent 1 entirely on warm requests.

### Bottleneck 2 — stdio MCP Subprocess Per Request (Critical, 200–800ms)

`backend/src/services/mcp_client.py:18-35`

`MCPClientFactory.get_client()` spawns a new OS process via stdio for every request, including protocol handshake and teardown. Converting to a long-lived singleton eliminates this startup cost on every request after the first.

### Bottleneck 3 — O(N) File Glob on Cold MCP Tool Call (High, 100–500ms)

`backend/src/mcp_server/utils.py:99-147`

`load_signal_store_record()` globs `**/record_*.json` and reads each file until it finds the matching patient. The TTL cache (120s) absorbs subsequent calls within the same request, but cold start always pays the full scan. Pre-indexing at server startup builds a `{patient_id → file_path}` map so the first call also becomes O(1).

### Bottleneck 4 — Audit Logger Dual Synchronous Write (High, grows with log)

`backend/src/services/audit.py:30-88`

Per recommendation, the logger reads the entire JSONL file (to get the last hash), appends to JSONL, then reads the entire JSON array → appends → rewrites the full file. The JSON array rewrite is O(N) in log history. Removing it (JSONL-only) and replacing the full-file hash read with a seek-to-end approach makes the logger O(1) per entry regardless of history size.

### Bottleneck 5 — No Per-Phase Timing (Medium, blocks diagnosis)

`backend/src/api/routes/contracts.py:517-523`

Only end-to-end `latency_ms` is captured. No per-phase breakdown exists, making it impossible to validate the bottleneck estimates or measure the impact of fixes. Addressed by ENH-1.

### Bottleneck 6 — Safety Validator No Timeout (Medium, unbounded tail)

`backend/src/services/safety.py:11-36`

The `ValidateRecommendation` LLM call has no HTTP timeout and no fallback if the LLM is slow or unavailable. Addressed structurally by ENH-2 (replace with rule-based); ENH-6 adds defensive timeouts to the remaining three LLM calls.

---

## 3. Enhancement Items

| ID | Feature | Bottleneck(s) | Est. Saving | Priority |
|----|---------|--------------|-------------|----------|
| ENH-1 | Per-phase timing instrumentation + SSE stage stream | B5 | Observability | P0 |
| ENH-2 | Replace safety LLM call with RuleEvaluator | B1, B6 | ~2–8s + unbounded tail | P0 |
| ENH-3 | MCP client singleton | B2 | 200–800ms | P1 |
| ENH-4 | Audit logger: JSONL-only, seek-to-end hash | B4 | Grows with log | P1 |
| ENH-5 | Signal store startup cache warm + registry index | B3 | 100–500ms cold | P2 |
| ENH-6 | LLM call timeouts + timeout fallback | B6 | Unbounded tail removed | P2 |
| ENH-7 | Merge Agents 2+3 → `MatchAndCompose` | B1 | ~2–8s (1 fewer LLM call) | P1 |
| ENH-8 | Cache Agent 1 output (`ClinicalRiskProfile`) | B1 | ~2–8s on warm hit | P2 |

---

## 4. Execution Sequence

### Step 0 — Pre-Enhancement Baseline

- Run `uv run pytest scripts/tests -v` and confirm suite passes.
- Capture baseline output in `implementation/_lastest_test_results.md`.
- Make one end-to-end recommendation call; note total `latency_ms` from response metadata.
- Confirm API starts cleanly on port 8010.

---

### Step 1 — ENH-1: Per-Phase Timing + SSE Stage Stream

**Files:**
- `backend/src/services/orchestrator.py`
- `backend/src/api/routes/clinical.py`

**Timing instrumentation:**

Add a `PhaseTimer` utility (or inline `time.monotonic()` calls) at each phase boundary in `OrchestrationManager.generate_recommendation()`:

```python
timings = {}
t0 = time.monotonic()
# ... MCP phase ...
timings["mcp_fetch_ms"] = int((time.monotonic() - t0) * 1000)

t1 = time.monotonic()
# ... AI chain (3 LLM calls) ...
timings["ai_chain_ms"] = int((time.monotonic() - t1) * 1000)

t2 = time.monotonic()
# ... safety validation ...
timings["safety_ms"] = int((time.monotonic() - t2) * 1000)

t3 = time.monotonic()
# ... audit log ...
timings["audit_ms"] = int((time.monotonic() - t3) * 1000)

t4 = time.monotonic()
# ... rehydration ...
timings["rehydration_ms"] = int((time.monotonic() - t4) * 1000)
```

Include `timings` in `metadata` of the final result dict. The existing `latency_ms` field becomes the sum.

**SSE stage stream endpoint:**

Add `POST /api/v1/clinical/recommend/stream` using FastAPI `StreamingResponse`. The endpoint shares the same auth and orchestration logic as `/recommend`, but emits SSE events at each phase boundary before returning the final result.

SSE event format:
```
data: {"stage": 3, "total_stages": 7, "label": "Analysing clinical risks", "elapsed_ms": 6210}
```

Stage labels (6 stages, reflecting the merged agent chain after ENH-7):

| # | Label | Phase |
|---|-------|-------|
| 1 | Authenticating request | Auth |
| 2 | Fetching patient data | MCP Phase 1 |
| 3 | Analysing clinical risks | `AnalyzeClinicalRisks` |
| 4 | Matching profile and composing recommendation | `MatchAndCompose` (merged) |
| 5 | Validating recommendation | Safety validation |
| 6 | Finalising | Audit + rehydration |

_If ENH-7 is not yet implemented, use 7 stages with separate entries for `MatchProgramRules` (stage 4) and `ComposeRecommendation` (stage 5)._

The stage callbacks are wired into the orchestrator via a `progress_callback: Callable[[int, str], None] | None = None` parameter. When `None`, no SSE events are emitted (non-streaming endpoint unchanged).

Gate:
- `latency_ms` in response metadata is replaced by a `phase_timings` object with per-phase breakdown.
- `GET /api/v1/clinical/recommend/stream` emits valid SSE events and a final JSON payload.
- Regression suite: all tests pass.

---

### Step 2 — ENH-2: Replace Safety LLM Call with RuleEvaluator

**Files:**
- `backend/src/services/safety.py`
- `backend/src/services/rules.py` (read-only — existing implementation to reuse)

**Current flow:**

```python
result = await b.ValidateRecommendation(context=context_str, recommendation=recommendation_str)
```

**Replacement flow:**

```python
rule_evaluator = RuleEvaluator()
validated_output, violations = rule_evaluator.validate_safety(
    ai_output=ai_output,
    hard_constraints=raw_context.get("get_hard_constraints", {})
)
# violations: list of removed items + reason
# validated_output: ai_output with ineligible add-ons silently removed
```

`RuleEvaluator.validate_safety()` enforces:
- Gender eligibility (item-level `gender_restrictions` from hard constraints)
- Age eligibility (item-level `age_restrictions`)
- Tier ceiling (patient's `eligible_tiers` from hard constraints)
- Admin-configured safety flags (`safety_flags[]`)

Each removed item is logged to the audit logger as a conflict event (same behaviour as before, now synchronous and deterministic).

If `rules.py` does not already contain a `validate_safety()` method, add it using the existing `evaluate()` method as the pattern. The logic is already present in the graceful fallback path.

Gate:
- Safety validation completes in <5ms (deterministic, no I/O).
- Ineligible add-ons are still removed from the output.
- Conflict events are still written to the audit log.
- Regression suite: all tests pass.

---

### Step 3 — ENH-3: MCP Client Singleton

**File:** `backend/src/services/mcp_client.py`

**Current pattern:** `async with MCPClientFactory.get_client() as session:` — new process per call.

**Target pattern:** A module-level singleton MCP session that is initialised once at application startup and reused across requests.

```python
_mcp_session: ClientSession | None = None

async def get_or_create_mcp_session() -> ClientSession:
    global _mcp_session
    if _mcp_session is None or not _mcp_session.is_alive():
        _mcp_session = await MCPClientFactory._create_session()
    return _mcp_session

async def close_mcp_session():
    global _mcp_session
    if _mcp_session:
        await _mcp_session.close()
        _mcp_session = None
```

Register `close_mcp_session` on FastAPI `shutdown` lifespan event. Register `get_or_create_mcp_session` on FastAPI `startup` lifespan event to warm the connection before the first request.

Update `OrchestrationManager.generate_recommendation()` to call `get_or_create_mcp_session()` instead of entering a new context manager.

Handle reconnect: if a tool call raises `ConnectionError` or `BrokenPipeError`, reset `_mcp_session = None` and retry once.

Gate:
- Second and subsequent requests do not spawn a new subprocess.
- Application starts cleanly; startup log confirms MCP session initialised.
- Regression suite: all tests pass.

---

### Step 4 — ENH-4: Audit Logger JSONL-Only + Seek-to-End Hash

**File:** `backend/src/services/audit.py`

**Changes:**

1. Remove `_write_json_array()` method and its call site. Stop writing `audit.json`.
2. Replace full-file JSONL read for hash init with seek-to-end:

```python
def _get_last_hash(self) -> str:
    if not self.log_file_jsonl.exists() or self.log_file_jsonl.stat().st_size == 0:
        return "0" * 64
    with open(self.log_file_jsonl, "rb") as f:
        # Seek backwards from end to find last newline
        f.seek(0, 2)
        end = f.tell()
        if end == 0:
            return "0" * 64
        pos = max(0, end - 4096)  # Read last 4KB at most
        f.seek(pos)
        lines = f.read().split(b"\n")
        for line in reversed(lines):
            if line.strip():
                return json.loads(line).get("current_hash", "0" * 64)
    return "0" * 64
```

3. Keep SHA-256 hash chain — only the file read strategy changes.

4. Update any code that reads from `audit.json` (if any) to use the JSONL file instead.

Gate:
- Audit log grows as JSONL only; no `audit.json` written.
- `_get_last_hash()` reads at most 4KB regardless of log history size.
- SHA-256 chain integrity is maintained across entries.
- Regression suite: all tests pass.

---

### Step 5 — ENH-5: Signal Store Startup Cache Warm + Registry Index

**File:** `backend/src/mcp_server/utils.py`

**Changes:**

1. Add a module-level index built at import time (or on first use):

```python
_signal_store_index: dict[str, Path] | None = None

def _build_signal_store_index() -> dict[str, Path]:
    index = {}
    for file_path in SIGNAL_STORE_DIR.glob("**/record_*.json"):
        with open(file_path, encoding="utf-8") as f:
            record = json.load(f)
        patient_id = record.get("patient_id") or record.get("hard_constraints", {}).get("patient_id")
        patient_token = record.get("patient_token")
        if patient_id:
            index[patient_id] = file_path
        if patient_token:
            index[patient_token] = file_path
    return index

def get_signal_store_index() -> dict[str, Path]:
    global _signal_store_index
    if _signal_store_index is None:
        _signal_store_index = _build_signal_store_index()
    return _signal_store_index
```

2. Update `load_signal_store_record()` to use the index for O(1) lookup instead of glob-and-scan.

3. Replace the linear patient registry scan with a dict keyed by `patient_id`:

```python
_registry_index: dict[str, dict] | None = None

def get_registry_index() -> dict[str, dict]:
    global _registry_index
    if _registry_index is None:
        registry = _load_raw_registry()
        _registry_index = {item["patient_id"]: item for item in registry}
    return _registry_index
```

4. Warm both indexes at FastAPI startup (same lifespan hook as ENH-3).

Gate:
- Cold MCP tool call completes without glob scan (log confirms index hit).
- Index is populated at startup; first request does not pay glob cost.
- Regression suite: all tests pass.

---

### Step 6 — ENH-6: LLM Call Timeouts + Timeout Fallback

**Files:**
- `baml_src/clients.baml`
- `backend/src/services/workflows/clinical.py`

**Changes:**

1. Add `timeout_ms` to the BAML client options:

```baml
client<llm> NavaveijClient {
  provider openai-generic
  options {
    base_url env.LLM_BASE_URL
    api_key env.LLM_API_KEY
    model env.LLM_MODEL
    timeout_ms 15000
  }
}
```

2. In `ClinicalReasoningWorkflow._generate_recommendation()`, wrap the existing try/except to also catch `asyncio.TimeoutError`:

```python
except (Exception, asyncio.TimeoutError) as exc:
    logger.warning(f"AI chain timed out or failed ({type(exc).__name__}). Falling back to rule-based.")
    context.ai_output = self._build_rule_based_output(...)
```

3. Add `timeout_ms` as a configurable setting in `shared/settings.py`:

```python
llm_timeout_ms: int = 15000
```

Gate:
- BAML generates without errors after `clients.baml` edit.
- A simulated timeout (set `timeout_ms: 1`) triggers graceful fallback and returns a rule-based recommendation.
- Regression suite: all tests pass.

---

### Step 7 — ENH-7: Merge Agents 2 + 3 → `MatchAndCompose`

**Files:**
- `baml_src/clinical/recommendation_output.baml`
- `backend/src/services/workflows/clinical.py`

**Background:** Analysis of the 3-agent chain dependency graph shows that true parallelism is not possible (Agent 3 depends on both Agent 1 and Agent 2). However, Agents 2 and 3 share the same inputs (`risk_profile` + `program_ruleset`) and their outputs are complementary — policy decision and communication script. Merging them eliminates one LLM call per request.

**BAML changes:**

Add new type and function; remove `MatchProgramRules` and `ComposeRecommendation`:

```baml
class RecommendationWithScript {
  ai_recommended_tier Tier
  tier_deviation_justification string?
  selected_add_ons AddOnItem[]
  policy_reasoning string
  communication_script CommunicationScript
}

function MatchAndCompose(
  risk_profile: ClinicalRiskProfile,
  program_ruleset: string
) -> RecommendationWithScript
  client NavaveijClient
  prompt #"
    Role: Navavej Program Specialist and Clinical Communicator.
    Task: Given the clinical risk profile and program ruleset, do two things:
    1. Select the appropriate package tier and add-on items per program policy.
       Justify any deviation from the suggested tier in tier_deviation_justification.
    2. Compose a patient-facing communication script with all four sections:
       health_summary, recommendation_rationale, addon_highlights, next_steps.
    Use professional medical English. No raw snake_case identifiers. No greetings.
  "#
```

Keep unchanged: `AnalyzeClinicalRisks`, `ValidateRecommendation` (if still present after ENH-2), `Tier`, `PriorityLevel`, `AddOnItem`, `CommunicationScript`, `ClinicalRiskProfile`.

Run `uv run baml-cli generate` after schema edit.

**Workflow changes (`_generate_recommendation()`):**

```python
# Before: 3 LLM calls
risk_profile = await b.AnalyzeClinicalRisks(...)
recommendation_plan = await b.MatchProgramRules(risk_profile=risk_profile, ...)
final_recommendation = await b.ComposeRecommendation(risk_profile=risk_profile, plan=recommendation_plan)

# After: 2 LLM calls
risk_profile = await b.AnalyzeClinicalRisks(...)          # unchanged
result = await b.MatchAndCompose(
    risk_profile=risk_profile,
    program_ruleset=json.dumps(context.masked_context.get("get_program_ruleset"), indent=2),
)
context.ai_output = self._map_final_to_ai_output(result, risk_profile, ...)
```

**`_map_final_to_ai_output()` field path delta:**

| Field | Old source | New source |
|-------|-----------|-----------|
| `ai_recommended_tier` | `final.plan.ai_recommended_tier` | `result.ai_recommended_tier` |
| `tier_deviation_justification` | `final.plan.tier_deviation_justification` | `result.tier_deviation_justification` |
| `add_ons` | `final.plan.selected_add_ons` | `result.selected_add_ons` |
| `reasoning_trace` | Agent 1 bullets + `final.plan.policy_reasoning` | Agent 1 bullets + `result.policy_reasoning` |
| `communication_script` | `final.communication_script` | `result.communication_script` |
| `supporting_signals`, `missing_signals` | `risk_profile.*` | unchanged |

No changes to `_normalize_stage2()`, `_build_rule_based_output()`, or any contract route.

Gate:
- `uv run baml-cli generate` exits 0.
- Regression suite: all tests pass.
- Manual smoke: response includes non-empty `communication_script` and `add_ons`.
- `ai_chain_ms` (from ENH-1) is approximately ⅔ of the pre-ENH-7 value.

---

### Step 8 — ENH-8: Cache Agent 1 Output (`ClinicalRiskProfile`)

**File:** `backend/src/services/workflows/clinical.py`

Cache `ClinicalRiskProfile` by a stable hash of the masked clinical signals + biomarker trends. Reuse the existing `TTLCacheService` (`backend/src/services/cache.py`). TTL = `settings.cache_signal_store_ttl_seconds` (120s default).

```python
def _risk_profile_cache_key(masked_context: dict) -> str:
    payload = {
        "signals": masked_context.get("get_clinical_signals"),
        "trends": masked_context.get("get_biomarker_trends"),
    }
    return "risk_profile:" + hashlib.sha256(
        json.dumps(payload, sort_keys=True).encode()
    ).hexdigest()

async def _get_risk_profile(self, context) -> ClinicalRiskProfile:
    key = _risk_profile_cache_key(context.masked_context)
    hit, cached = cache_service.get(key)
    if hit:
        logger.debug("Agent 1 cache hit — skipping AnalyzeClinicalRisks")
        return cached
    profile = await b.AnalyzeClinicalRisks(
        clinical_signals=json.dumps(context.masked_context.get("get_clinical_signals"), indent=2),
        biomarker_trends=json.dumps(context.masked_context.get("get_biomarker_trends"), indent=2),
        hard_constraints=json.dumps(context.masked_context.get("get_hard_constraints"), indent=2),
        program_ruleset=json.dumps(context.masked_context.get("get_program_ruleset"), indent=2),
    )
    cache_service.set(key, profile, ttl_seconds=settings.cache_signal_store_ttl_seconds)
    return profile
```

Replace the direct `await b.AnalyzeClinicalRisks(...)` call in `_generate_recommendation()` with `await self._get_risk_profile(context)`.

**Combined latency impact (ENH-7 + ENH-8):**

| Scenario | Before | After ENH-7 | After ENH-7 + ENH-8 |
|----------|--------|------------|----------------------|
| Cold (no cache) | 3 calls = 6–24s | 2 calls = 4–16s | 2 calls = 4–16s |
| Warm (Agent 1 cached) | 3 calls = 6–24s | 2 calls = 4–16s | 1 call = 2–8s |
| Force rule-based | 0 calls | 0 calls | 0 calls |

Gate:
- Second request for the same patient within TTL logs "Agent 1 cache hit".
- `ai_chain_ms` on warm request ≈ ½ of cold value.
- Regression suite: all tests pass.

---

## 5. Enhancement-to-Task Mapping

| ENH | Task | Depends On | Exit Evidence |
|-----|------|-----------|---------------|
| ENH-1 | Timing instrumentation + SSE stream | Step 0 baseline | `phase_timings` in response; SSE endpoint emits events |
| ENH-2 | Safety rule validator (rule-based) | Step 0 baseline | Safety in <5ms; violations still removed; no LLM call |
| ENH-3 | MCP client singleton | ENH-2 (clean baseline) | Startup log: session initialised; no new subprocess per request |
| ENH-4 | Audit logger JSONL-only | Independent | No `audit.json` written; seek-to-end hash confirmed |
| ENH-5 | Signal store startup cache + registry index | ENH-3 (lifespan hook exists) | Cold request hits index; no glob scan |
| ENH-6 | LLM timeouts | ENH-2 (fallback path verified) | Timeout triggers fallback; `timeout_ms` configurable |
| ENH-7 | Merge Agents 2+3 → `MatchAndCompose` | ENH-2 (agent chain stable) | `baml-cli generate` exits 0; `ai_chain_ms` ≈ ⅔ of baseline |
| ENH-8 | Cache Agent 1 output (`ClinicalRiskProfile`) | ENH-7 (2-call chain in place) | Warm request logs cache hit; `ai_chain_ms` ≈ ½ of cold |

---

## 6. Deliverable Artifacts

During execution, maintain:

- `implementation/_discovery.md` — Findings and decisions during implementation (updated as work progresses).
- `implementation/_lastest_test_results.md` — Raw test output per step (replaced after each step).
- `implementation/_development_summary.md` — Interpreted status, closed items, measured latency improvements, open risks.

Per-feature folders:
- `implementation/ENH-1-phase-timing-sse/`
- `implementation/ENH-2-safety-rule-validator/`
- `implementation/ENH-3-mcp-client-singleton/`
- `implementation/ENH-4-audit-logger/`
- `implementation/ENH-5-signal-store-cache-warm/`
- `implementation/ENH-6-llm-timeouts/`
- `implementation/ENH-7-merge-agents-2-3/`
- `implementation/ENH-8-cache-agent-1/`

---

## 7. Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| SSE endpoint breaks existing `/recommend` contract tests | Implement as a new `/recommend/stream` route; do not modify the existing route |
| RuleEvaluator safety logic diverges from previous LLM behaviour | Run existing test suite after ENH-2; manually verify add-on removal for a patient with known gender/age restrictions |
| MCP singleton fails silently if subprocess crashes mid-session | Add `is_alive()` health check + one automatic reconnect before raising |
| Seek-to-end hash read misreads multi-byte UTF-8 boundary | Open in binary mode and decode the found line; already handled in implementation spec above |
| BAML `timeout_ms` not supported by all providers | Test against configured provider; fallback: wrap BAML call in `asyncio.wait_for()` at the Python level |
| Index not rebuilt when signal store files change during runtime | For POC: document that server restart is required after data file changes; production path is a file watcher |
| `MatchAndCompose` dual-objective prompt degrades output quality | Run side-by-side comparison on test patient before/after; gate on `communication_script` non-empty and `add_ons` non-empty |
| Cached `ClinicalRiskProfile` stale if signals update mid-session | TTL matches signal store TTL (120s); safe for POC where signal store is pre-computed and static per session |

---

## 8. Definition of Done

The enhancement set is complete when:

- All 8 ENH items are implemented with exit evidence.
- Full regression suite passes: `uv run pytest scripts/tests -v`.
- Response metadata includes `phase_timings` with per-phase breakdown.
- SSE endpoint `/api/v1/clinical/recommend/stream` is operational.
- Safety validation no longer calls an LLM.
- AI chain is 2 LLM calls (cold) or 1 LLM call (warm) — down from 3.
- Measured `latency_ms` on a test recommendation is below the SLA target (≤10s for new patients on a responding LLM).
- `implementation/_development_summary.md` is up to date with measured latency per phase.

---

## 9. Enhancement Status (updated 2026-03-19)

| ENH | Status | Evidence |
|-----|--------|---------|
| ENH-1 | ⬜ Pending | — |
| ENH-2 | ⬜ Pending | — |
| ENH-3 | ⬜ Pending | — |
| ENH-4 | ⬜ Pending | — |
| ENH-5 | ⬜ Pending | — |
| ENH-6 | ⬜ Pending | — |
| ENH-7 | ⬜ Pending | — |
| ENH-8 | ⬜ Pending | — |
