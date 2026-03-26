# Solution: Backend Annotations + Shared Formatting Rules

## Architecture Principle

Treat sentiment and formatting as **cross-cutting presentation rules** that should not be embedded in a single UI screen.

- Backend produces authoritative **evidence-line sentiment annotations**
- Frontend remains responsible for rendering, and uses a shared formatter for inline highlights

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Evidence sentiment ownership | Backend | Single canonical output; aligns with parallelizable backend design |
| Evidence sentiment tech | LLM (`AnnotateReasoningLines`) with deterministic fallback | LLM gives semantic quality; fallback in `text_annotations.py` preserves fast/safe path |
| Annotation shape | `{ text, scope, sentiment, highlight_terms }` | `scope` enables scope-aware rendering; `highlight_terms` lets LLM guide precise chips |
| `scope` assignment | Python (not LLM) | LLM does not need structural routing knowledge; cleaner separation |
| `sentiment` type | BAML enum `LineSentiment` with `@alias` | Type-safe on BAML side; wire values stay lowercase to match TypeScript union |
| Policy Reasoning sentiment | Read from `line.sentiment` | Was hardcoded `"informational"` — now driven by actual annotation |
| Fallback scope assignment | Split on `Policy reasoning:` prefix | Preserves Policy Reasoning section visibility when LLM path is unavailable |
| Regex rule storage | Shared frontend formatter module | Removes bloat from `RecommendationPanel` and makes rules reusable |
| `UNIT_HIGHLIGHT_REGEX` scope | BP composites + `%` only | `mg/dL`, `mL/min`, `/1.73 m²` are too noisy to auto-highlight; delegate to `highlight_terms` |
| Named-phrase highlighting | `HIGHLIGHT_PHRASES_REGEX` (alternation, longest-first) | Directly matches human-readable LLM prose without going through the dictionary |
| Dictionary substitution guard | Only snake_case keys (`key.includes("_")`) | Prevents abbreviating readable prose (e.g. `Stage 1 Hypertension` → `Stage 1 HTN`) |
| Policy scope highlight | Skip unit regex, still apply phrase list | Policy text is program logic — unit chips are noisy there; named concepts still relevant |
| Typography for chip-heavy text | Use `text-left` | Avoids `text-justify` artifacts with `inline-flex` chips |

## Highlight Pipeline (in `renderHighlightedText`)

```
1. LLM-supplied highlight_terms  (explicit per-line, longest-first)
2. UNIT_HIGHLIGHT_REGEX           (BP composites + % — skipped for policy_reasoning scope)
3. HIGHLIGHT_PHRASES_REGEX        (curated human-readable clinical names — case-insensitive)
4. CLINICAL_DICTIONARY (snake_case keys only) → MEANINGFUL_DISPLAY_TERMS gate
```

## Resulting Data Flow

```
AnalyzeClinicalRisks
  └─ asyncio.gather:
       ├─ MatchPolicy       → PolicyScript (program_justification, priority_add_ons)
       ├─ WriteNarrative     → NarrativeScript (summary_headline, top_findings, next_actions)
       └─ AnnotateReasoningLines → ReasoningLineAnnotation[] (text, sentiment, highlight_terms)
                                   ↓ Python adds scope field
                                   reasoning_trace_annotated in API response
                                   ↓
                          frontend renderHighlightedText (4-step pipeline)
```

## Public Contract

Backend response shape:

```typescript
reasoning_trace_annotated: Array<{
  text: string;
  scope: "clinical_reasoning" | "policy_reasoning";
  sentiment: "risk" | "reassuring" | "neutral" | "informational";
  highlight_terms: string[];
}>
```

Frontend consumes it when present; falls back to raw `reasoning_trace` string parsing when absent.
