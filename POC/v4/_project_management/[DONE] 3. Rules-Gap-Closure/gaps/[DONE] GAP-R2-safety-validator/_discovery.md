# Discovery

Status: Complete

## Findings

1. `get_program_ruleset` was pre-filtering add-ons by demographics, which hides candidates from AI.
2. Safety enforcement was delegated to LLM critic behavior instead of deterministic rule checks.
3. Post-AI removal and conflict event handling needed explicit orchestrator wiring before rehydration.
