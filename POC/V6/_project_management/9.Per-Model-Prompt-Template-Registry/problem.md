# Problem — Per-Model Prompt Template Registry

**Date:** 2026-03-27
**TOR Reference:** §4.3 Pluggable AI Architecture
**Complaint Source:** Client review of Technical Proposal

---

## Problem Statement

TOR §4.3 explicitly requires:

> *"The system must also provide **'Prompt Template Management' separated for each model**"*

The current POC V6 does not implement this. All four clinical BAML functions — `AnalyzeClinicalRisks`, `MatchPolicy`, `WriteNarrative`, and `AnnotateReasoningLines` — use a single static prompt body hardcoded directly in the `.baml` source files. When `AI_ACTIVE_CLIENT` is changed from `GPT4o` to `Claude35Sonnet` or `LocalLlama`, inference is rerouted to the correct API endpoint, but the **exact same prompt text is sent to every model**.

This is a gap because different models have meaningfully different instruction-following profiles:

| Model | Preferred Prompt Style | Risk Without Adaptation |
|---|---|---|
| GPT-4o | Concise, directive, structured sections | Baseline — current prompt written for this style |
| Claude 3.5 Sonnet | XML-tagged role and context blocks | Response quality degrades; reasoning can be scattered |
| Llama 3.x (self-hosted) | Simple instruction-tuned format; less nesting | Output schema adherence decreases with complex prompts |

---

## Specific Gaps

### Gap 1 — No per-model prompt files
There is no `baml_src/prompts/` directory. All prompt text lives inline inside `.baml` files with no mechanism to swap it per model.

### Gap 2 — No Prompt Template Selector component
The onboarding doc (component 5) describes a `PromptTemplateSelector` that "loads the version-tagged system prompt for the currently active model." This component does not exist in `backend/src/services/`.

### Gap 3 — BAML function signatures are prompt-static
`AnalyzeClinicalRisks`, `MatchPolicy`, and `WriteNarrative` in `baml_src/clinical/recommendation_output.baml` accept only clinical data parameters. There is no mechanism for Python callers to inject a model-specific system prompt at runtime.

### Gap 4 — `template_version` absent from audit trail
TOR §5.3 requires prompt context to be logged. The audit trail currently logs `model_id` but not `template_version`. If prompt templates are versioned and model-specific, the audit log must record which template version was active for each inference event.

---

## Impact

- **Proposal compliance:** The Technical Proposal has been updated (2026-03-27) to explicitly describe the YAML registry and Prompt Template Selector. The POC must implement this before any live demonstration.
- **Model switch accuracy:** Demonstrating `AI_ACTIVE_CLIENT` switching without per-model prompt adaptation is a partial demo — it proves routing works but not prompt management.
- **Audit correctness:** Without `template_version` in the audit log, the PDPA/compliance story is incomplete.
