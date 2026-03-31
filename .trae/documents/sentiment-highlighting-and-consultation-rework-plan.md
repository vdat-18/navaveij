# Sentiment, Highlighting, and Consultation Rework Plan

## Scope

This plan covers four connected improvements in POC v5:

1. **Frontend** — make `Policy Reasoning` participate correctly in phase-level highlighting behavior
2. **Highlight rules** — purge broad regex-based highlighting so only meaningful tokens are emphasized
3. **Line sentiment** — replace deterministic keyword sentiment in `Clinical Logic & Rationale` with LLM-based sentiment, architected to avoid long sequential latency
4. **Patient Consultation Guide** — revisit BAML prompts and output schema so the section is shorter, more consistent, and more structurally robust

## Current State

> **Note:** This section was last accurate before implementation began. See the Phased Execution Plan below
> for current status (✅ / ⚠️ / ❌) of each phase.

### 1. Policy Reasoning is outside the current sentiment pipeline

~~Right now:~~

- ~~`Clinical Logic & Rationale` evidence cards use `reasoning_trace_annotated` and therefore get per-line sentiment styling~~
- ~~`Policy Reasoning` is still derived separately from raw `reasoning_trace` string parsing~~
- ~~`Policy Reasoning` calls the shared highlighter without a `sentiment` argument, so token chips are rendered only with default highlight colors~~

**Updated state (post Phase 4 partial implementation):**

- Policy Reasoning lines are now separated from clinical lines by filtering on `scope === "policy_reasoning"` — the raw string parsing path is used only as a fallback
- However, `sentiment` is currently **hardcoded to `"informational"`** in the render block instead of reading `line.sentiment` from the annotation — this is a bug
- On the fallback path (no `reasoning_trace_annotated`), all lines are assigned `scope: "clinical_reasoning"`, which makes the Policy Reasoning section **silently invisible**

### 2. Highlighting is still too broad

The shared formatter currently highlights:

- unit/value patterns (`UNIT_HIGHLIGHT_REGEX` — broad numeric + unit sweep, still active)
- dictionary terms (now gated behind a 13-term `MEANINGFUL_DISPLAY_TERMS` allowlist — partially narrowed)
- ~~any snake_case clinical token~~ (snake_case highlighting has been removed)

Remaining issue: `UNIT_HIGHLIGHT_REGEX` matches any number + medical unit globally — not narrowed to only Tier 1 clinically decisive measurements. The renderer is also `scope`-blind: `policy_reasoning` and `clinical_reasoning` lines receive identical highlight treatment.

### 3. Current line sentiment is backend-owned but still heuristic

~~Current implementation now lives in backend:~~

~~- `backend/src/services/text_annotations.py`~~

~~It is:~~

~~- deterministic~~
~~- keyword-based~~
~~- non-LLM~~

**Updated state:**

- LLM-based annotation is live via `AnnotateReasoningLines` (BAML function, Agent 2c)
- `text_annotations.py` now serves as the **deterministic fallback only** — called when `AnnotateReasoningLines` fails or for policy_reasoning lines
- Both paths emit `{ text, scope, sentiment, highlight_terms }` — the shape is consistent

### 4. Patient Consultation Guide content is still too verbose and uneven

~~Current BAML structure is split across:~~

~~- `WriteNarrative`~~
~~- `MatchPolicy`~~

**Updated state:**

The restructuring is complete. `WriteNarrative` now returns `NarrativeScript` (`summary_headline`, `top_findings`, `next_actions`) and `MatchPolicy` now returns `PolicyMatchResult` with a nested `PolicyScript` (`program_justification`, `priority_add_ons`). The old monolithic `MatchAndCompose` has been tombstoned (commented out).

The frontend renders new fields with graceful degradation to old field names for backwards compatibility.

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

### Architecture note: `scope` is set by Python, not the LLM

The plan originally proposed that `scope` be a field on the BAML `ReasoningLineAnnotation` output. In practice, `scope` is added by `clinical.py` in Python after receiving the BAML result — `"clinical_reasoning"` for LLM-annotated lines and `"policy_reasoning"` for policy lines processed via fallback. This is intentionally cleaner: the LLM does not need to know about structural routing. The `AnnotateReasoningLines` BAML function only returns `{ text, sentiment, highlight_terms }`.

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

### Known bugs (to fix in remaining work)

**Bug A — Hardcoded `"informational"` sentiment**

In `RecommendationPanel.tsx` (~line 1055), the Policy Reasoning render block calls:

```tsx
renderHighlightedText(line.text, "informational", line.highlight_terms)
```

It should read `line.sentiment` dynamically, consistent with how Clinical Logic renders:

```tsx
renderHighlightedText(line.text, line.sentiment, line.highlight_terms)
```

**Bug B — Policy Reasoning silently disappears on the fallback path**

When `reasoning_trace_annotated` is absent, the fallback path assigns all lines `scope: "clinical_reasoning"`. The Policy Reasoning section therefore renders nothing. The fix is to apply the old regex split (`/^policy reasoning\s*:/i`) on the fallback path and assign those lines `scope: "policy_reasoning"`.

## B. Purge phase-level regex rules to only meaningful highlights

### Goal

Reduce visual noise and prevent over-highlighting. The remaining work is specifically:

1. Narrow `UNIT_HIGHLIGHT_REGEX` in `recommendationTextFormatting.tsx` to match only Tier 1 clinically decisive measurement patterns (not any number + any medical unit)
2. Add `scope` awareness to `renderHighlightedText` so Policy Reasoning lines receive calmer, less emphatic highlighting than Clinical Logic lines
3. Expand `MEANINGFUL_DISPLAY_TERMS` (currently 13 terms) to be more complete per the Tier 2 vocabulary defined below

### Planned rule changes

1. ~~Replace "highlight all snake_case clinical tokens" with a narrower allowlist-driven approach~~ (done — snake_case highlighting removed, dictionary gated by `MEANINGFUL_DISPLAY_TERMS`)
2. Keep measurement highlighting, but only for medically meaningful units and composite values — **`UNIT_HIGHLIGHT_REGEX` still needs narrowing**
3. ~~Restrict dictionary highlighting to curated, user-facing concepts~~ (done — `MEANINGFUL_DISPLAY_TERMS` gates the dictionary)
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

- refine the shared frontend formatter module (`recommendationTextFormatting.tsx`)
- add a `scope` parameter to `renderHighlightedText` and use it to conditionally skip or soften highlight tiers for `policy_reasoning`

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

### Implementation (complete)

1. `AnnotateReasoningLines` BAML function added in `recommendation_output.baml`
2. Fed `clinical_summary_bullets` from Agent 1's `ClinicalRiskProfile`
3. Runs in 3-way `asyncio.gather(MatchPolicy, WriteNarrative, AnnotateReasoningLines)` in `clinical.py`
4. Results flow through `_map_final_to_ai_output` → `reasoning_trace_annotated` in API response
5. Deterministic fallback in `text_annotations.py::annotate_reasoning_lines_fallback()` is active on failure

### Backend output shape

```
{ text, scope, sentiment, highlight_terms }
```

Where:

- `scope` — `"clinical_reasoning"` or `"policy_reasoning"` (added by Python in `clinical.py`, not by the LLM)
- `sentiment` — `"risk"`, `"reassuring"`, `"neutral"`, or `"informational"`
- `highlight_terms` — LLM-populated on success; always `[]` on fallback

### Latency safeguards

1. Parallelize with existing Agent 2 fan-out ✅
2. Put strict timeout budget on the annotation call (TODO — not yet confirmed in code)
3. Fallback to deterministic or neutral annotations on failure ✅
4. Avoid re-calling the LLM per line; send line batch as one annotation task ✅

## D. Revisit BAML instructions and schema for Patient Consultation Guide

### Goal

Produce fewer words, more predictable section shapes, and clearer frontend rendering contracts.

### Implementation (complete)

The schema has been decomposed into two parallel agents:

| Old (`MatchAndCompose`) | New |
|---|---|
| `CommunicationScript.health_summary` | `NarrativeScript.summary_headline` + `top_findings` (Agent 2b) |
| `CommunicationScript.next_steps` | `NarrativeScript.next_actions` (Agent 2b) |
| `CommunicationScript.program_justification` | `PolicyScript.program_justification` (Agent 2a) |
| `CommunicationScript.priority_add_ons` | `PolicyScript.priority_add_ons` (Agent 2a) |

`_map_communication_script()` in `contracts.py` adds backwards-compat aliases so old API consumers still work.

### Target output style (still applies as prompt constraints)

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
- ~~likely a new backend annotation helper/module~~ (not needed — annotation logic distributed across BAML, `clinical.py`, and `text_annotations.py`)

### BAML

- `POC/v5/baml_src/clinical/recommendation_output.baml`
- `POC/v5/baml_src/clinical/README.md` — stale, needs updating
- possibly generated/related BAML client artifacts if regeneration is required

### Frontend

- `POC/v5/frontend/src/components/dashboard/RecommendationPanel.tsx`
- `POC/v5/frontend/src/shared/recommendationTextFormatting.tsx`
- `POC/v5/frontend/src/types/recommendation.ts`

## Phased Execution Plan

### Phase 1 — Annotation model redesign ✅ DONE

1. ✅ Defined new structured annotation shape: `{ text, scope, sentiment, highlight_terms }`
2. ✅ Added scope-aware backend annotation contract (`text_annotations.py`)
3. ✅ Preserved deterministic fallback path

### Phase 2 — Parallel LLM sentiment ✅ DONE

1. ✅ Added `AnnotateReasoningLines` BAML function and `ReasoningLineAnnotation` class
2. ✅ Runs in parallel with `MatchPolicy` + `WriteNarrative` via 3-way `asyncio.gather`
3. ✅ Results threaded through `clinical.py` → `contracts.py` → `reasoning_trace_annotated`

### Phase 3 — Highlight-rule narrowing ⚠️ PARTIALLY DONE

What is done:
- ✅ Removed snake_case token highlighting
- ✅ Dictionary highlighting gated behind `MEANINGFUL_DISPLAY_TERMS` (13-term curated allowlist)
- ✅ Per-line `highlight_terms` from LLM applied with longest-match priority

Remaining work:
1. Narrow `UNIT_HIGHLIGHT_REGEX` to Tier 1 measurement patterns only (currently still broad: any `\d+` + medical unit)
2. Add a `scope` parameter to `renderHighlightedText` in `recommendationTextFormatting.tsx` — use it to skip or reduce highlight aggressiveness for `policy_reasoning` lines
3. Expand `MEANINGFUL_DISPLAY_TERMS` if the curated vocabulary needs more entries

### Phase 4 — Policy Reasoning integration ⚠️ PARTIALLY DONE

What is done:
- ✅ Policy lines separated from clinical lines via `scope === "policy_reasoning"` filter
- ✅ `line.highlight_terms` passed correctly to the renderer

Remaining work:
1. **Fix Bug A**: Change hardcoded `"informational"` to `line.sentiment` in `RecommendationPanel.tsx` (~line 1055)
2. **Fix Bug B**: On the fallback path (lines 658–669), apply the old regex split (`/^policy reasoning\s*:/i`) and assign those lines `scope: "policy_reasoning"` so the section doesn't silently disappear

### Phase 5 — Consultation schema and prompt rework ✅ SUBSTANTIALLY DONE

1. ✅ BAML prompt instructions tightened; `NarrativeScript` and `PolicyScript` defined with compact fields
2. ✅ Compact public consultation schema in place
3. ✅ Frontend rendering uses new structured fields with backwards-compat fallbacks

Minor remaining cleanup:
- Type `ReasoningLineAnnotation.sentiment` as a BAML enum instead of unconstrained `string` (in `recommendation_output.baml`)
- Update `baml_src/clinical/README.md` — still references `GenerateRecommendation` (a function that no longer exists)
- Remove duplicate `AnnotatedReasoningLine` interface from `recommendationTextFormatting.tsx` and import it from `types/recommendation.ts` instead

### Phase 6 — Verification ❌ NOT DONE

1. Confirm no new sequential latency regression in workflow path
2. Confirm evidence and policy blocks both use structured annotation inputs
3. Confirm only meaningful tokens are highlighted
4. Confirm `Patient Consultation Guide` becomes shorter and more consistent
5. Confirm fallback behavior still works when annotation LLM fails

Test gaps to close:
- `RecommendationPanel.test.tsx`: all existing fixtures use `reasoning_trace: string` fallback path — zero coverage for `reasoning_trace_annotated`
- Add fixtures that test: `scope` filtering, per-line `sentiment` visual treatment, `highlight_terms` passthrough, new `CommunicationScript` fields (`summary_headline`, `top_findings`, etc.)

## Expected Outcome

After all remaining work is complete:

- `Policy Reasoning` will no longer be an annotation outlier — uses `line.sentiment` dynamically, visible on both LLM and fallback paths
- highlight rules will emphasize only clinically or decision-relevant content — `UNIT_HIGHLIGHT_REGEX` narrowed, scope-aware rendering in place
- line-level sentiment is LLM-based and parallelized — no sequential latency added
- `Patient Consultation Guide` is shorter, more uniform, and easier to render reliably
