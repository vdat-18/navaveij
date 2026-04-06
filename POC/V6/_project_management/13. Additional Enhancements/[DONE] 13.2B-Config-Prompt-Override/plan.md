# Plan — Prompt Override + Runtime Versioning + Reset

> Use checkbox (`- [ ]`) syntax to track steps during implementation. Execute tasks in order.

**Goal:** Fix the risk-profile cache key to include AI identity; add runtime prompt overrides with auto-version stamping; expose PATCH and reset endpoints; transform the inspect modal into an editable view.

**Architecture:** In-memory prompt override store (resets on restart) layered on top of YAML files. Auto-stamped version string ensures cache correctness and audit traceability. `get_prompt_selector()` already creates fresh instances per call — overrides take effect immediately.

**Tech Stack:** Python (FastAPI, Pydantic), TypeScript (React), Lucide React

---

## Phase 1 — Backend: Fix Risk-Profile Cache Key (pre-existing bug)

### Task 1 — Extend `_risk_profile_cache_key()` to include AI identity

**Modify file:** `backend/src/services/workflows/clinical.py`

- [ ] **Step 1:** Update `_risk_profile_cache_key()` signature to accept `active_client: str`, `model_id: str`, `template_version: str`

- [ ] **Step 2:** Add these fields to the payload dict used for hashing:
  ```python
  def _risk_profile_cache_key(masked_context: dict, active_client: str, model_id: str, template_version: str) -> str:
      payload = {
          "signals": masked_context.get("get_clinical_signals"),
          "trends": masked_context.get("get_biomarker_trends"),
          "active_client": active_client,
          "model_id": model_id,
          "template_version": template_version,
      }
      return "risk_profile:" + hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
  ```

- [ ] **Step 3:** Update call site at ~line 260 (`_cache_key = _risk_profile_cache_key(...)`) to pass `resolved_client.client_name`, `resolved_client.model_id`, `selector.version`

- [ ] **Step 4:** Verify the cache set at ~line 286 uses the same updated key variable

---

## Phase 2 — Backend: Prompt Runtime Overrides

### Task 2 — Add runtime override store to prompt_selector.py

**Modify file:** `backend/src/services/prompt_selector.py`

- [ ] **Step 1:** Add module-level override store:
  ```python
  from datetime import datetime, timezone

  # In-memory prompt overrides — per registry key, per template key.
  # Resets on server restart.
  _runtime_prompt_overrides: dict[str, dict[str, str]] = {}
  ```

- [ ] **Step 2:** Modify `PromptTemplateSelector.__init__()` to layer overrides after YAML load:
  ```python
  # After existing YAML load...
  key = resolved_client.prompt_registry_key
  if key in _runtime_prompt_overrides:
      overrides = _runtime_prompt_overrides[key]
      for template_key, template_text in overrides.items():
          if template_key == "version":
              self.version = template_text
          else:
              self._templates[template_key] = template_text
  ```

- [ ] **Step 3:** Add helper functions:
  ```python
  def set_runtime_prompt_override(registry_key: str, template_key: str, text: str) -> None:
      """Store a runtime override for one prompt template. Auto-stamps version."""
      if registry_key not in _runtime_prompt_overrides:
          _runtime_prompt_overrides[registry_key] = {}
      _runtime_prompt_overrides[registry_key][template_key] = text
      # Auto-stamp version
      ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
      base_version = ...  # load from YAML to get original version
      _runtime_prompt_overrides[registry_key]["version"] = f"{base_version}+runtime-{ts}"

  def set_runtime_prompt_version(registry_key: str, version: str) -> None:
      """Explicitly set the runtime version string."""
      if registry_key not in _runtime_prompt_overrides:
          _runtime_prompt_overrides[registry_key] = {}
      _runtime_prompt_overrides[registry_key]["version"] = version

  def reset_runtime_prompt_overrides(registry_key: str) -> None:
      """Clear all runtime overrides for a registry key, reverting to YAML."""
      _runtime_prompt_overrides.pop(registry_key, None)
  ```

- [ ] **Step 4:** Add helper to read base version from YAML (for auto-stamp prefix):
  ```python
  def _base_version(registry_key: str) -> str:
      path = _PROMPTS_DIR / f"{registry_key}.yaml"
      with path.open() as f:
          data = yaml.safe_load(f)
      return data.get("version", f"{registry_key}-v1")
  ```

### Task 3 — Add prompt PATCH and reset endpoints

**Modify file:** `backend/src/api/routes/contracts.py`

- [ ] **Step 1:** Add Pydantic models:
  ```python
  class UpdatePromptsRequest(BaseModel):
      version: str | None = None
      templates: dict[str, str]
  ```

- [ ] **Step 2:** Add PATCH endpoint:
  ```python
  @router.patch("/system-config/prompts/{client_name}", response_model=ClientPromptsResponse)
  def update_client_prompts(client_name: str, body: UpdatePromptsRequest, _auth=Depends(require_monitoring_access)):
  ```
  - Resolves client to get `prompt_registry_key`
  - Calls `set_runtime_prompt_override()` for each template in `body.templates`
  - If `body.version` provided, calls `set_runtime_prompt_version()`
  - Returns updated `ClientPromptsResponse`

- [ ] **Step 3:** Add reset endpoint:
  ```python
  @router.post("/system-config/prompts/{client_name}/reset", response_model=ClientPromptsResponse)
  def reset_client_prompts(client_name: str, _auth=Depends(require_monitoring_access)):
  ```
  - Resolves client to get `prompt_registry_key`
  - Calls `reset_runtime_prompt_overrides(registry_key)`
  - Returns reverted `ClientPromptsResponse`

---

## Phase 3 — Frontend: Editable Inspect Modal

### Task 4 — Add API methods

**Modify file:** `frontend/src/services/api.ts`

- [ ] **Step 1:** Add `updateClientPrompts(clientName, data: { version?: string; templates: Record<string, string> }): Promise<ClientPromptsResponse>` to `clinicalService`
- [ ] **Step 2:** Add `resetClientPrompts(clientName: string): Promise<ClientPromptsResponse>` to `clinicalService`

### Task 5 — Transform inspect modal to edit mode

**Modify file:** `frontend/src/components/access-monitoring/AIConfigsTab.tsx`

- [ ] **Step 1:** Add edit mode state:
  ```typescript
  const [editMode, setEditMode] = useState(false);
  const [editTemplates, setEditTemplates] = useState<Record<string, string>>({});
  const [editVersion, setEditVersion] = useState("");
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  ```

- [ ] **Step 2:** Add Edit toggle button in modal header (pencil icon from lucide-react, next to version badge). Clicking toggles `editMode`, initializes `editTemplates` from `inspectData.templates` and `editVersion` from `inspectData.template_version`.

- [ ] **Step 3:** Modal body — conditional rendering:
  - **View mode:** existing `<pre>` blocks (unchanged, but remove `.trim()` from line 175)
  - **Edit mode:** `<textarea>` per template key:
    - `className="font-mono text-[11px] ..."` matching the `<pre>` style
    - `style={{ whiteSpace: "pre" }}` — no trim, preserve all whitespace
    - `minHeight: 200px`, `resize: vertical`
    - Value from `editTemplates[key]`, onChange updates `editTemplates`
  - Version field in header: editable `<input>` when in edit mode

- [ ] **Step 4:** Modal footer — conditional rendering:
  - **View mode:** "Close" button (unchanged)
  - **Edit mode:** "Cancel" (resets edit state, reverts to view) + "Save Changes" (teal, calls PATCH) + "Reset to Default" link (calls reset endpoint with confirmation)

- [ ] **Step 5:** Implement save handler:
  - Sets `saving = true`
  - Calls `clinicalService.updateClientPrompts(inspectData.client_name, { version: editVersion, templates: editTemplates })`
  - On success: update `inspectData` with response, exit edit mode, call `onActiveClientChange()` to refresh config
  - On error: show error inline
  - Sets `saving = false`

- [ ] **Step 6:** Implement reset handler:
  - Show confirmation dialog ("Reset all prompts to YAML defaults?")
  - If confirmed: calls `clinicalService.resetClientPrompts(inspectData.client_name)`
  - On success: update `inspectData` with response, exit edit mode, call `onActiveClientChange()`

---

## Verification

- [ ] Prompt edit changes `template_version` (auto-stamped with `+runtime-...` suffix)
- [ ] GET `/system-config/prompts/{client}` returns edited templates
- [ ] Reset reverts to original YAML version and templates
- [ ] After prompt edit: next recommendation uses new template_version in response metadata
- [ ] Risk-profile cache misses after active client switch (cache key fix from Task 1)
- [ ] Contract-layer cache misses after prompt edit (template_version change in key)
- [ ] Frontend builds without TypeScript errors
- [ ] Existing test suite still passes

---

## Files Changed

| File | Change type |
|---|---|
| `backend/src/services/workflows/clinical.py` | Modified — fix `_risk_profile_cache_key` to include AI identity |
| `backend/src/services/prompt_selector.py` | Modified — `_runtime_prompt_overrides` store + auto-version stamping + helpers |
| `backend/src/api/routes/contracts.py` | Modified — 2 new endpoints + 1 Pydantic model |
| `frontend/src/services/api.ts` | Modified — 2 new methods |
| `frontend/src/components/access-monitoring/AIConfigsTab.tsx` | Modified — editable inspect modal with edit/view toggle |

## Out of Scope

- Writing overrides to YAML files on disk (runtime-only, resets on restart)
- Prompt version history / rollback UI
- Diff view between YAML original and runtime override
- Per-function prompt testing (run one prompt in isolation)
