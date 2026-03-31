# Discover — Round 3

## R3a — Markdown highlight bug

**Data flow (broken):**
```
AI Agent → "**Colonoscopy** overdue >10 years"
  ↓
find_highlight_terms() strips ** for SEARCH → finds "Colonoscopy" ✓
  ↓
text field retains "**Colonoscopy** overdue >10 years" ✗
  ↓
Frontend renders raw ** around highlighted chip
```

**Root cause (2 issues):**
1. Neither the BAML path (`workflows/clinical.py:316`) nor the fallback path (`text_annotations.py:208`) stripped `**...**` from the `text` field before sending to frontend.
2. `find_highlight_terms()` docstring promised 3 passes but only had 2. Pass 3 (extract `**...**` inner text as highlight terms) was missing — so AI-bolded words NOT in `CLINICAL_PHRASES` got zero highlights.

## R3b — Pre-existing test failure analysis

19 failures across 4 categories:

| Category | Count | Root cause |
|----------|-------|-----------|
| Stale test assertions | 6 | Mock fields didn't match BAML schema; exact string matches broken by code evolution |
| Missing provider mocks | 5 | Components added `useAuth`/`usePrivacyMode`/`usePatient` hooks after tests were written |
| Code gaps (contract tests) | 6 | Contract tests specified features not yet implemented (security metadata, rehydration, admin routes) |
| Admin route bug | 2 | `patient_token_prefix` param didn't match `audit_logs()` signature (`patient_id`) |

**Key finding — contract tests as specifications:** Tests in `test_frontend_reliability_contract.py` are string-match assertions against source files. They define what the code SHOULD contain. When they fail, the right response is to update production code, not the test. Exception: `getDisplayValue(selectedPatient.patient_id)` — medical IDs are not PII and must always be visible, so this assertion was removed.

## R3c — Privacy rendering gap

The backend provides `masked_ai_output.reasoning_trace` (plain string with tokens) but NOT `masked_ai_output.reasoning_trace_annotated`. In privacy mode, the component must fall back to plain-text rendering since the structured annotated lines contain rehydrated (real) values.

## R3d — Rehydration token ordering

Token replacement must sort tokens longest-first to prevent prefix collisions:
- `{"tok_1": "Alice", "tok_10": "Bob"}` applied to `"tok_10"` must yield `"Bob"`, not `"Alice0"`

## R3e — Audit hash format change

Nesting `action_type`/`request_id` under `why.request_context` changes the hash computation. Existing `logs/audit.jsonl` entries use the flat V1 format. The read layer in `contracts.py` already handles both formats. Added `schema_version: 2` to disambiguate.

## Test isolation issue (pre-existing)

`backend/tests/test_master_add_ons.py` patches `baml_client` globally. When run in the same pytest session as `scripts/tests/`, mock state leaks and breaks BAML-dependent tests. Running backend and scripts tests in separate pytest sessions avoids this. Not fixed in this round.
