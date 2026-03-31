# Discovery

Status: Complete

## Findings

1. No deterministic post-BAML checks existed for V2, V7, V9, V10 in recommendation route flow.
2. Existing graceful fallback behavior was AI-exception-driven; validator-failure-triggered fallback was missing.
3. Rule evaluation inputs were available in route scope (`ruleset`, `clinical_signals`, `ai_output`) and could be enforced without contract schema expansion.
