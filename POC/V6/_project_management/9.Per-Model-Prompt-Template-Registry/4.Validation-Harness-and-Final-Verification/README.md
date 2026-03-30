# Scope 4 — Validation Harness and Final Verification

**Parent Workstream:** 9.Per-Model-Prompt-Template-Registry
**Status:** Planned
**Goal:** Replace the invalid client validation method and produce approval-grade final evidence for the repaired workstream.

---

## Why This Scope Exists

The prior smoke-test story was not trustworthy because it mutated env vars inside one initialized process.

This scope closes the loop by:
- isolating per-client validation
- proving the production path rather than a mocked approximation
- assembling the final evidence package needed for sign-off

---

## Primary Deliverables

- rewritten `scripts/validate_clients.py`
- isolated validation tests
- final verification bundle
- top-level workstream docs updated from real evidence

