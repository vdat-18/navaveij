# Solution: Backend Annotations + Shared Formatting Rules

## Architecture Principle

All **rules** (what to highlight, how to classify severity, what to split) live in the backend. The frontend is a **dumb renderer**: it receives explicit `highlight_terms` arrays per text field and applies them to positions in the string. No matching logic runs in the FE.

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Evidence sentiment ownership | Backend | Single canonical output; aligns with parallelizable backend design |
| Evidence sentiment tech | LLM (`AnnotateReasoningLines`) with deterministic fallback | LLM gives semantic quality; fallback in `text_annotations.py` preserves fast/safe path |
| Annotation shape | `{ text, scope, sentiment, highlight_terms }` | `scope` enables section routing; `highlight_terms` lets BE guide precise chips |
| `scope` assignment | Python (not LLM) | LLM does not need structural routing knowledge |
| `sentiment` type | BAML enum `LineSentiment` with `@alias` | Type-safe on BAML side; wire values stay lowercase to match TypeScript union |
| `highlight_terms` completeness | Comprehensive (all meaningful spans) | Not "1-3 selective" — BE is authoritative; FE drops its own phrase matching |
| Fallback `highlight_terms` | Python `CLINICAL_PHRASES` + `_BP_UNIT_REGEX` in `text_annotations.py` | `highlight_terms: []` was never acceptable — fallback path now matches too |
| `priority_add_ons` shape | `{ label, severity }[]` instead of `string[]` | Moves string suffix parsing (`"Label (Red)"`) out of FE; FE just maps severity→CSS |
| `top_findings` / `next_actions` shape | `{ text, highlight_terms }[]` instead of `string[]` | FE renders chips from supplied terms; no phrase matching needed in FE |
| `splitConsultationSentences` | Retired — BE always returns arrays | Eliminates fragile sentence splitting from FE |
| `reasoning_trace` string fallback | Retired — `reasoning_trace_annotated` always present | Even on full LLM failure, Python fallback annotates with phrases populated |
| Legacy aliases | Kept in `_map_communication_script()` | Old cached API responses / old FE consumers still work |
| Severity→CSS mapping | `severityToStyles()` stays in FE | CSS is design-system-specific; only the string parsing moved |
| `parseHighlightSeverity` | String parsing removed; CSS mapping renamed `severityToStyles` | Parsing is now Python; the Tailwind logic is still FE |
| Dictionary substitution | Removed from FE | BE never sends snake_case in text fields; no substitution needed |

## Highlight Pipeline (in `renderHighlightedText`)

```
1. Strip quotes (defensive, BE already cleans)
2. Apply highlight_terms from API (collected by collectHighlightSpans)
3. Deduplicate overlapping spans (deduplicateSpans)
4. Render: plain text interleaved with sentiment-colored chips
```

The former 4-step pipeline (LLM terms → unit regex → CLINICAL_TERMS → dictionary) is now a single step: apply what the BE provided.

## Resulting Data Flow

```
AnalyzeClinicalRisks
  └─ asyncio.gather:
       ├─ MatchPolicy       → PolicyScript (program_justification, priority_add_ons: [{ label, priority }])
       ├─ WriteNarrative     → NarrativeScript (summary_headline, top_findings: string[], next_actions: string[])
       └─ AnnotateReasoningLines → ReasoningLineAnnotation[] (text, sentiment, highlight_terms)
                                   ↓ Python adds scope; enriches top_findings/next_actions with highlight_terms
                                   ↓ Python maps PriorityLevel → severity string
                                   ↓ Python parses suffix from legacy priority_add_ons strings
                                   reasoning_trace_annotated + communication_script in API response
                                   ↓
                          FE: renderHighlightedText (apply highlight_terms, render chips)
```

## Public Contract

```typescript
reasoning_trace_annotated: Array<{
  text: string;
  scope: "clinical_reasoning" | "policy_reasoning";
  sentiment: "risk" | "reassuring" | "neutral" | "informational";
  highlight_terms: string[];    // always populated (LLM or Python fallback)
}>

communication_script: {
  // Primary fields
  summary_headline: string;
  summary_headline_highlights: string[];
  top_findings: Array<{ text: string; highlight_terms: string[] }>;
  program_justification: string;
  program_justification_highlights: string[];
  priority_add_ons: Array<{ label: string; severity: "critical" | "caution" | "moderate" | "neutral" }>;
  next_actions: Array<{ text: string; highlight_terms: string[] }>;
  // Legacy aliases (backwards-compat)
  opening: string;
  health_summary: string;
  recommendation_explanation: string;
  add_on_highlights: string[];
  next_steps: string;
}
```
