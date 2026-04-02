# Discovery — Prompt Override + Runtime Versioning + Reset

**Date:** 2026-04-02
**Investigator:** Claude Code
**Trigger:** Client change request — editable prompt versions per AI client
**Resolution:** Pending implementation

---

## Investigation Scope

Audit of the prompt template system, cache key construction, and audit metadata to understand where prompt identity flows through the system and what breaks if prompts change at runtime.

---

## Files Audited

### Prompt Template System

| File | Finding |
|---|---|
| `backend/src/services/prompt_selector.py:8` | `_PROMPTS_DIR = Path(__file__).parents[3] / "baml_src" / "prompts"` — YAML templates live here |
| `backend/src/services/prompt_selector.py:11-22` | `PromptTemplateSelector.__init__`: loads YAML, stores `_templates` dict, extracts `version` field |
| `backend/src/services/prompt_selector.py:24-28` | `get(fn_name)`: returns template text for a BAML function name |
| `backend/src/services/prompt_selector.py:31-33` | `get_prompt_selector(active_client)`: **creates fresh instance per call** — no singleton caching. This is critical: it means layering runtime overrides in `__init__` will be picked up on every request. |
| `backend/src/services/prompt_selector.py:36-37` | `prompt_selector = get_prompt_selector()` — module-level singleton exists but is NOT used by the clinical workflow (workflow calls `get_prompt_selector()` directly at line 228 of clinical.py) |

### Prompt YAML Files

| File | Finding |
|---|---|
| `baml_src/prompts/gemini.yaml` | `version: "gemini-v1"` + 4 templates |
| `baml_src/prompts/openai.yaml` | `version: "openai-v1"` + 4 templates |
| `baml_src/prompts/anthropic.yaml` | `version: "anthropic-v1"` + 4 templates |
| `baml_src/prompts/openrouter.yaml` | `version: "openrouter-v1"` + 4 templates |
| `baml_src/prompts/local.yaml` | `version: "local-v1"` + 4 templates |

Template keys (consistent across all models): `analyze_clinical_risks`, `match_policy`, `write_narrative`, `annotate_reasoning_lines`

### Cache Key Analysis

| File | Finding |
|---|---|
| `backend/src/api/routes/contracts.py:805-829` | `_recommendation_cache_key()`: includes `patient_token`, `signal_store_pipeline_run_id`, `ruleset_version`, `force_rule_based`, **`active_client`**, **`model_id`**, **`template_version`**, `api_auth_mode`. **Prompt/model changes bust this cache** (via template_version). |
| `backend/src/services/workflows/clinical.py:98-105` | `_risk_profile_cache_key()`: includes ONLY `signals` and `trends` from masked context. **Does NOT include `active_client`, `model_id`, or `template_version`.** This is the bug. |
| `backend/src/services/workflows/clinical.py:260-261` | Cache check: `_cache_key = _risk_profile_cache_key(context.masked_context)` — called with only masked_context |
| `backend/src/services/workflows/clinical.py:286` | Cache set: `cache_service.set(_cache_key, risk_profile, ...)` — stores Agent 1 output under context-only key |

### Audit Metadata Flow

| File | Finding |
|---|---|
| `backend/src/services/workflows/clinical.py:230-236` | `context.metadata` updated with `active_client`, `model_id`, `model_provider`, `template_version` |
| `backend/src/api/routes/contracts.py:790-795` | Metadata flows into the response payload: `active_client`, `model_id`, `model_provider`, `template_version` |

### Frontend Inspect Modal

| File | Finding |
|---|---|
| `frontend/src/components/access-monitoring/AIConfigsTab.tsx:45-53` | `handleInspect()`: calls `clinicalService.getClientPrompts(clientName)`, sets `inspectData` state |
| `frontend/src/components/access-monitoring/AIConfigsTab.tsx:141-193` | Modal: header with client name + version badge, body with `<pre>` per template, footer with "Close" button |
| `frontend/src/components/access-monitoring/AIConfigsTab.tsx:174` | Template text rendered as: `<pre>{text.trim()}</pre>` — note the `.trim()`, which strips whitespace |

### API Endpoints

| File | Finding |
|---|---|
| `backend/src/api/routes/contracts.py:1188-1195` | `GET /system-config/prompts/{client_name}`: returns `ClientPromptsResponse` with `client_name`, `template_version`, `templates` dict |
| `frontend/src/services/api.ts` | `getClientPrompts(clientName)`: calls GET endpoint, returns `ClientPromptsResponse` |

---

## Key Findings

1. **`get_prompt_selector()` creates fresh instances per call.** This is the design enabler: adding a `_runtime_prompt_overrides` dict and layering it in `__init__` will take effect on every subsequent recommendation request without any singleton invalidation.

2. **Risk-profile cache is broken for client switching.** Even without this feature, switching the active client via "Set Active" could serve stale Agent 1 output. The fix (adding AI identity to the cache key) should be done as part of this workstream since prompt editing makes the same bug worse.

3. **`template_version` already flows through both cache keys and audit metadata.** Auto-stamping a new version on prompt edit will naturally bust the contract-layer cache and distinguish audit entries. The risk-profile cache needs the fix from finding #2.

4. **The inspect modal `.trim()` on line 174 is lossy.** If prompts have intentional leading/trailing whitespace, the displayed text differs from what the LLM sees. The edit mode should NOT trim — use raw text.

5. **No PATCH or reset endpoints exist.** Need to add both.

---

## Recommendation

1. Fix `_risk_profile_cache_key()` first — it's a pre-existing correctness bug independent of this feature
2. Add `_runtime_prompt_overrides` to `prompt_selector.py` with auto-version stamping
3. Add PATCH and reset endpoints
4. Transform the inspect modal to support edit mode with textarea inputs
