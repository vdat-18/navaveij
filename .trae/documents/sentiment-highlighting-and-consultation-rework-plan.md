# Sentiment, Highlighting, and Consultation Rework Plan

## Scope

This plan covers four connected improvements in POC v5:

1. **Frontend** — make `Policy Reasoning` participate correctly in phase-level highlighting behavior
2. **Highlight rules** — purge broad regex-based highlighting so only meaningful tokens are emphasized
3. **Line sentiment** — replace deterministic keyword sentiment in `Clinical Logic & Rationale` with LLM-based sentiment, architected to avoid long sequential latency
4. **Patient Consultation Guide** — revisit BAML prompts and output schema so the section is shorter, more consistent, and more structurally robust

## Current State

### 1. Policy Reasoning is outside the current sentiment pipeline

Right now:

- `Clinical Logic & Rationale` evidence cards use `reasoning_trace_annotated` and therefore get per-line sentiment styling
- `Policy Reasoning` is still derived separately from raw `reasoning_trace` string parsing
- `Policy Reasoning` calls the shared highlighter without a `sentiment` argument, so token chips are rendered only with default highlight colors

Implication:

- phase-level colors apply to evidence lines
- phase-level colors do **not** apply to `Policy Reasoning`

### 2. Highlighting is still too broad

The shared formatter currently highlights:

- unit/value patterns
- dictionary terms
- any snake_case clinical token

This is better than before, but still too permissive for polished consultation text. It can over-highlight internal/system-like tokens and create noisy emphasis.

### 3. Current line sentiment is backend-owned but still heuristic

Current implementation now lives in backend:

- `backend/src/services/text_annotations.py`

It is:

- deterministic
- keyword-based
- non-LLM

This improves ownership, but not semantic quality.

### 4. Patient Consultation Guide content is still too verbose and uneven

Current BAML structure is split across:

- `WriteNarrative`
- `MatchPolicy`

The frontend then renders:

- `Clinical Conclusion`
- `Core Health Insights`
- `Special Highlights`
- `Why this program?`
- `Next steps`

Issues:

- output can be too wordy
- section lengths are uneven
- the public schema naming is not fully canonical
- frontend sentence splitting can amplify perceived verbosity

## Design Principles

### Meaningful highlights: definition

For this scope, **meaningful** means a highlighted token must satisfy at least one of these:

1. **Clinically decisive measurement**
   - values that materially affect interpretation
   - examples: `135/87 mmHg`, `151 mg/dL`, `5.9%`, `eGFR 86 mL/min/1.73 m²`

2. **Named clinical concept with explanatory value**
   - concepts a physician or consultant should visually notice quickly
   - examples: `Stage 1 Hypertension`, `Prediabetes`, `Metabolic Syndrome`, `CKD Stage G2`

3. **Decision-driving package/program term**
   - examples: `Premium`, `Exercise Stress Test`, `Kidney Disease Screening`

Not meaningful for highlighting:

- generic prose connectors
- internal formatting artifacts
- arbitrary snake_case tokens that are not user-meaningful
- redundant repeated emphasis in the same sentence
- punctuation fragments or partial units

### Architecture principles

- **Backend owns semantic annotation**
- **Frontend owns rendering only**
- **LLM tasks should run in parallel where dependencies allow**
- **BAML outputs should be short, structured, and schema-stable**

## Proposed Solution

## A. Frontend: bring Policy Reasoning into the same highlighting model

### Goal

Make `Policy Reasoning` use the same annotation model as the rest of the phase-level content, instead of treating it as an unannotated raw string block.

### Planned approach

1. Extend backend annotations so policy lines can also carry structured metadata
2. Decide whether `Policy Reasoning` should:
   - receive line-level sentiment, or
   - receive a separate annotation type such as `informational`, `justification`, or `neutral-policy`
3. Update frontend rendering so `Policy Reasoning` consumes structured annotations instead of raw string parsing

### Recommendation

Do **not** force `Policy Reasoning` into the same red/green semantics as evidence lines unless that proves clinically useful.

Better model:

- `Clinical Logic & Rationale` → risk/reassurance sentiment coloring
- `Policy Reasoning` → calmer structured justification styling, with meaningful inline highlights but not necessarily emotional sentiment coloring

This preserves semantic clarity.

## B. Purge phase-level regex rules to only meaningful highlights

### Goal

Reduce visual noise and prevent over-highlighting.

### Planned rule changes

1. Replace “highlight all snake_case clinical tokens” with a narrower allowlist-driven approach
2. Keep measurement highlighting, but only for medically meaningful units and composite values
3. Restrict dictionary highlighting to curated, user-facing concepts
4. Prevent duplicate or nested emphasis when the same semantic idea appears repeatedly in one sentence

### Proposed rule hierarchy

**Tier 1 — Always eligible**

- blood pressure
- glycemic markers
- kidney function values
- lipid values
- ASCVD percentages
- stage/classification terms

**Tier 2 — Eligible only if in curated vocabulary**

- disease/state labels
- named package tier terms
- named program/add-on names

**Tier 3 — Excluded**

- raw backend/system identifiers
- generic boilerplate tokens
- non-display-safe abbreviations unless mapped to readable labels

### Implementation direction

Short-term:

- refine the shared frontend formatter module

Longer-term:

- move highlight rule definitions into a dedicated backend or shared config module so they are independently maintainable from `RecommendationPanel`

## C. Use LLM for line-level sentiment without long sequential latency

### Goal

Upgrade sentiment quality while avoiding a new tail-latency bottleneck.

### Recommended architecture

Add a new LLM annotation task immediately after `AnalyzeClinicalRisks`, and run it **in parallel** with:

- `MatchPolicy`
- `WriteNarrative`

So total latency becomes:

- `AnalyzeClinicalRisks + max(MatchPolicy, WriteNarrative, LineSentimentLLM)`

instead of:

- `AnalyzeClinicalRisks + MatchPolicy + WriteNarrative + SentimentLLM`

### Planned implementation path

1. Add a new BAML function for reasoning-line annotation/sentiment
2. Feed it the Agent 1 bullet lines or equivalent structured risk-profile narrative
3. Run it in the existing `asyncio.gather(...)` fan-out inside workflow execution
4. Return structured line annotations in the normalized response payload
5. Keep deterministic fallback if the LLM annotation fails or times out

### Recommended backend output shape

Instead of only:

- `{ text, sentiment }`

return:

- `{ text, scope, sentiment, highlight_terms }`

Where:

- `scope` could distinguish `clinical_reasoning` vs `policy_reasoning`
- `sentiment` covers line-level tone or urgency
- `highlight_terms` can optionally prepare future token-level consistency

### Latency safeguards

1. Parallelize with existing Agent 2 fan-out
2. Put strict timeout budget on the annotation call
3. Fallback to deterministic or neutral annotations on failure
4. Avoid re-calling the LLM per line; send line batch as one annotation task

## D. Revisit BAML instructions and schema for Patient Consultation Guide

### Goal

Produce fewer words, more predictable section shapes, and clearer frontend rendering contracts.

### Current problem

The current guide is formed by combining outputs from different BAML agents and then remapping them through API normalization. This causes:

- duplicated or blurry section purpose
- uneven verbosity
- inconsistent naming
- frontend over-processing to make prose look structured

### Planned schema direction

Define a stricter consultation-guide contract with compact fields such as:

- `summary_headline`
- `top_findings[]`
- `program_justification`
- `priority_add_ons[]`
- `next_actions[]`

This is more robust than long prose paragraphs split on the frontend.

### Instruction changes

For BAML prompts:

1. hard-cap each field
2. require single-purpose fields
3. forbid repeated restatement across sections
4. prefer bullet-like compact outputs over narrative paragraphs
5. normalize wording style for physician-facing summaries

### Target output style

- **Clinical Conclusion**: 1 short headline sentence
- **Core Health Insights**: 3–5 concise bullet items only
- **Why this program?**: 1 short paragraph or 2 bullets max
- **Special Highlights**: top 2–4 items only
- **Next steps**: 3–5 action bullets max

## Files Likely To Change During Execution

### Backend

- `POC/v5/backend/src/services/workflows/clinical.py`
- `POC/v5/backend/src/api/routes/contracts.py`
- `POC/v5/backend/src/services/text_annotations.py`
- likely a new backend annotation helper/module

### BAML

- `POC/v5/baml_src/clinical/recommendation_output.baml`
- possibly generated/related BAML client artifacts if regeneration is required

### Frontend

- `POC/v5/frontend/src/components/dashboard/RecommendationPanel.tsx`
- `POC/v5/frontend/src/shared/recommendationTextFormatting.tsx`
- `POC/v5/frontend/src/types/recommendation.ts`
- possibly new shared types/utilities for annotated consultation content

### Tests

- `POC/v5/frontend/src/components/dashboard/RecommendationPanel.test.tsx`
- backend tests for workflow annotation and response normalization
- possibly prompt/schema or contract regression tests

## Phased Execution Plan

### Phase 1 — Annotation model redesign

1. Define new structured annotation shape for reasoning lines
2. Add scope-aware backend annotation contract
3. Preserve deterministic fallback path

### Phase 2 — Parallel LLM sentiment

1. Add BAML annotation function
2. Run it in parallel with existing Agent 2 calls
3. Thread results through workflow and contracts

### Phase 3 — Highlight-rule narrowing

1. Replace broad snake_case emphasis with curated meaningful-highlight rules
2. Audit dictionary entries for user-facing relevance
3. Reduce duplicate highlighting and punctuation artifacts

### Phase 4 — Policy Reasoning integration

1. Stop raw-string-only handling
2. Render from structured annotations
3. Apply appropriate scope-aware visual treatment

### Phase 5 — Consultation schema and prompt rework

1. Tighten BAML prompt instructions
2. Redefine compact public consultation schema
3. Update frontend rendering to rely less on sentence splitting

### Phase 6 — Verification

1. Confirm no new sequential latency regression in workflow path
2. Confirm evidence and policy blocks both use structured annotation inputs
3. Confirm only meaningful tokens are highlighted
4. Confirm `Patient Consultation Guide` becomes shorter and more consistent
5. Confirm fallback behavior still works when annotation LLM fails

## Expected Outcome

After execution:

- `Policy Reasoning` will no longer be an annotation outlier
- highlight rules will emphasize only clinically or decision-relevant content
- line-level sentiment will be LLM-based but parallelized to avoid long sequential latency
- `Patient Consultation Guide` will be shorter, more uniform, and easier to render reliably
