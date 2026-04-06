# Latest Test Results — Prompt Override + Runtime Versioning + Reset

**Date:** 2026-04-03

## Verification Commands

### Backend

```bash
./.venv/bin/pytest scripts/tests/test_prompt_selector_paths.py scripts/tests/test_backend_cache_ttl.py scripts/tests/test_api_contract_routes.py scripts/tests/test_health_check.py -q
```

Result:

```text
48 passed in 1.29s
```

### Frontend

```bash
npm test -- --run src/services/api.test.ts src/services/api.health-check.test.ts src/services/api.prompt-override.test.ts src/components/access-monitoring/AIConfigsTab.test.tsx
```

Result:

```text
✓ src/services/api.health-check.test.ts (1 test)
✓ src/services/api.prompt-override.test.ts (2 tests)
✓ src/services/api.test.ts (1 test)
✓ src/components/access-monitoring/AIConfigsTab.test.tsx (8 tests)

Test Files  4 passed (4)
Tests       12 passed (12)
```

## Additional Context

- Earlier red/green runs were used to confirm the new prompt override tests failed before implementation and passed after the production changes were added.
