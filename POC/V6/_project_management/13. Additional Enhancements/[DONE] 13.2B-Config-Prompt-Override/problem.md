# Problem — Prompt Override + Runtime Versioning + Reset

**Date:** 2026-04-02
**Source:** Client change request — "add ability to select/edit prompt version for each AI client"

---

## Problem Statement

The Config screen's AI Configs tab allows inspecting prompt templates via a read-only modal, but provides **no ability to edit prompts or manage prompt versions at runtime**. Changes to prompt templates currently require editing YAML files on disk and restarting the server.

The client wants sysadmins to be able to select and edit prompt versions for each AI client directly from the Config screen.

---

## Specific Gaps

### Gap 1 — Inspect modal is read-only

The "Inspect" button (`AIConfigsTab.tsx` lines 124-130) opens a modal showing all 4 prompt templates (`analyze_clinical_risks`, `match_policy`, `write_narrative`, `annotate_reasoning_lines`) as read-only `<pre>` blocks. There is no way to edit the text, save changes, or switch between versions.

Affected: `frontend/src/components/access-monitoring/AIConfigsTab.tsx` (modal at lines 141-193)

### Gap 2 — No runtime prompt override mechanism

The `PromptTemplateSelector` (`backend/src/services/prompt_selector.py`) loads YAML files from `baml_src/prompts/` at construction time. `get_prompt_selector()` creates a fresh selector per call (line 31-33), which is good for layering overrides, but currently there is no in-memory override store to layer from.

Affected: `backend/src/services/prompt_selector.py`

### Gap 3 — No prompt PATCH/reset API endpoints

The only prompt-related endpoint is `GET /system-config/prompts/{client_name}` which returns templates read-only. There is no PATCH to update templates or POST to reset to defaults.

Affected: `backend/src/api/routes/contracts.py`

### Gap 4 — Risk-profile cache does not include AI identity (pre-existing bug)

The workflow-level risk-profile cache (`clinical.py:98-105`) is keyed only by masked patient context (clinical signals + biomarker trends). It does **not** include `active_client`, `model_id`, or `template_version`. This means:

- Switching the active client can reuse stale Agent 1 output from a different client
- Editing a prompt without a version change could reuse stale cached results

The contract-layer recommendation cache (`contracts.py:805-829`) correctly includes `active_client`, `model_id`, and `template_version` in its key.

Affected: `backend/src/services/workflows/clinical.py` function `_risk_profile_cache_key()`

### Gap 5 — Version semantics are weak

`template_version` is part of audit metadata (`clinical.py:235`) and the contract-layer cache key. If a prompt edit does not force a version change, the cache may serve stale results and audit logs become ambiguous about which prompt text produced a given recommendation.

---

## Impact

- Sysadmins cannot experiment with prompt wording during demos without server restarts
- A pre-existing cache bug means client switching may serve stale risk profiles (regardless of this feature)
- Prompt editing without version tracking undermines audit traceability
