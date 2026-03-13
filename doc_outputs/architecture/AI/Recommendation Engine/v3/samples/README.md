# Samples — Recommendation Engine v3

This folder contains sample data files used for testing, validation, and clinical review of the AI Recommendation Engine.

---

## Files

| File | Format | Audience | Purpose |
|---|---|---|---|
| `sample_patient_checkup.json` | JSON | Engineers | Sample patient input record (Somchai W., 54yo male) in normalized FHIR-derived format. Used as the reference patient throughout all system documentation. |
| `rule-synthesis-framework.md` | Markdown | Clinical + Engineering | Methodology document explaining how clinical guidelines are translated into Ruleset Store records. Includes the full derivation ledger for all 28 add-on items and the validation checklist. Read this before editing any rule files. |
| `sample_ruleset_tier_config.json` | JSON | Engineers | Machine-readable Ruleset Store DB record defining the 4 tier selection rules (Premium / Advanced / Standard). Used for MCP Server and Inference Orchestrator integration testing. |
| `sample_add_on_items.json` | JSON | Engineers | Machine-readable Ruleset Store DB records for all 28 add-on examination items. Used for add-on library integration testing and MCP `get_program_ruleset` response validation. |
| `medical-expert-review.md` | Markdown | Physician / Clinical Expert | **Non-technical plain-language version of the ruleset for medical review.** Contains the same clinical logic as the JSON files, written without technical syntax. Intended to be converted to PDF and sent to a physician for feedback. |

---

## How the Files Relate

```
sample_patient_checkup.json     ← reference patient (Somchai W.)
        │
        ▼
rule-synthesis-framework.md     ← methodology + derivation ledger
        │
        ├── sample_ruleset_tier_config.json    ← machine-readable (engineers)
        ├── sample_add_on_items.json           ← machine-readable (engineers)
        └── medical-expert-review.md          ← human-readable (physician)
```

---

## For Engineers

Start with `rule-synthesis-framework.md` (§8 Validation Checklist) before running integration tests. The JSON files are draft (`status: "draft"`) and must not be promoted to `status: "active"` until the Medical Acceptance Test (MAT) is complete (TOR §6.2).

## For the Medical Expert

Read `medical-expert-review.md` only. All questions requiring clinical judgment are consolidated there. No technical background is needed.

---

## Open Questions Requiring Client Confirmation

Before production deployment, the following product-level items must be confirmed with Navavej:

| # | Item | Details |
|---|---|---|
| OQ-7 | Standalone Colonoscopy | Confirm whether a standalone lower-GI colonoscopy program exists (separate from the upper GI endoscopy package) |
| OQ-10 | Standalone PSA Test | Confirm product code and price for PSA as a standalone test |
| OQ-HepB | Hepatitis B Vaccine price | Confirm per-dose price |
| OQ-Pneumo | Pneumococcal Vaccine | Confirm product code and price (PCV20 vs PCV15 + PPSV23) |
| OQ-Shingrix | Shingrix (RZV) price | Confirm per-dose price |
| OQ-Prices | Post-Expo pricing | All current prices reflect 5th Anniversary Expo promotional rates (valid through 2026-03-31). Update to standard prices after expiry. |
