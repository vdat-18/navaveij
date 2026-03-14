# Checkpoint — Recommendation Engine v3

**Last updated:** 2026-03-13
**Reference patient:** Somchai W., 54yo male (`patient_token: tok_hmac_56291047`)

---

## Documents Produced (in order)

| # | File | Status | Summary |
|---|------|--------|---------|
| 1 | `very-high-level.md` | ✅ Done | 6-block Mermaid diagram: Hospital Networks → Data Pipeline → Data Stores → Recommendation Platform → Output Layer → Feedback Store |
| 2 | `high-level.md` | ✅ Done | Detailed Mermaid LR flowchart with all components, subgraphs, color legend, architectural separation of concerns table, MCP tool→requirement mapping |
| 3 | `component-inventory-solution-approach.md` | ✅ Done | 12-component inventory table (role / inputs / outputs / tech / TOR criterion) + 7 solution approach sections (Hybrid Engine, MCP ReAct loop, PII Masking, Pluggable AI, XAI output schema, Safety Validator, Audit Logger) + query-time data flow narrative + requirement coverage matrix |
| 4 | `data/navavej-checkup-package-discovery.md` | ✅ Done | Hospital research: 8 core package tiers (Basic → Diamond), itemized Basic (16) and Diamond Women (47) packages, 12-section add-on program catalog with prices and TOR triggers, tier resolution table, add-on trigger cross-reference, gender/age hard constraints, 10 open questions for client |
| 5 | `data/fhir-discovery-report.md` | ✅ Done | 13 FHIR R4 resources inventoried with example payloads; full signal→FHIR path→LOINC/CPT/CVX mapping table; key LOINC codes reference; 8 gaps + mitigations; DE pipeline implications (extraction queries, derived computations, update frequency, data quality, patient token de-identification) |
| 6 | `data/clinical-guidelines-reference.md` | ✅ Done | 13 sections covering lab reference ranges (FBS, HbA1c, lipids, liver enzymes, eGFR, TSH, PSA, uric acid), BP classification (ACC/AHA 2017), BMI (WHO/Asia-Pacific), cancer screening intervals (mammogram, cervical, colorectal, lung, DEXA, HCC), ASCVD risk + EST indications, diabetes follow-up, kidney monitoring, liver disease, vaccination schedules (influenza, HepB, HPV, pneumococcal, zoster), smoking/lung, occupational/lifestyle, echocardiogram, sleep apnea (STOP-BANG); consolidated signal processing rules appendix |
| 7 | `signal-store-contract.md` | ✅ Done | 3 MCP tool specs: `get_hard_constraints`, `get_clinical_signals`, `get_biomarker_trends` — each with purpose, full JSON example response (Somchai W.), JSON Schema, and field dictionary; Signal Store DB record structure; Confidence Calibrator formula with Somchai example computation (score: 0.823 → High); complete signal ID catalog (40 signals) |
| 8 | `ruleset-store-contract.md` | ✅ Done | `get_program_ruleset` MCP tool spec — 4 tier selection rules (PREMIUM_SEVERE_SINGLE, PREMIUM_MULTI_SIGNAL, ADVANCED_METABOLIC_OR_CVD, STANDARD_DEFAULT) with full JSON example (Somchai W.); package resolution map (Standard/Advanced/Premium × male/female × age bands); 24 add-on items with trigger signals, priority defaults, Navavej product metadata, gender/age constraints, admin-configurable fields; JSON Schema; field dictionary; Ruleset Store DB schema (2 record types); admin configurability guide; BAML connection diagram; worked tier resolution example |
| 9 | `samples/rule-synthesis-framework.md` | ✅ Done | Methodology for translating clinical guidelines into Ruleset Store records; derivation ledger for all 28 add-on items; validation checklist |
| 10 | `samples/medical-expert-review.md` | ✅ Done | Non-technical plain-language version of the ruleset for physician review; all clinical logic in plain language without technical syntax |
| 11 | `samples/sample_ruleset_tier_config.json` | ✅ Done | Machine-readable Ruleset Store DB record: 4 tier selection rules in JSON |
| 12 | `samples/sample_add_on_items.json` | ✅ Done | Machine-readable Ruleset Store DB records: all 28 add-on items in JSON |
| 13 | `samples/sample_patient_checkup.json` | ✅ Done | Reference patient input record (Somchai W.) in normalized FHIR-derived format |
| 14 | `recommendation-output-schema.md` | ✅ Done | Framework-agnostic output schema: enums (Tier, PriorityLevel, ConfidenceTier, RecommendationSource, AddOnCategory), 8 sub-types, main RecommendationOutput type with [AI]/[SYS]/[ENRICH] field annotations; 10 validation rules; field responsibility matrix; complete worked example Stage 1 (AI output) + Stage 2 (enriched); BAML conversion notes |

---

## What the AI Emits (Stage 1 — BAML scope)

```
RecommendationOutput (Stage 1)
  ai_recommended_tier               Tier enum
  tier_deviation_justification?     string | null
  add_ons[]                         AddOnItem[]
  reasoning_trace                   string
  supporting_signals[]              string[]
  missing_signals[]                 string[]
  communication_script              CommunicationScript

AddOnItem (AI core)
  item_code                         string
  priority_level                    PriorityLevel enum
  rationale                         string

CommunicationScript
  opening                           string
  health_summary                    string
  recommendation_explanation        string
  add_on_highlights[]               string[]
  next_steps                        string
```

## What the System Injects (Stage 2 — backend only)

```
rule_preliminary_tier               from Signal Store
resolved_package                    from Ruleset Store package_resolution_map
confidence_score                    Confidence Calibrator (formula in component-inventory §2.5)
confidence_tier                     derived from score (High ≥0.75, Medium ≥0.50, Low <0.50)
review_required                     Graceful Degradation flag
recommendation_source               "AI" | "RuleBased"
patient_high_alert                  critical_signals[] + missing_data_alerts[]
metadata                            request_id, model_id, template_version, etc.
add_ons[].label                     Ruleset Store enrichment
add_ons[].category                  Ruleset Store enrichment
add_ons[].navavej_product           Ruleset Store enrichment
add_ons[].trigger_signals_matched[] intersection of trigger_signals ∩ signals_fired
```

---

## Key Design Decisions (settled)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Priority levels | 4: Red / Orange / Yellow / Green | Consistent with Ruleset Store contract; Orange needed for vaccination gaps |
| Confidence score | Computed by system, not AI | AI self-reported confidence is miscalibrated |
| Communication script | AI-generated, structured sections | Ensures hospital-standard consistency; not free-form |
| Patient High Alert | System-computed post-AI | Deterministic from Signal Store; dashboard renders directly |
| BAML scope | Stage 1 only (AI output) | Stage 2 types are backend-only; no BAML needed |
| Tier deviation | Requires explicit justification | Mandatory non-null string when AI deviates from rule tier |

---

## Next Steps

| Priority | Task |
|----------|------|
| 🔜 Next | `recommendation-output.baml` — BAML schema file (Stage 1 AI output only) |
| After | UI mockup screens (POC requirement: min 3 screens) |
| After | POC presentation deck / architecture walkthrough document |

---

## Open Questions (unresolved — from client)

| ID | Question | Impact |
|----|----------|--------|
| OQ-7 | Standalone colonoscopy program? | Ruleset Store `colonoscopy` item currently mapped to Upper GI Endoscopy package |
| OQ-10 | Standalone PSA test product code + price? | `psa_sdm` item has `price_thb: null` |
| OQ-HepB | Hepatitis B vaccine per-dose price? | `hepatitis_b_vaccine` item has `price_thb: null` |
| OQ-Pneumo | Pneumococcal vaccine product code + price? | `pneumococcal_vaccine` item has `price_thb: null` |
| OQ-Shingrix | Shingrix per-dose price? | `shingrix_vaccine` item has `price_thb: null` |
| OQ-Prices | Post-Expo standard prices? | All current prices are 5th Anniversary Expo promotional rates (expired 2026-03-31) |
| OQ-HIS | HIS system in use? | Determines FHIR export capability and local code mapping effort |
| OQ-PackageItems | Full itemization of Gold, Platinum (M/F), Diamond Men packages? | Needed for duplicate-test deduplication logic |
