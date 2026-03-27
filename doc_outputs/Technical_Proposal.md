"""
Confluence Edit Specification — Per-Model Prompt Template Management
Generated: 2026-03-27
Reason: Client complaint — TOR §4.3 requires "Prompt Template Management separated for each model".
        Proposal was silent on this; below changes make it explicit.
"""

---

## Change 1 — Section 7.4.2 (Pluggable LLM Configuration Management)

**Location:** At the end of section 7.4.2, after the paragraph beginning "This means the same application build..."

**Action:** Append the following subsection.

---

### Per-Model Prompt Template Management

Switching models does not only mean routing requests to a different API endpoint — it also means adapting the prompt to the reasoning style, instruction format, and capability profile of the target model. GPT-4o responds best to concise, directive instruction styles; Claude 3.5 Sonnet performs better with explicit XML-tagged role and context blocks; smaller open-weight models such as Llama 3.x require simpler, less nested instructions to maintain consistent output fidelity.

To satisfy TOR §4.3, the system maintains a **YAML-based prompt template registry** (`baml_src/prompts/`), with one file per supported model:

| Template File | Target Model | Notes |
|---|---|---|
| `prompts/gpt4o.yaml` | GPT-4o (OpenAI) | Directive style; compact instructions |
| `prompts/claude.yaml` | Claude 3.5 Sonnet (Anthropic) | XML-tag structure for role and context |
| `prompts/llama.yaml` | Llama 3.x (Self-hosted) | Simplified instruction-tuned format |

At service startup, the **Prompt Template Selector** reads `AI_ACTIVE_CLIENT` and loads the corresponding template set. All clinical BAML functions receive the model-appropriate prompt text as a dynamic input — preserving BAML's type-safe output schema enforcement while making the prompt body configurable per model without any code changes.

This means the same single `AI_ACTIVE_CLIENT` configuration value that routes inference traffic to the correct provider also selects the correct prompt template set — ensuring the prompt and model are always in sync.

---

## Change 2 — Section 7.5 (AI Tech Stack table)

**Location:** The tech stack table in section 7.5.

**Action A:** Find the row for "Structured LLM Prompting / BAML" and update the **Role** cell:

- **Before:** `Type-safe prompt authoring and output schema enforcement for all three clinical agents`
- **After:** `Type-safe output schema enforcement for all three clinical agents; prompt bodies are supplied by the per-model YAML template registry`

**Action B:** Insert a new row immediately after the BAML row:

| Component | Technology | Version | Role |
|---|---|---|---|
| Per-Model Prompt Templates | YAML template registry (`baml_src/prompts/`) | — | Model-specific system prompt sets (GPT-4o / Claude 3.5 / Llama); active set loaded at startup by the Prompt Template Selector based on `AI_ACTIVE_CLIENT` |
