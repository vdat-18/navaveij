# Recommendation Output Schema (Framework-Agnostic)
## Smart Health Checkup Recommendation Dashboard — v3

**Version:** 1.0
**Date:** 2026-03-13
**Audience:** AI implementation team, backend implementation team, frontend/dashboard team
**Depends on:** `signal-store-contract.md`, `ruleset-store-contract.md`, `component-inventory-solution-approach.md`
**Next:** `recommendation-output.baml` (BAML conversion of the AI-generated portion)

---

## Overview

This document defines the complete output schema for the Recommendation Platform — the typed structure that flows from AI model output through system enrichment to the ROC Dashboard.

### Three-Agent Output Model

The final `RecommendationOutput` record is assembled through a coordinated three-agent pipeline:

```
Stage 1 — Multi-Agent AI Pipeline (BAML-enforced):

  Agent 1: Clinical Risk Analyzer
    Input: clinical_signals, biomarker_trends, hard_constraints
    Output: ClinicalRiskProfile (primary_risks, severity, suggested_tier, signals)

  Agent 2: Policy & Package Resolver
    Input: ClinicalRiskProfile, program_ruleset (catalog + rules)
    Output: RecommendationPlan (final_tier, deviation_note, add_ons, reasoning)

  Agent 3: Clinical Communicator
    Input: ClinicalRiskProfile, RecommendationPlan
    Output: CommunicationScript (conclusion, summary, explanation, highlights, steps)

Stage 2 — System injects (post-AI processing):
  rule_preliminary_tier, resolved_package, confidence_score, confidence_tier,
  review_required, recommendation_source, patient_high_alert, metadata
  + enrichment of add_ons[] with label, category, navavej_product, trigger_signals_matched
```

The BAML schema (next document) covers Stage 1 only. This document covers both stages — the complete record delivered to the Output Layer.

### Field Origin Legend

| Marker | Meaning |
|--------|---------|
| `[AI]` | The AI model must emit this field in its structured output |
| `[SYS]` | System-computed post-AI (Confidence Calibrator, Safety Validator, Graceful Degradation, Ruleset Store enrichment) |
| `[ENRICH]` | Injected by system lookup (Ruleset Store, Signal Store) — the AI does not generate it |

---

## Enums

### `Tier`
```
"Standard" | "Advanced" | "Premium"
```
Corresponds to TOR §3.2 risk-level tiers. Resolves to a specific Navavej package name via `resolved_package`.

### `PriorityLevel`
```
"Red" | "Orange" | "Yellow" | "Green"
```
Four-level urgency scale used for add-on items and screening gaps:
- **Red** — urgent; significantly overdue or high-severity clinical trigger
- **Orange** — approaching due date or moderate-priority gap
- **Yellow** — clinically indicated; routine timeline
- **Green** — consider / shared decision-making; low urgency

> **Note:** The existing architecture sketch used three levels (Red / Yellow / Green). Orange is added here for consistency with the Ruleset Store contract, which explicitly uses it for vaccination gaps (e.g. overdue influenza).

### `ConfidenceTier`
```
"High" | "Medium" | "Low"
```
Derived from `confidence_score` thresholds:
- **High** — score ≥ 0.75
- **Medium** — score ≥ 0.50
- **Low** — score < 0.50

### `RecommendationSource`
```
"AI" | "RuleBased"
```
- **AI** — full hybrid recommendation from the AI model
- **RuleBased** — Graceful Degradation path; AI was unavailable or output failed schema validation; rule-only preliminary output returned

### `AddOnCategory`
```
"cancer_screening" | "cardiac" | "endocrine" | "gi_liver" |
"nephrology" | "imaging" | "musculoskeletal" | "neurology" |
"ophthalmology" | "vaccination" | "women_health" | "other"
```
Mirrors the `category` field in the Ruleset Store add-on library.

---

## Sub-Types

### `NavavejProduct`

Product metadata from the Ruleset Store. System-injected; never AI-generated.

```typescript
interface NavavejProduct {
  product_name:  string        // [ENRICH] e.g. "Platinum — Men"
  product_code:  string        // [ENRICH] e.g. "PLAT_M"
  price_thb:     integer|null  // [ENRICH] null if price unconfirmed (see Open Questions in navavej-checkup-package-discovery.md)
}
```

---

### `AddOnItem`

An individually recommended examination, vaccine, or specialist referral.

```typescript
interface AddOnItem {
  // --- AI-generated core (Stage 1) ---
  item_code:      string         // [AI]   stable code from Ruleset Store add_on_library[].item_code
  priority_level: PriorityLevel  // [AI]   AI-assigned; may differ from priority_level_default
  rationale:      string         // [AI]   patient-specific clinical justification (1–3 sentences)

  // --- System-enriched (Stage 2) ---
  label:                   string          // [ENRICH] human-readable name from Ruleset Store
  category:                AddOnCategory   // [ENRICH] from Ruleset Store
  navavej_product:         NavavejProduct  // [ENRICH] from Ruleset Store
  trigger_signals_matched: string[]        // [SYS]   intersection of add-on's trigger_signals[] and patient's signals_fired[]
}
```

**Notes:**
- The AI selects `item_code` values from the pre-filtered `add_on_library[]` returned by `get_program_ruleset`. Items excluded by gender or age constraints are absent from that list and must not appear in the output.
- The AI assigns `priority_level`. The Safety Rule Validator may silently revoke an entire add-on item (never just downgrade priority) if it violates a hard constraint. Priority level disagreements between AI and ruleset default are acceptable and are visible in the audit log.
- `rationale` is patient-specific — it must reference actual signal values (e.g. "Colonoscopy last performed June 2019, now 7 years overdue. Brother diagnosed with colon cancer at 48, which triggers a 5-year screening interval under USPSTF 2021."). Generic rationales are not acceptable.

---

### `ResolvedPackage`

The specific Navavej package the system recommends based on `ai_recommended_tier`, patient gender, and patient age. System-resolved from the Ruleset Store `package_resolution_map`.

```typescript
interface ResolvedPackage {
  tier:         Tier          // [SYS]   mirrors ai_recommended_tier
  package_name: string        // [ENRICH] e.g. "Platinum — Men"
  package_code: string        // [ENRICH] e.g. "PLAT_M"
  price_thb:    integer|null  // [ENRICH] null if unconfirmed
  age_band:     string        // [ENRICH] e.g. "age_35_plus"
  gender:       string        // [ENRICH] "male" | "female" | "other"
}
```

---

### `CommunicationScript`

A structured patient-facing communication guide generated by the AI, following hospital-standard section templates (TOR §3.3.5). Each section is a complete, natural-language paragraph or list — not a template placeholder.

```typescript
interface CommunicationScript {
  opening:                   string    // [AI] Greeting; introduces purpose of today's consultation
  health_summary:            string    // [AI] 2–4 sentence plain-language summary of key health findings
  recommendation_explanation: string  // [AI] Explains the recommended program and why it is appropriate for this patient
  add_on_highlights:         string[]  // [AI] One entry per Red/Orange priority add-on; plain-language explanation
  next_steps:                string    // [AI] What the patient should do next; how to book / what to bring
}
```

**Constraints:**
- Language must be suitable for the patient (non-technical), positive, and action-oriented.
- `add_on_highlights` covers only Red and Orange priority add-ons (the most urgent). Yellow/Green items may be mentioned in `recommendation_explanation` in aggregate.
- No patient PII should appear in this field — the AI receives only pseudonymized tokens; real names are rehydrated by the system after this field is generated.

---

### `CriticalSignalAlert`

A High- or Critical-severity risk flag surfaced in the Patient High Alert section. System-built from the Signal Store `risk_flags[]`.

```typescript
interface CriticalSignalAlert {
  signal_id:     string               // [SYS] matches a signal ID in Signal Store risk_flags[].flag_id
  label:         string               // [SYS] human-readable signal name
  severity:      "High" | "Critical"  // [SYS] from Signal Store risk_flags[].severity
  clinical_note: string               // [SYS] from Signal Store risk_flags[].label + source_signals context
}
```

---

### `MissingDataAlert`

A signal that was applicable for this patient but had no source data in the Signal Store. System-built by cross-referencing `RecommendationOutput.missing_signals[]` against the Signal Store signal catalog.

```typescript
interface MissingDataAlert {
  signal_id:            string  // [SYS] signal ID from missing_signals[]
  label:                string  // [SYS] human-readable signal name from signal catalog
  recommendation_impact: string // [SYS] brief note on how this gap may affect recommendation quality
}
```

**Example `recommendation_impact` values:**
- `"sleep_apnea_screen_result"` → `"STOP-BANG questionnaire not completed. Sleep apnea risk cannot be assessed; PSG add-on trigger may be missed."`
- `"physical_activity_level"` → `"Exercise questionnaire not completed. Sedentary risk adjustment may be missing."`

---

### `PatientHighAlert`

Pre-computed alert section for the ROC Dashboard Patient High Alert panel (TOR §3.3.2). System-assembled post-AI; the dashboard renders this directly without re-querying the Signal Store.

```typescript
interface PatientHighAlert {
  critical_signals:    CriticalSignalAlert[]  // [SYS] High/Critical severity risk flags from Signal Store
  missing_data_alerts: MissingDataAlert[]     // [SYS] signals in missing_signals[] with no source data
}
```

**Population logic:**
```
critical_signals    ← Signal Store risk_flags[] where severity IN ["High", "Critical"]
missing_data_alerts ← RecommendationOutput.missing_signals[] × signal catalog (label lookup)
```

---

### `RecommendationMetadata`

Traceability and audit fields. All fields are system-populated. The Audit Logger records these alongside the full prompt/context/response.

```typescript
interface RecommendationMetadata {
  request_id:                  string    // [SYS] UUID for this inference request (for log correlation)
  patient_token:               string    // [SYS] HMAC-SHA256 pseudonymous patient ID (no real PII)
  model_id:                    string    // [SYS] active AI model identifier e.g. "claude-3-5-sonnet-20241022"
  template_version:            string    // [SYS] prompt template version e.g. "claude-3-5::v2"
  ruleset_version:             string    // [SYS] Ruleset Store version e.g. "v2026.03.1"
  signal_store_pipeline_run_id: string   // [SYS] Signal Store pipeline run that produced the patient's signals
  generated_at:                string    // [SYS] ISO 8601 UTC timestamp
  latency_ms:                  integer   // [SYS] total inference latency in milliseconds
}
```

---

## Main Type: `RecommendationOutput`

```typescript
interface RecommendationOutput {

  // ═══════════════════════════════════════════
  // STAGE 1 — AI-generated (BAML-enforced)
  // ═══════════════════════════════════════════

  ai_recommended_tier: Tier
  // [AI] The program tier the AI recommends based on its clinical reasoning.
  // May agree with or deviate from rule_preliminary_tier.
  // When deviating, tier_deviation_justification is required.

  tier_deviation_justification: string|null
  // [AI] Required (non-null, non-empty) when ai_recommended_tier != rule_preliminary_tier.
  // Must explicitly cite which signals and clinical reasoning justify the deviation.
  // null when tiers agree.

  add_ons: AddOnItem[]
  // [AI+ENRICH] AI selects item_codes + assigns priority_level + writes rationale.
  // System enriches with label, category, navavej_product, trigger_signals_matched.
  // Must only contain item_codes present in the get_program_ruleset add_on_library[].

  reasoning_trace: string
  // [AI] Full chain-of-thought reasoning displayed on the ROC Dashboard (Explainable AI).
  // Must reference specific signal values, trends, guideline names, and the tier selection
  // rule that was applied. Minimum 150 words. No PII (pseudonymized tokens only).

  supporting_signals: string[]
  // [AI] Signal IDs from the Signal Store that drove the tier and add-on recommendations.
  // Must be a subset of signals_fired[] from get_clinical_signals.
  // Example: ["prediabetes_confirmed", "colonoscopy_overdue_2557d", "lung_ct_threshold_met"]

  missing_signals: string[]
  // [AI] Signal IDs that were applicable for this patient but had no source data.
  // Must be a subset of missing_signals[] from get_clinical_signals.
  // These feed patient_high_alert.missing_data_alerts[].
  // Example: ["sleep_apnea_screen_result", "physical_activity_level"]

  communication_script: CommunicationScript
  // [AI] Structured patient-facing communication guide.
  // Four named sections ensure hospital-standard consistency.


  // ═══════════════════════════════════════════
  // STAGE 2 — System-computed
  // ═══════════════════════════════════════════

  rule_preliminary_tier: Tier
  // [SYS] Pre-computed tier from the Clinical Signal Engine + Program Selection Ruleset.
  // Injected from get_clinical_signals.rule_preliminary_tier.
  // Displayed side-by-side with ai_recommended_tier on the ROC Dashboard.

  resolved_package: ResolvedPackage
  // [SYS+ENRICH] Specific Navavej package resolved from ai_recommended_tier + patient
  // gender + age via the Ruleset Store package_resolution_map.

  confidence_score: float
  // [SYS] Deterministic score computed by the Confidence Calibrator (not AI-generated).
  // Range: 0.0–1.0.
  // Formula: (0.4 × signal_coverage) + (0.4 × data_completeness) + (0.2 × rule_agreement)
  //   signal_coverage   = len(signals_fired) / len(applicable_signals)
  //   data_completeness = populated_key_fields / total_key_fields  (from Signal Store _meta)
  //   rule_agreement    = 1.0 if ai_recommended_tier == rule_preliminary_tier else 0.7

  confidence_tier: ConfidenceTier
  // [SYS] Derived from confidence_score:
  //   High   ≥ 0.75
  //   Medium ≥ 0.50
  //   Low    < 0.50

  review_required: bool
  // [SYS] true when Graceful Degradation was triggered:
  //   - AI Gateway unavailable / timeout
  //   - Output Schema Validator rejected AI output (BAML schema failure)
  //   - Inference Orchestrator max iterations cap reached with no committed output
  // When true: recommendation_source = "RuleBased", add_ons[] contains rule-only output,
  // reasoning_trace explains the fallback, and SalesAdmin review is mandatory.

  recommendation_source: RecommendationSource
  // [SYS] "AI" for normal path. "RuleBased" when review_required is true.

  patient_high_alert: PatientHighAlert
  // [SYS] Pre-assembled alert section for the ROC Dashboard Patient High Alert panel.
  // critical_signals: Signal Store risk_flags[] filtered to severity High or Critical.
  // missing_data_alerts: missing_signals[] with labels and impact notes.

  metadata: RecommendationMetadata
  // [SYS] Traceability fields for audit logging and debugging.

}
```

---

## Validation Rules

The Output Schema Validator enforces these rules before passing output to the Audit Logger. Violations trigger Graceful Degradation.

| # | Rule | Trigger on Failure |
|---|------|--------------------|
| V1 | `tier_deviation_justification` must be non-null and non-empty when `ai_recommended_tier != rule_preliminary_tier` | Schema failure → Graceful Degradation |
| V2 | Every `item_code` in `add_ons[]` must exist in `add_on_library[]` from `get_program_ruleset` response | Schema failure → Graceful Degradation |
| V3 | `add_ons[]` must not contain any `item_code` present in `get_hard_constraints.eligibility_exclusions[]` | Violation → Safety Rule Validator revokes item; logged to Audit Logger |
| V4 | `supporting_signals[]` must be a non-empty subset of `signals_fired[]` from `get_clinical_signals` | Schema failure → Graceful Degradation |
| V5 | `missing_signals[]` must be a subset of `missing_signals[]` from `get_clinical_signals` | Schema failure → Graceful Degradation |
| V6 | `confidence_score` must be in range [0.0, 1.0] | System computation error → logged; output still delivered |
| V7 | When `review_required: true`, `recommendation_source` must be `"RuleBased"` | Invariant — enforced by Graceful Degradation path |
| V8 | `reasoning_trace` must be non-empty | Schema failure → Graceful Degradation |
| V9 | `add_ons[].rationale` must be non-empty for every add-on item | Schema failure → Graceful Degradation |
| V10 | `add_ons[].priority_level` for any item with active `safety_contraindication_signals` must result in item removal (not just downgrade) | Safety Rule Validator removes item; logged to Audit Logger |

**Note on V3 / V10:** The Safety Rule Validator runs *after* schema validation. It applies hard constraint enforcement as a secondary safety net. V2 (item_code in add_on_library) is the primary gate that prevents excluded items from appearing; V3 is defensive redundancy.

---

## Field Responsibility Matrix

| Field | Origin | Stage | Populated by |
|-------|--------|-------|--------------|
| `ai_recommended_tier` | AI | 1 | AI model (BAML) |
| `tier_deviation_justification` | AI | 1 | AI model (BAML) |
| `add_ons[].item_code` | AI | 1 | AI model (BAML) |
| `add_ons[].priority_level` | AI | 1 | AI model (BAML) |
| `add_ons[].rationale` | AI | 1 | AI model (BAML) |
| `reasoning_trace` | AI | 1 | AI model (BAML) |
| `supporting_signals[]` | AI | 1 | AI model (BAML) |
| `missing_signals[]` | AI | 1 | AI model (BAML) |
| `communication_script.*` | AI | 1 | AI model (BAML) |
| `add_ons[].label` | Enriched | 2 | Ruleset Store lookup |
| `add_ons[].category` | Enriched | 2 | Ruleset Store lookup |
| `add_ons[].navavej_product` | Enriched | 2 | Ruleset Store lookup |
| `add_ons[].trigger_signals_matched[]` | System | 2 | Inference Orchestrator |
| `rule_preliminary_tier` | System | 2 | Signal Store (injected) |
| `resolved_package` | System+Enriched | 2 | Ruleset Store `package_resolution_map` |
| `confidence_score` | System | 2 | Confidence Calibrator |
| `confidence_tier` | System | 2 | Confidence Calibrator |
| `review_required` | System | 2 | Graceful Degradation |
| `recommendation_source` | System | 2 | Graceful Degradation |
| `patient_high_alert.critical_signals[]` | System | 2 | Signal Store `risk_flags[]` |
| `patient_high_alert.missing_data_alerts[]` | System | 2 | Signal catalog + missing_signals[] |
| `metadata.*` | System | 2 | Inference Orchestrator |

---

## Worked Example — Somchai W. (54yo male)

This example is consistent with the Signal Store contract and Ruleset Store contract worked examples. It shows the Stage 1 AI output followed by the complete Stage 2 enriched record.

**Patient context:** Somchai W., 54yo male. Pre-diabetes (HbA1c 6.1%), Stage 1 HTN on Amlodipine, borderline-high LDL rising despite statin, 22 pack-years (former smoker, quit 3yr), colonoscopy 7 years overdue, father had MI at 51, brother colon cancer at 48. `rule_preliminary_tier: "Advanced"` → Platinum — Men (฿8,700).

---

### Stage 1 — AI Model Output (BAML-enforced)

```json
{
  "ai_recommended_tier": "Advanced",
  "tier_deviation_justification": null,

  "add_ons": [
    {
      "item_code": "colonoscopy",
      "priority_level": "Red",
      "rationale": "Colonoscopy is 7 years 1 month overdue (last performed June 2019). Patient's brother was diagnosed with colon cancer at age 48, which triggers a 5-year screening interval per USPSTF 2021. The current overdue duration of 2,557 days substantially exceeds even the standard 10-year interval. This is the highest-urgency screening gap in this patient's profile."
    },
    {
      "item_code": "ldct_lung",
      "priority_level": "Red",
      "rationale": "Patient has never had a low-dose CT lung cancer screening. He meets all USPSTF 2021 eligibility criteria: age 54 (within 50–80 range), 22 pack-years (above the ≥20 threshold), and former smoker who quit 3 years ago (within the 15-year quit window). Annual LDCT is indicated and was never initiated."
    },
    {
      "item_code": "influenza_vaccine",
      "priority_level": "Orange",
      "rationale": "Influenza vaccination is overdue by 155 days. Last received October 2024; patient missed the October/November 2025 seasonal dose. Annual influenza vaccination is recommended for all adults per CDC ACIP 2024."
    },
    {
      "item_code": "shingrix_vaccine",
      "priority_level": "Orange",
      "rationale": "Patient has never received Shingrix (RZV). He has been eligible since age 50 and is now 54 — 4 years since eligibility. The 2-dose RZV series (0, 2–6 months) is the preferred zoster vaccine for adults ≥50 per CDC ACIP 2017."
    },
    {
      "item_code": "diabetes_screening_pro",
      "priority_level": "Yellow",
      "rationale": "FBS has risen from 96 → 102 → 108 mg/dL over 3 years (velocity +6 mg/dL/year). HbA1c is 6.1% (pre-diabetic range). ADA 2024 recommends annual HbA1c monitoring plus HOMA-IR assessment for confirmed pre-diabetes with rising trend. The Diabetes Screening Pro 1 (12-item panel) provides the necessary depth."
    },
    {
      "item_code": "exercise_stress_test",
      "priority_level": "Yellow",
      "rationale": "ASCVD 10-year risk is 8.2% (intermediate). Patient also reports mild dyspnea on exertion and has active Stage 1 HTN. ADA 2024 and AHA/ACC 2002 guidelines indicate EST for DM/pre-diabetes with age >40 and ≥2 CV risk factors. Father's premature CAD (MI at 51) adds further justification."
    },
    {
      "item_code": "ct_coronary_calcium",
      "priority_level": "Yellow",
      "rationale": "Patient has intermediate ASCVD risk (8.2%) and first-degree family history of premature CAD (father, MI age 51). ACC/AHA 2018 Cholesterol Guideline recommends CAC scoring as a risk decision aid to clarify statin therapy intensity in intermediate-risk patients. LDL is rising despite current Atorvastatin 10mg."
    },
    {
      "item_code": "carotid_ultrasound",
      "priority_level": "Yellow",
      "rationale": "Paternal premature CAD and intermediate ASCVD risk qualify this patient for subclinical atherosclerosis assessment per ACC/AHA 2018 risk enhancers. At age 54 (≥50 eligibility threshold), carotid intima-media thickness evaluation provides additional cardiovascular risk stratification beyond the Pooled Cohort Equations."
    },
    {
      "item_code": "kidney_screening",
      "priority_level": "Yellow",
      "rationale": "Patient has active HTN on treatment and confirmed pre-diabetes — both are primary risk factors for CKD progression. eGFR is currently 82 (CKD G2) with an annual decline of −2.0 mL/min/1.73m². ADA 2024 recommends urine ACR + eGFR annually for patients with pre-diabetes. KDIGO 2022 recommends same for HTN."
    },
    {
      "item_code": "multi_cancer_spotmas",
      "priority_level": "Yellow",
      "rationale": "First-degree family history of colon cancer (brother, age 48) is an established risk enhancer for hereditary colorectal malignancy. SPOT-MAS multi-cancer blood test provides an additional screening layer while awaiting the urgently needed colonoscopy. Combined approach recommended per clinical practice guidelines for high-risk family history."
    },
    {
      "item_code": "hepatitis_abc_screen",
      "priority_level": "Yellow",
      "rationale": "Patient completed Hepatitis B series in 2005 (3 doses) but anti-HBs titer has never been re-checked. AASLD guidelines recommend titer verification to confirm ongoing immunity, particularly given the >20-year interval since vaccination. Hepatitis A and C screening bundled for efficiency."
    },
    {
      "item_code": "psa_sdm",
      "priority_level": "Green",
      "rationale": "PSA is 1.8 ng/mL (within age-adjusted normal range for 50s: <3.5 ng/mL). No family history of prostate cancer. ACS 2023 and USPSTF 2018 recommend shared decision-making for PSA screening in males 50–69 — discussion is appropriate at this visit, but there is no clinical urgency."
    },
    {
      "item_code": "spine_mri",
      "priority_level": "Green",
      "rationale": "Patient reports neck pain and occupational risk tag 'office_syndrome' (10h/day sedentary desk work). Spine MRI (cervical) is appropriate for workup of chronic neck pain with an identifiable occupational etiology. Green priority — book when convenient, does not require urgent scheduling."
    }
  ],

  "reasoning_trace": "Patient is a 54-year-old Thai male presenting with a complex multi-system risk profile. I will address each signal cluster in turn.\n\n**Tier determination:** The Clinical Signal Engine pre-computed rule_preliminary_tier as 'Advanced' via rule ADVANCED_METABOLIC_OR_CVD (matched condition: prediabetes_confirmed). I agree with this tier assignment. The patient does not meet PREMIUM_SEVERE_SINGLE criteria (no confirmed DM with organ complications, no ckd_rapid_progression, no ascvd_very_high, no hypertensive_crisis). PREMIUM_MULTI_SIGNAL would fire at min_count=4 with 9 signals matching the premium pool — however, none of the individual signals rise to the severity requiring a Diamond-level comprehensive evaluation; the Advanced/Platinum package with targeted add-ons is clinically appropriate and proportionate.\n\n**Metabolic / pre-diabetes cluster:** FBS velocity is +6 mg/dL/year (96→102→108 over 3 years). HbA1c 6.1% confirms pre-diabetic range. Neither value yet crosses the diagnostic threshold for T2DM (FBS ≥126 or HbA1c ≥6.5%), but the trajectory is clearly worsening. ADA 2024 mandates annual HbA1c + metabolic panel in this scenario. I am triggering diabetes_screening_pro (Yellow) for the expanded panel including HOMA-IR and insulin.\n\n**Cardiovascular cluster:** ASCVD 10-year risk is 8.2% (intermediate). BP is 138/88 on Amlodipine — suboptimal control, with SBP rising at +3.8 mmHg/year. LDL is 148 mg/dL (borderline-high) and increasing at +13 mg/dL/year despite Atorvastatin 10mg — statin intensification discussion is warranted. Father had MI at age 51 (premature CAD). This constellation justifies exercise_stress_test (Yellow), ct_coronary_calcium (Yellow), and carotid_ultrasound (Yellow) for comprehensive cardiovascular risk stratification.\n\n**Cancer screening cluster:** The colonoscopy gap is the most urgent finding: 7 years overdue under a 5-year interval driven by first-degree family history of colon cancer at age 48. This is a Red-priority gap. LDCT lung cancer screening has never been performed despite full USPSTF 2021 eligibility (age 54, 22 pack-years, quit 3yr ago) — also Red. multi_cancer_spotmas (Yellow) provides supplementary early detection while the colonoscopy is being scheduled.\n\n**Kidney monitoring:** eGFR 82, declining at −2.0/year (CKD G2, not rapid progression). Active HTN and pre-diabetes both mandate annual urine ACR + eGFR per KDIGO 2022 and ADA 2024. Kidney screening add-on triggered at Yellow priority.\n\n**Vaccination gaps:** Influenza overdue 155 days (Orange — seasonal miss). Shingrix never initiated despite 4-year eligibility (Orange). Pneumococcal vaccine not yet due (age 54, due at 65) — already excluded from add-ons by age filter. Hepatitis B series complete 2005; anti-HBs titer re-check recommended by AASLD.\n\n**Missing signals:** Four signals had no source data: sleep_apnea_screen_result (STOP-BANG not completed — high BMI + HTN suggests OSA risk), physical_activity_level (exercise questionnaire not completed), reproductive_history (not applicable for male patient — expected to be in missing_signals for completeness of signal coverage calculation), frax_bone_density_risk (DEXA not indicated for males without osteoporosis risk factors at this age). The sleep_apnea gap is the most clinically relevant — if STOP-BANG is completed at this visit and scores ≥3, PSG add-on should be reconsidered.\n\n**Occupational signal:** Office syndrome (10h/day sedentary desk work) plus reported neck pain → spine_mri at Green priority.",

  "supporting_signals": [
    "prediabetes_confirmed",
    "hba1c_prediabetes",
    "colonoscopy_overdue_2557d",
    "family_hx_colon_ca_first_degree",
    "lung_ct_threshold_met",
    "ascvd_risk_intermediate",
    "family_hx_premature_cad",
    "bp_stage1_htn",
    "bp_trend_worsening",
    "ldl_borderline_high",
    "hdl_low_male",
    "dyslipidemia_active",
    "htn_active",
    "est_consideration",
    "influenza_overdue_428d",
    "shingrix_not_started",
    "hepatitis_b_anti_hbs_check_needed",
    "office_syndrome",
    "bmi_overweight_asian",
    "uric_acid_hyperuricemia"
  ],

  "missing_signals": [
    "sleep_apnea_screen_result",
    "physical_activity_level",
    "reproductive_history",
    "frax_bone_density_risk"
  ],

  "communication_script": {
    "opening": "Good morning. Thank you for coming in for your health checkup consultation today. Based on a thorough review of your health history and laboratory results from the past three years, our system has prepared a personalized health screening program for you. I would like to walk you through the findings and recommendations, and answer any questions you may have.",

    "health_summary": "Your overall health profile shows several areas that deserve attention. Your blood sugar has been gradually rising over the past three years and is now in the pre-diabetic range, and your blood pressure remains slightly above the recommended level despite medication. Your cholesterol, particularly LDL, has also been increasing. On the positive side, your kidney function is normal and your thyroid is healthy. The most important finding today is that your colorectal cancer screening is significantly overdue, and you are also eligible for a lung cancer screening that you have not yet had.",

    "recommendation_explanation": "Based on your age, health history, and laboratory trends, the Platinum Men's Health Checkup Program is the most appropriate comprehensive program for you. This program covers your essential labs, imaging, and specialist consultation at a level matched to your risk profile. In addition to the core program, we recommend a number of targeted add-on examinations to address specific gaps and follow up on your laboratory trends — I will walk through the most important ones now.",

    "add_on_highlights": [
      "Colonoscopy — This is the most urgent recommendation today. Your last colonoscopy was more than seven years ago. Because your brother was diagnosed with colon cancer at age 48, medical guidelines recommend a colonoscopy every five years for you — which means you are now two years overdue on the five-year schedule. Early detection of colorectal polyps can prevent cancer from developing, so we strongly recommend scheduling this as soon as possible.",
      "Low-Dose CT Lung Screening — Because you smoked for a number of years, you qualify for an annual lung cancer screening scan. This is a low-radiation, fast scan that does not require any preparation. You have never had one, and starting now gives you the best opportunity for early detection. This is recommended for people aged 50 to 80 who have a similar smoking history to yours.",
      "Influenza Vaccination — Your annual flu shot is about five months overdue. We can arrange this today if you would like, as it only takes a moment and will protect you through the rest of the flu season.",
      "Shingles Vaccine (Shingrix) — You have been eligible for the shingles vaccine since you turned 50, four years ago. Shingrix is a two-dose vaccine given one to six months apart. Shingles can be quite painful and is more common and more severe as we get older — the vaccine significantly reduces your risk."
    ],

    "next_steps": "After today's consultation, we will prepare a personalized checkup plan document for you to take home. To book your colonoscopy and lung CT, please speak with our scheduling team at the front desk — both can often be arranged within one to two weeks. If you are ready for your flu shot and wish to start the Shingrix series today, our nursing team can assist you before you leave. For your other recommended add-ons, your consulting physician will review them with you and help prioritize based on your schedule and preferences."
  }
}
```

---

### Stage 2 — Complete Enriched Output

Showing only the system-injected fields and enriched add-on fields (Stage 1 fields are as above):

```json
{
  "rule_preliminary_tier": "Advanced",

  "resolved_package": {
    "tier": "Advanced",
    "package_name": "Platinum — Men",
    "package_code": "PLAT_M",
    "price_thb": 8700,
    "age_band": "age_35_plus",
    "gender": "male"
  },

  "confidence_score": 0.823,
  "confidence_tier": "High",

  "review_required": false,
  "recommendation_source": "AI",

  "patient_high_alert": {
    "critical_signals": [
      {
        "signal_id": "lung_ct_threshold_met",
        "label": "LDCT lung cancer screening eligible — never performed",
        "severity": "High",
        "clinical_note": "Age 54, 22 pack-years, former smoker quit 3yr ago. USPSTF 2021 annual LDCT indicated. Never performed."
      },
      {
        "signal_id": "family_hx_colon_ca_first_degree",
        "label": "First-degree family history: colon cancer (brother, age 48)",
        "severity": "High",
        "clinical_note": "Brother diagnosed at 48 → 5-year colonoscopy interval. Last colonoscopy 2019 (7yr 1mo ago). 2,557 days overdue."
      },
      {
        "signal_id": "family_hx_premature_cad",
        "label": "First-degree family history: premature CAD (father, MI age 51)",
        "severity": "High",
        "clinical_note": "Paternal MI at age 51 (below male threshold of 55). CV risk enhanced — ACC/AHA risk enhancer active."
      }
    ],
    "missing_data_alerts": [
      {
        "signal_id": "sleep_apnea_screen_result",
        "label": "Sleep Apnea Screening (STOP-BANG)",
        "recommendation_impact": "STOP-BANG questionnaire not completed. Patient has BMI 26.7 + Stage 1 HTN — two established STOP-BANG criteria. If questionnaire scores ≥3, Full Sleep Test (PSG) add-on should be added. Consider completing at this visit."
      },
      {
        "signal_id": "physical_activity_level",
        "label": "Physical Activity Level",
        "recommendation_impact": "Exercise frequency questionnaire not completed. Sedentary risk adjustment (relevant for metabolic and cardiovascular risk) may be underestimated."
      },
      {
        "signal_id": "frax_bone_density_risk",
        "label": "FRAX Bone Density Risk Score",
        "recommendation_impact": "Not applicable for male patient at this age without specific osteoporosis risk factors. No impact on current recommendations."
      }
    ]
  },

  "add_ons": [
    {
      "item_code": "colonoscopy",
      "priority_level": "Red",
      "rationale": "...(as in Stage 1)...",
      "label": "Colonoscopy — Colorectal Cancer Screening",
      "category": "cancer_screening",
      "navavej_product": {
        "product_name": "Endoscopy Package (Upper GI)",
        "product_code": "ENDO_UPPER",
        "price_thb": 9500
      },
      "trigger_signals_matched": ["colonoscopy_overdue_2557d", "family_hx_colon_ca_first_degree"]
    },
    {
      "item_code": "ldct_lung",
      "priority_level": "Red",
      "rationale": "...(as in Stage 1)...",
      "label": "Low-Dose CT Chest — Lung Cancer Screening",
      "category": "cancer_screening",
      "navavej_product": {
        "product_name": "Low-Dose CT Chest (Lung Cancer / PM2.5 Screening)",
        "product_code": "LDCT_LUNG",
        "price_thb": 3900
      },
      "trigger_signals_matched": ["lung_ct_threshold_met"]
    }
    // ... (remaining 11 add-ons follow same pattern with label, category, navavej_product, trigger_signals_matched injected)
  ],

  "metadata": {
    "request_id": "req_2026031307412a3f",
    "patient_token": "tok_hmac_56291047",
    "model_id": "claude-3-5-sonnet-20241022",
    "template_version": "claude-3-5::v2",
    "ruleset_version": "v2026.03.1",
    "signal_store_pipeline_run_id": "pipe_20260312_0300",
    "generated_at": "2026-03-13T07:41:23Z",
    "latency_ms": 4812
  }
}
```

**Confidence score computation for this example** (from `component-inventory-solution-approach.md` §2.5):
```
signal_coverage   = 22 / 33 = 0.667
data_completeness = 40 / 45 = 0.889   (from Signal Store _meta)
rule_agreement    = 1.0               (ai_recommended_tier == rule_preliminary_tier == "Advanced")

confidence_score  = (0.4 × 0.667) + (0.4 × 0.889) + (0.2 × 1.0)
                  = 0.267 + 0.356 + 0.200
                  = 0.823  → confidence_tier: "High"
```

---

## What the AI Must NOT Generate

To avoid hallucination and maintain determinism:

| Field | Why AI must not generate it |
|-------|----------------------------|
| `confidence_score` / `confidence_tier` | AI self-reported confidence is miscalibrated. The Confidence Calibrator computes it deterministically from observable evidence. |
| `rule_preliminary_tier` | Pre-computed by the Clinical Signal Engine offline. The AI receives it as input (context), not as something to generate. |
| `resolved_package` | Deterministic lookup from Ruleset Store. No AI judgement involved. |
| `patient_high_alert` | System-assembled from Signal Store data. Consistent presentation is required regardless of AI output. |
| `add_ons[].label` / `add_ons[].navavej_product` | These are database records, not clinical reasoning. |
| `metadata.*` | Infrastructure fields; AI has no access to request IDs, latency, or model IDs. |

---

## Notes for BAML Conversion

The following Stage 1 fields translate directly to BAML types:

```
RecommendationOutput (Stage 1 only)
  ai_recommended_tier         → enum Tier
  tier_deviation_justification → string?    (nullable/optional)
  add_ons                     → AddOnItem[]
  reasoning_trace             → string
  supporting_signals          → string[]
  missing_signals             → string[]
  communication_script        → CommunicationScript

AddOnItem (AI-generated core only)
  item_code                   → string
  priority_level              → enum PriorityLevel
  rationale                   → string

CommunicationScript
  opening                     → string
  health_summary              → string
  recommendation_explanation  → string
  add_on_highlights           → string[]
  next_steps                  → string
```

BAML does not need to define `NavavejProduct`, `ResolvedPackage`, `PatientHighAlert`, `CriticalSignalAlert`, `MissingDataAlert`, or `RecommendationMetadata` — those are system-side types assembled in the backend. The BAML schema enforces only what the AI model must emit (Stage 1).

---

*End of Recommendation Output Schema v1.0*
*Companion documents: `signal-store-contract.md`, `ruleset-store-contract.md`, `component-inventory-solution-approach.md`*
*Next: `recommendation-output.baml`*
