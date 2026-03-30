# Solution

## Decisions

- Target only `POC/v2`.
- Keep a single canonical monitoring route: `/access-monitoring`.
- Keep `/audit` only as a canonical redirect path to `/access-monitoring`.
- In privacy mode, prioritize backend-derived token values and remove placeholder literals.

## Approach

1. Remove duplicate Governance nav item from sidebar.
2. Canonicalize `/audit` by redirecting to `/access-monitoring`.
3. Refactor dashboard PII display resolver:
   - Use `security_metadata.rehydration_map` reverse lookup first.
   - Fall back to backend `patient_token` instead of static `tok_*_entity`.
4. Refactor recommendation package/value privacy display:
   - Use `security_metadata.masked_ai_output` package/value when present.
   - Fall back to backend `patient_token`.
5. Update tests to lock behavior and prevent regression.
