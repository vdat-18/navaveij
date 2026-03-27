# Plan — Per-Model Prompt Template Registry

**Date:** 2026-03-27
**Input:** `problem.md`
**Approach:** YAML template registry + Prompt Template Selector service

---

## Approach

Each supported model gets its own YAML file under `baml_src/prompts/`. A new `PromptTemplateSelector` service loads the file that matches `AI_ACTIVE_CLIENT` at startup and exposes a `get(fn_name)` method. BAML function signatures gain a `system_prompt: string` parameter; the static prompt body is replaced with `{{ system_prompt }}` so BAML continues to enforce output schema while the prompt text becomes externally configurable.

`AnnotateReasoningLines` uses the separate `AnnotationModel` client (annotation-only, UI-facing) — it is included in the registry for completeness but its template is less model-critical.

---

## Tasks

### Task 1 — Create YAML template registry files

**New files:**
- `baml_src/prompts/gpt4o.yaml`
- `baml_src/prompts/claude.yaml`
- `baml_src/prompts/llama.yaml`

**Schema per file:**
```yaml
# Template version tag — logged in audit trail as template_version
version: "gpt4o-v1"   # or claude-v1 / llama-v1

analyze_clinical_risks: |
  <model-specific system prompt for AnalyzeClinicalRisks>

match_policy: |
  <model-specific system prompt for MatchPolicy>

write_narrative: |
  <model-specific system prompt for WriteNarrative>

annotate_reasoning_lines: |
  <model-specific system prompt for AnnotateReasoningLines>
```

**Starting content:** Copy the existing BAML inline prompts (written for GPT-4o) into `gpt4o.yaml` verbatim as the baseline. Then adapt for Claude (add XML-tag wrappers around roles and context) and Llama (simplify to plain instruction-tuned format, reduce nesting).

**Note:** `AI_ACTIVE_CLIENT` values `NavaveijClient` and `OpenRouterClient` (fallback chain entries) should map to `gpt4o.yaml` as the default.

---

### Task 2 — Add `PromptTemplateSelector` service

**New file:** `backend/src/services/prompt_selector.py`

```python
"""Prompt Template Selector — loads the per-model YAML template file at startup."""

import yaml
from pathlib import Path
from shared.settings import settings

_ACTIVE_CLIENT_TO_FILE = {
    "GPT4o":          "gpt4o",
    "NavaveijClient": "gpt4o",   # aliases
    "OpenRouterClient": "gpt4o",
    "Claude35Sonnet": "claude",
    "LocalLlama":     "llama",
}

_PROMPTS_DIR = Path(__file__).parents[4] / "baml_src" / "prompts"


class PromptTemplateSelector:
    """Singleton that loads model-specific prompt templates from YAML at startup."""

    def __init__(self) -> None:
        model_key = _ACTIVE_CLIENT_TO_FILE.get(settings.ai_active_client, "gpt4o")
        template_path = _PROMPTS_DIR / f"{model_key}.yaml"
        with template_path.open() as f:
            data = yaml.safe_load(f)
        self._templates: dict[str, str] = data
        self.version: str = data.get("version", f"{model_key}-v1")

    def get(self, fn_name: str) -> str:
        """Return the system prompt string for the given BAML function name."""
        if fn_name not in self._templates:
            raise KeyError(f"No prompt template found for function '{fn_name}' in model registry")
        return self._templates[fn_name]


# Module-level singleton — instantiated once when the module is first imported.
prompt_selector = PromptTemplateSelector()
```

---

### Task 3 — Update BAML function signatures

**File:** `baml_src/clinical/recommendation_output.baml`

For each of the three `ActiveModel` functions, add `system_prompt: string` as the first parameter and replace the static prompt body with the injected value:

```baml
function AnalyzeClinicalRisks(
  system_prompt: string,
  clinical_signals: string,
  biomarker_trends: string,
  hard_constraints: string,
  program_ruleset: string
) -> ClinicalRiskProfile {
  client ActiveModel
  prompt #"
    {{ system_prompt }}

    ── INPUT DATA ─────────────────────────────────────────────────────────────
    HARD CONSTRAINTS: {{ hard_constraints }}
    CLINICAL SIGNALS: {{ clinical_signals }}
    BIOMARKER TRENDS: {{ biomarker_trends }}
    HOSPITAL PROGRAM RULESET: {{ program_ruleset }}

    {{ ctx.output_format }}
  "#
}
```

Apply the same pattern to `MatchPolicy` and `WriteNarrative` — each gets a `system_prompt: string` first parameter; the role description and instructions block in the prompt body are replaced by `{{ system_prompt }}`.

`AnnotateReasoningLines` (uses `AnnotationModel`, not `ActiveModel`) — add `system_prompt: string` parameter following the same pattern for completeness, though its template is less model-critical.

After editing `.baml` files, run `baml-cli generate` (or equivalent) to regenerate `baml_client/`.

---

### Task 4 — Wire `PromptTemplateSelector` into `ClinicalReasoningWorkflow`

**File:** `backend/src/services/workflows/clinical.py`

Import and inject the selector, then pass the template to each BAML call:

```python
from src.services.prompt_selector import prompt_selector

# In _generate_recommendation(), update each BAML call:

risk_profile = await b.AnalyzeClinicalRisks(
    system_prompt=prompt_selector.get("analyze_clinical_risks"),
    clinical_signals=...,
    biomarker_trends=...,
    hard_constraints=...,
    program_ruleset=...,
)

policy_result, narrative = await asyncio.gather(
    b.MatchPolicy(
        system_prompt=prompt_selector.get("match_policy"),
        risk_profile=risk_profile,
        program_ruleset=...,
    ),
    b.WriteNarrative(
        system_prompt=prompt_selector.get("write_narrative"),
        risk_profile=risk_profile,
    ),
    return_exceptions=True,
)

# AnnotateReasoningLines (background task):
annotation_task = asyncio.create_task(
    b.AnnotateReasoningLines(
        system_prompt=prompt_selector.get("annotate_reasoning_lines"),
        clinical_lines=...,
    )
)
```

---

### Task 5 — Add `template_version` to metadata and audit trail

**File:** `backend/src/services/orchestrator.py`

After `ClinicalReasoningWorkflow` completes, inject `template_version` into the recommendation metadata:

```python
from src.services.prompt_selector import prompt_selector

# After workflow.execute():
recommendation["metadata"]["template_version"] = prompt_selector.version
```

The audit logger already receives metadata — no changes to `audit.py` are needed as long as `template_version` is present in the metadata dict passed to `log_recommendation()`.

---

### Task 6 — Update `.env.example`

Add a comment clarifying that `AI_ACTIVE_CLIENT` controls both the inference endpoint and the prompt template set:

```env
# AI_ACTIVE_CLIENT selects the active BAML client AND the per-model prompt template set.
# Changing this value (+ service restart) is the only step needed to switch models.
# Valid values: GPT4o | Claude35Sonnet | LocalLlama | NavaveijClient
# Prompt template files: baml_src/prompts/{gpt4o,claude,llama}.yaml
AI_ACTIVE_CLIENT=GPT4o
```

---

## Files Changed

| File | Change |
|---|---|
| `baml_src/prompts/gpt4o.yaml` | New — GPT-4o prompt templates |
| `baml_src/prompts/claude.yaml` | New — Claude 3.5 Sonnet prompt templates |
| `baml_src/prompts/llama.yaml` | New — Llama 3.x prompt templates |
| `backend/src/services/prompt_selector.py` | New — PromptTemplateSelector singleton |
| `baml_src/clinical/recommendation_output.baml` | Add `system_prompt` param to 4 functions |
| `baml_client/` | Regenerated by `baml-cli generate` |
| `backend/src/services/workflows/clinical.py` | Import selector; pass `system_prompt` to each BAML call |
| `backend/src/services/orchestrator.py` | Inject `template_version` into metadata |
| `.env.example` | Update comment for `AI_ACTIVE_CLIENT` |

---

## Verification

1. **Unit:** Instantiate `PromptTemplateSelector` for each `AI_ACTIVE_CLIENT` value and assert `get("analyze_clinical_risks")` returns a non-empty string.
2. **Integration:** Run the backend with `AI_ACTIVE_CLIENT=Claude35Sonnet`. Inspect the BAML trace or debug logs to confirm the Claude-specific prompt body was sent to the model (not the GPT-4o version).
3. **Audit:** Call `POST /api/recommend` and verify the audit log entry contains `metadata.template_version = "claude-v1"` (or equivalent).
4. **Fallback:** Start with `AI_ACTIVE_CLIENT=UnknownModel`. `PromptTemplateSelector` should default to `gpt4o.yaml` without raising an exception.
5. **Schema enforcement:** Confirm BAML still validates output schema correctly (run existing `recommendation_tests.baml` test suite with `baml-cli test`).

---

## Out of Scope

- Version history / rollback for template files — filesystem Git history is sufficient for a POC
- Admin UI for editing templates at runtime — config file approach is adequate per TOR §4.3
- Template validation (schema check on YAML keys) — can be added post-POC
