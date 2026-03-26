# MIG-7 Execution Plan — Synthesis Enrichment Migration

**Date:** 2026-03-19  
**Scope:**  
- `POC/v2/baml_src/synthesis/enrichment.baml`  
- `POC/v2/scripts/enrich_healthy_scenarios.py`  
- `POC/v2/scripts/enrich_hypertension_scenarios.py`  
- `POC/v2/scripts/enrich_metabolic_scenarios.py`  
- `POC/v2/scripts/enrich_senior_scenarios.py`  
- `POC/v2/_project_management/v3-Migration/implementation/MIG-7-synthesis/README.md`  
- `POC/v2/_project_management/v3-Migration/implementation/MIG-7-synthesis/_development_summary.md`  
- `POC/v2/_project_management/v3-Migration/implementation/MIG-7-synthesis/_discovery.md`  
- `POC/v2/_project_management/v3-Migration/implementation/MIG-7-synthesis/_lastest_test_results.md`  
**Status:** Planned

## Goal

Port v3 synthesis enrichment assets into v2 so v2 can generate richer synthetic patient records using the new enrichment BAML function and scenario scripts.

## Confirmed Baseline

1. MIG-7 is documented as independent and can be executed without waiting for other MIGs.
2. v3 already contains the source assets under `baml_src/synthesis` and `scripts/`.
3. v2 currently does not contain the MIG-7 target enrichment assets.
4. Acceptance requires BAML generation success and script importability, with optional script-run output validation.

## Migration Options

1. **Option A (Recommended): Exact File Port with Minimal Adaptation**
   - Copy `enrichment.baml` and all four enrichment scripts from v3 to v2.
   - Keep behavior aligned with v3 and limit edits to path/import compatibility only if needed.
   - Verify through generation and import checks.

2. **Option B: Partial Port (BAML Only First)**
   - Port only `enrichment.baml`, defer scripts to a follow-up.
   - Reduces immediate surface area but leaves MIG-7 incomplete against acceptance gate.

## Planned Implementation Choice

Use **Option A** to meet MIG-7 acceptance in one pass and keep v2/v3 synthesis parity.

## In-Scope Changes

1. Create `POC/v2/baml_src/synthesis/enrichment.baml` from v3 source.
2. Create all four v2 enrichment scripts from v3 source.
3. Adjust only strictly necessary path/import differences for v2 runtime conventions.
4. Execute verification:
   - BAML generation command.
   - Script import checks.
   - Optional single-script run to verify generated output path.
5. Update MIG-7 artifact files with concrete implementation and test evidence.

## Non-Goals for MIG-7

- No changes to recommendation orchestration, contracts, or frontend UI.
- No schema redesign of existing synthesis types beyond copied enrichment assets.
- No migration of unrelated v3 synthesis utilities outside listed MIG-7 files.

## Implementation Steps

1. Compare v3 source files against v2 structure and confirm target placement.
2. Copy `enrichment.baml` into `POC/v2/baml_src/synthesis/`.
3. Copy four enrichment scripts into `POC/v2/scripts/`.
4. Resolve any v2-specific import/path mismatches if encountered.
5. Run BAML generation for v2.
6. Run import smoke checks for each enrichment script.
7. Optionally execute one enrichment script and verify output artifacts.
8. Update MIG-7 README/discovery/development summary/test results.

## Acceptance Gates

1. `POC/v2/baml_src/synthesis/enrichment.baml` exists and is valid for generation.
2. All four enrichment scripts exist under `POC/v2/scripts/`.
3. `uv run baml-cli generate` succeeds from v2 context.
4. Enrichment scripts import successfully from v2 environment.
5. MIG-7 artifact docs reflect completed implementation and verification evidence.

## Risks and Mitigations

1. **Risk:** v3 script imports assume paths not present in v2.  
   **Mitigation:** apply minimal, localized import adjustments without altering behavior.
2. **Risk:** generation/import tooling unavailable in runtime.  
   **Mitigation:** capture command outputs and document exact blocker, then complete source-level parity evidence.
3. **Risk:** output directories differ between environments.  
   **Mitigation:** treat script-run output check as optional gate and document actual output location.

## Verification Plan

1. Run `uv run baml-cli generate` in `POC/v2`.
2. Run import checks:
   - `uv run python -c "import scripts.enrich_healthy_scenarios"`
   - `uv run python -c "import scripts.enrich_hypertension_scenarios"`
   - `uv run python -c "import scripts.enrich_metabolic_scenarios"`
   - `uv run python -c "import scripts.enrich_senior_scenarios"`
3. Optional run:
   - execute one enrichment script and verify output records under synthesis generated assets.
4. Record all verification outcomes in `_lastest_test_results.md`.

## Exit Evidence to Capture

- Diff showing five new MIG-7 files in v2 (`enrichment.baml` + four scripts).
- Generation command output for v2.
- Import smoke results for all enrichment scripts.
- Updated MIG-7 artifact files:
  - `README.md`
  - `_discovery.md`
  - `_development_summary.md`
  - `_lastest_test_results.md`
