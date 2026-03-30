# Development Summary — Recommendation Ruleset Reliability

**Workstream:** 11
**Date:** 2026-03-30
**State:** Planning / investigation complete

---

## Summary

No production code changes have been implemented yet.

This workstream currently contains:
- the issue context and root-cause write-up in `README.md`
- the implementation sequence in `plan.md`
- the detailed investigation record in `_discover.md`
- the current verification snapshot in `_latest_test_results.md`

The investigation deliberately stopped before applying a narrow fix because the issue spans:
- deployment artifact completeness
- backend runtime resolution
- data-contract semantics
- frontend degraded-state rendering
- test coverage gaps

---

## Work Completed

### Phase 1 — End-to-end investigation

Audited the full path used by the dashboard:
- frontend service call to `/api/recommend`
- contract route normalization
- MCP ruleset loader
- package resolution helper
- dashboard package label and price rendering

### Phase 2 — Root-cause isolation

Confirmed that the production `Unknown Plan` symptom is caused by missing ruleset artifacts in the V6 deployment bundle, not by a standalone frontend bug.

Also identified a second backend defect:
- standard-tier package age-band matching is incorrect in `resolve_package()`

### Phase 3 — Adjacent reliability risks

Identified two important neighboring issues:
- V6 tests still read some ruleset data from `POC/v3`
- several MCP tools use the wrong patient token/id resolution direction

### Phase 4 — Implementation plan

Prepared a staged plan that keeps the fix cohesive:
1. bundle missing V6 ruleset assets
2. remove hidden V6-to-v3 runtime/test coupling
3. fix resolver age-band semantics
4. make package-resolution degradation explicit in the API
5. replace UI silent fallbacks with an intentional degraded state
6. lock the chain down with regression tests

---

## What Was Not Done

- no backend code changes
- no frontend code changes
- no tests were added or modified
- no deployment scripts were changed
- no asset files were added yet

Any earlier exploratory edits made during investigation were reverted before this issue pack was finalized.

---

## Known Verification Constraint

Local full-route import currently hits a BAML environment mismatch:
- generated client version: `0.220.0`
- installed `baml-py`: `0.213.0`

This does not invalidate the root-cause analysis, but it must be resolved or documented when implementation verification begins.
