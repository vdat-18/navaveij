# Solution: Backend Annotations + Shared Formatting Rules

## Architecture Principle

Treat sentiment and formatting as **cross-cutting presentation rules** that should not be embedded in a single UI screen.

- Backend produces authoritative **evidence-line sentiment annotations**
- Frontend remains responsible for rendering, and uses a shared formatter for inline highlights

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Evidence sentiment ownership | Backend | Single canonical output; aligns with parallelizable backend design |
| Evidence sentiment tech | Deterministic keyword rules (non-LLM) | Fast, testable, low-risk for POC; upgrade path exists |
| Regex rule storage | Shared frontend formatter module | Removes bloat from `RecommendationPanel` and makes rules reusable |
| Typography for chip-heavy text | Use `text-left` | Avoids `text-justify` artifacts with `inline-flex` chips |
| Measurement matching | Accept spaces around `/` and `mm Hg` | Fixes inconsistent highlighting for BP values |

## Resulting Data Flow

```
AI output (reasoning_trace) → backend normalize/annotate → reasoning_trace_annotated → frontend render
communication_script text → shared formatter rules → chip rendering
```

## Public Contract Additions

Backend response adds:

- `reasoning_trace_annotated: [{ text: string, sentiment: "good"|"bad"|"neutral" }]`

Frontend consumes it when present; falls back gracefully if absent.
