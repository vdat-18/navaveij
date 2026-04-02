# Discovery — Scope 4: Validation Harness and Final Verification

**Status:** Open

## Starting Facts

- the current validation script depends on runtime env mutation and module re-import assumptions that do not hold.
- final sign-off requires stronger evidence than import checks and contract-only tests.

## Questions To Resolve

1. Should isolated validation use subprocess-per-client or a fresh app context helper?
2. Which clients can be exercised with real credentials in this environment?
3. What final evidence package should be attached to the top-level workstream docs?

## Exit Condition

The workstream has a credible, repeatable verification path that matches the production architecture.

