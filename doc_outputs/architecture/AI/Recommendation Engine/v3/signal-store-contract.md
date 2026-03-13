# Signal Store Data Contract
## Smart Health Checkup Recommendation Dashboard — MCP Tool API Specification

**Version:** 1.0
**Date:** 2026-03-12
**Audience:** MCP Server implementation team, Inference Orchestrator implementation team, Clinical Signal Engine (Data Pipeline) implementation team
**Depends on:** `fhir-discovery-report.md`, `clinical-guidelines-reference.md`
**Companion:** `sample_patient_checkup.json` (input to Clinical Signal Engine)

---

## Overview

The Signal Store is a pre-computed read-only database populated **offline** by the Data Pipeline (FHIR Transform → Feature Engineering → Clinical Signal Engine). At query time, the MCP Server exposes three read-only tools that the Inference Orchestrator calls before invoking the AI model.

```
Data Pipeline (offline)
  FHIR Transform
      ↓
  Feature Engineering  (trends, velocities, overdue scores)
      ↓
  Clinical Signal Engine  (applies clinical-guidelines-reference.md rules)
      ↓
  Signal Store DB  ←── this document defines the record written here
      ↑
MCP Server (query time)
  get_hard_constraints(patient_token)   ─┐
  get_clinical_signals(patient_token)    ├── defined in this document
  get_biomarker_trends(patient_token)   ─┘
```

**Signal ID naming convention:** All signal identifiers use `snake_case` strings derived directly from clinical guidelines flag names in `clinical-guidelines-reference.md`. Examples: `"prediabetes_confirmed"`, `"mammogram_overdue_365d"`, `"lung_ct_threshold_met"`. These IDs appear in `applicable_signals[]`, `signals_fired[]`, `missing_signals[]`, and the BAML output's `supporting_signals[]`.

**Patient token:** Primary key is `patient_token` = `HMAC-SHA256(fhir_patient_id, secret_salt)`. One-way mapping; the Signal Store never contains raw MRN or FHIR Patient ID.

---

## Tool 1 — `get_hard_constraints(patient_token)`

### Purpose
Returns non-overridable constraints for this patient. The Safety Rule Validator re-fetches this after AI inference to check for violations. The Orchestrator also uses this to gate which signals are "applicable" before calling `get_clinical_signals`.

### Example Response — Somchai W. (54yo male, Hypertensive, on Amlodipine)

```json
{
  "patient_token": "tok_hmac_56291047",
  "patient_demographics": {
    "gender": "male",
    "age": 54,
    "date_of_birth_token": "dob_tok_8a3f2c1d",
    "ethnicity": "asian",
    "bmi_threshold_profile": "asian_adjusted"
  },
  "eligibility_exclusions": [
    {
      "test_code": "mammogram",
      "test_label": "Mammography (bilateral screening)",
      "reason_code": "gender_male_ineligible",
      "reason_label": "Mammography is not indicated for male patients",
      "guideline": "USPSTF Breast Cancer Screening 2024",
      "overridable": false
    },
    {
      "test_code": "pap_smear",
      "test_label": "Cervical cytology / Pap smear",
      "reason_code": "gender_male_ineligible",
      "reason_label": "Cervical cancer screening is not applicable for male patients",
      "guideline": "USPSTF Cervical Cancer Screening 2018",
      "overridable": false
    },
    {
      "test_code": "hpv_vaccination",
      "test_label": "HPV vaccination catch-up series",
      "reason_code": "age_above_threshold_male",
      "reason_label": "HPV vaccination catch-up not recommended for males > 26 (SDM only through 45; not recommended > 45)",
      "guideline": "CDC ACIP 2023",
      "overridable": false
    }
  ],
  "active_safety_flags": [],
  "tier_ceiling": null,
  "computed_at": "2026-03-12T03:00:00Z",
  "pipeline_run_id": "pipe_20260312_0300"
}
```

> **Note on `active_safety_flags`:** This array is populated when hard clinical safety flags are active (e.g. hypertensive crisis → EST contraindicated, eGFR < 30 → no contrast). Empty for this patient — no crisis or severe CKD. See field dictionary below for all possible values.

### JSON Schema

```jsonschema
{
  "$schema": "https://json-schema.org/draft/2020-12",
  "$id": "signal-store/get_hard_constraints/response",
  "type": "object",
  "required": ["patient_token", "patient_demographics", "eligibility_exclusions", "active_safety_flags", "computed_at"],
  "properties": {
    "patient_token": {
      "type": "string",
      "description": "HMAC-SHA256 pseudonymous patient identifier. Never contains MRN or real ID."
    },
    "patient_demographics": {
      "type": "object",
      "required": ["gender", "age", "ethnicity", "bmi_threshold_profile"],
      "properties": {
        "gender": { "type": "string", "enum": ["male", "female", "other"] },
        "age": { "type": "integer", "minimum": 0, "maximum": 120 },
        "date_of_birth_token": {
          "type": "string",
          "description": "PII-tokenized DOB — replaced by PII Masking before AI sees it. Raw DOB is never in this field at AI inference time."
        },
        "ethnicity": { "type": "string", "enum": ["asian", "caucasian", "african", "hispanic", "other", "unknown"] },
        "bmi_threshold_profile": { "type": "string", "enum": ["asian_adjusted", "who_global"], "description": "Which BMI thresholds apply (asian_adjusted for Thai/SE Asian patients)" }
      }
    },
    "eligibility_exclusions": {
      "type": "array",
      "description": "Tests/procedures this patient is NOT eligible for. The Safety Rule Validator enforces these post-inference.",
      "items": {
        "type": "object",
        "required": ["test_code", "test_label", "reason_code", "reason_label", "guideline", "overridable"],
        "properties": {
          "test_code": { "type": "string", "description": "Internal test code used across the system" },
          "test_label": { "type": "string" },
          "reason_code": { "type": "string", "enum": [
            "gender_male_ineligible", "gender_female_ineligible",
            "age_below_threshold", "age_above_threshold",
            "age_above_threshold_male", "age_above_threshold_female",
            "contraindicated_with_active_condition",
            "admin_configured_exclusion"
          ]},
          "reason_label": { "type": "string", "description": "Human-readable explanation for audit and display" },
          "guideline": { "type": "string", "description": "Source guideline citation" },
          "overridable": { "type": "boolean", "const": false, "description": "Always false — hard constraints are never overridable by AI or admin" }
        }
      }
    },
    "active_safety_flags": {
      "type": "array",
      "description": "Active clinical safety conditions that restrict specific procedures. Empty array = no active flags.",
      "items": {
        "type": "object",
        "required": ["flag_id", "flag_label", "restricts", "guideline"],
        "properties": {
          "flag_id": { "type": "string", "examples": ["hypertensive_crisis", "ckd_no_contrast", "hypoglycemia_active"] },
          "flag_label": { "type": "string" },
          "restricts": {
            "type": "array", "items": { "type": "string" },
            "description": "test_codes that are contraindicated while this flag is active"
          },
          "guideline": { "type": "string" }
        }
      }
    },
    "tier_ceiling": {
      "type": ["string", "null"],
      "enum": ["Standard", "Advanced", "Premium", null],
      "description": "Maximum package tier clinically appropriate for this patient. null = no ceiling (any tier permitted). Set by Clinical Signal Engine for severely frail or end-stage patients."
    },
    "computed_at": { "type": "string", "format": "date-time" },
    "pipeline_run_id": { "type": "string" }
  }
}
```

### Field Dictionary — `get_hard_constraints`

| Field | Type | Source (FHIR Path) | Guideline Rule | Example |
|---|---|---|---|---|
| `gender` | string | `Patient.gender` | — | `"male"` |
| `age` | integer | Computed from `Patient.birthDate` | — | `54` |
| `ethnicity` | string | `Patient.extension[ethnicity]` or questionnaire | — | `"asian"` |
| `bmi_threshold_profile` | string | Derived from `ethnicity` | WHO Asia-Pacific 2000 | `"asian_adjusted"` |
| `eligibility_exclusions[].test_code` | string | Derived from gender + age applied to eligibility rules | USPSTF, ACIP | `"mammogram"` |
| `active_safety_flags[].flag_id` | string | Derived from Observation values (BP, eGFR) | ACC/AHA 2017, KDIGO 2022 | `"hypertensive_crisis"` |
| `tier_ceiling` | string\|null | Clinical Signal Engine policy rule | Clinical frailty / end-stage logic | `null` |

---

## Tool 2 — `get_clinical_signals(patient_token)`

### Purpose
Returns all pre-computed clinical signals for this patient: risk level, screening gaps, vaccination gaps, abnormal triggers, comorbidities, family history, behavioral flags, and symptom tags. Also returns the three parallel signal lists needed by the Confidence Calibrator and the pre-computed `rule_preliminary_tier`.

### Signal Coverage Lists

Three parallel lists power the Confidence Calibrator:

```
applicable_signals[]   — all signals evaluated for this patient's profile
signals_fired[]        — subset that evaluated to active (→ BAML supporting_signals[])
missing_signals[]      — signals in applicable with no source data (→ BAML missing_signals[] + Patient High Alert)

signal_coverage = len(signals_fired) / len(applicable_signals)
```

### Example Response — Somchai W. (54yo male)

```json
{
  "patient_token": "tok_hmac_56291047",

  "rule_preliminary_tier": "Advanced",
  "overall_risk_level": "Moderate",

  "applicable_signals": [
    "fbs_status", "hba1c_status", "ldl_status", "hdl_status", "tg_status",
    "alt_status", "ast_status", "egfr_status", "tsh_status", "psa_sdm_status",
    "uric_acid_status", "bp_category", "bmi_status",
    "colonoscopy_screening_gap", "chest_xray_gap", "ecg_gap", "est_gap",
    "lung_ldct_gap",
    "influenza_vaccination_gap", "hepatitis_b_vaccination_status", "pneumococcal_vaccination_gap", "shingrix_vaccination_gap",
    "family_hx_premature_cad", "family_hx_colon_ca",
    "smoking_status", "lung_ct_threshold",
    "alcohol_risk", "occupational_risk",
    "dm_comorbidity", "htn_comorbidity", "ckd_comorbidity", "dyslipidemia_comorbidity",
    "ascvd_10yr_risk_status",
    "dm_organ_complication_screening",
    "fibroscan_indication"
  ],

  "signals_fired": [
    "prediabetes_confirmed",
    "hba1c_prediabetes",
    "ldl_borderline_high",
    "hdl_low_male",
    "tg_borderline_high",
    "bp_stage1_htn",
    "bp_trend_worsening",
    "bmi_overweight_asian",
    "colonoscopy_overdue_2557d",
    "influenza_overdue_428d",
    "shingrix_not_started",
    "pneumococcal_not_done",
    "family_hx_premature_cad",
    "family_hx_colon_ca_first_degree",
    "lung_ct_threshold_met",
    "at_risk_alcohol_use",
    "office_syndrome",
    "dyslipidemia_active",
    "htn_active",
    "ascvd_risk_intermediate",
    "est_consideration",
    "uric_acid_hyperuricemia",
    "hepatitis_b_anti_hbs_check_needed"
  ],

  "missing_signals": [
    "reproductive_history",
    "frax_bone_density_risk",
    "sleep_apnea_screen_result",
    "physical_activity_level"
  ],

  "risk_flags": [
    {
      "flag_id": "prediabetes_confirmed",
      "label": "Pre-diabetes confirmed",
      "severity": "Moderate",
      "source_signals": ["fbs_108_mgdl", "hba1c_6_1_pct"],
      "guideline": "ADA Standards of Medical Care 2024",
      "add_on_triggers": ["hba1c_repeat_12_months", "dm_lifestyle_counseling"]
    },
    {
      "flag_id": "bp_stage1_htn",
      "label": "Stage 1 Hypertension (ACC/AHA 2017)",
      "severity": "Moderate",
      "source_signals": ["sbp_138_mmhg", "dbp_88_mmhg"],
      "guideline": "ACC/AHA High Blood Pressure Guideline 2017",
      "add_on_triggers": []
    },
    {
      "flag_id": "bp_trend_worsening",
      "label": "BP trend worsening over 3 readings (2023–2026)",
      "severity": "Moderate",
      "source_signals": ["bp_trend_slope_positive"],
      "guideline": "ACC/AHA 2017",
      "add_on_triggers": ["ambulatory_bp_monitoring_consideration"]
    },
    {
      "flag_id": "bmi_overweight_asian",
      "label": "Overweight — Asian-adjusted BMI ≥ 23 kg/m²",
      "severity": "Low",
      "source_signals": ["bmi_26_7"],
      "guideline": "WHO Asia-Pacific BMI 2000",
      "add_on_triggers": ["dietary_counseling"]
    },
    {
      "flag_id": "ldl_borderline_high",
      "label": "LDL Borderline High (130–159 mg/dL)",
      "severity": "Moderate",
      "source_signals": ["ldl_148_mgdl"],
      "guideline": "ACC/AHA Cholesterol Guideline 2018",
      "add_on_triggers": []
    },
    {
      "flag_id": "hdl_low_male",
      "label": "HDL Low for male (< 40 mg/dL)",
      "severity": "Moderate",
      "source_signals": ["hdl_42_mgdl"],
      "guideline": "ACC/AHA Cholesterol Guideline 2018",
      "add_on_triggers": []
    },
    {
      "flag_id": "ascvd_risk_intermediate",
      "label": "ASCVD 10-year risk: Intermediate (7.5–10%)",
      "severity": "Moderate",
      "source_signals": ["ascvd_computed_8_2_pct"],
      "guideline": "ACC/AHA Pooled Cohort Equations 2013/2018",
      "add_on_triggers": ["est_consideration", "statin_sdm_discussion"]
    },
    {
      "flag_id": "lung_ct_threshold_met",
      "label": "LDCT lung cancer screening eligible (age 54, 22 pack-years, quit < 15yr)",
      "severity": "High",
      "source_signals": ["pack_years_22", "smoking_former_quit_3yr"],
      "guideline": "USPSTF Lung Cancer Screening 2021",
      "add_on_triggers": ["lung_ldct_annual"]
    },
    {
      "flag_id": "family_hx_premature_cad",
      "label": "First-degree relative (father) with premature CAD (MI at age 51)",
      "severity": "High",
      "source_signals": ["family_hx_father_cad_onset_51"],
      "guideline": "ACC/AHA Risk Enhancers",
      "add_on_triggers": ["cv_risk_assessment_enhanced", "est_consideration"]
    },
    {
      "flag_id": "family_hx_colon_ca_first_degree",
      "label": "First-degree relative (brother) with colon cancer (onset age 48)",
      "severity": "High",
      "source_signals": ["family_hx_brother_colon_ca_onset_48"],
      "guideline": "USPSTF Colorectal Cancer Screening 2021",
      "add_on_triggers": ["colonoscopy_5yr_interval"]
    },
    {
      "flag_id": "uric_acid_hyperuricemia",
      "label": "Hyperuricemia (uric acid 7.4 mg/dL > 7.0 threshold for males)",
      "severity": "Low",
      "source_signals": ["uric_acid_7_4_mgdl"],
      "guideline": "ACR Gout Guideline 2020",
      "add_on_triggers": []
    },
    {
      "flag_id": "at_risk_alcohol_use",
      "label": "At-risk alcohol use (AUDIT-C score 3, threshold for males: 4 — borderline)",
      "severity": "Low",
      "source_signals": ["audit_c_score_3"],
      "guideline": "NIAAA / AUDIT-C",
      "add_on_triggers": []
    },
    {
      "flag_id": "office_syndrome",
      "label": "Occupational risk: prolonged sedentary desk work (10h/day)",
      "severity": "Low",
      "source_signals": ["questionnaire_office_syndrome"],
      "guideline": "WHO Workers' Health 2008",
      "add_on_triggers": ["msk_assessment", "vision_check"]
    }
  ],

  "comorbidity_tags": [
    {
      "tag": "HTN",
      "label": "Hypertension",
      "onset_year": 2025,
      "organ_risk_tags": ["cv_risk_elevated"],
      "on_treatment": true,
      "treatment_note": "Amlodipine 5mg active"
    },
    {
      "tag": "Dyslipidemia",
      "label": "Dyslipidemia",
      "onset_year": 2022,
      "organ_risk_tags": ["cv_risk_elevated"],
      "on_treatment": true,
      "treatment_note": "Atorvastatin 10mg active"
    },
    {
      "tag": "Prediabetes",
      "label": "Pre-diabetes",
      "onset_year": 2024,
      "organ_risk_tags": ["dm_progression_risk"],
      "on_treatment": false
    },
    {
      "tag": "Hyperuricemia",
      "label": "Hyperuricemia",
      "onset_year": 2026,
      "organ_risk_tags": ["gout_risk"],
      "on_treatment": false
    }
  ],

  "screening_gaps": [
    {
      "screening_id": "colonoscopy",
      "label": "Colonoscopy (colorectal cancer screening)",
      "last_performed_date": "2019-06-12",
      "recommended_interval_months": 60,
      "overdue_days": 2557,
      "overdue_score": 0.98,
      "priority_color": "Red",
      "guideline": "USPSTF Colorectal Cancer Screening 2021 + family Hx adjustment (first-degree < 60 → 5yr interval)",
      "note": "Brother diagnosed age 48 → 5-year interval applies. Last done 2019-06-12. 7yr overdue."
    },
    {
      "screening_id": "lung_ldct",
      "label": "Low-Dose CT (lung cancer screening)",
      "last_performed_date": null,
      "recommended_interval_months": 12,
      "overdue_days": null,
      "overdue_score": 1.0,
      "priority_color": "Red",
      "guideline": "USPSTF Lung Cancer Screening 2021",
      "note": "Never performed. Patient meets all eligibility criteria."
    }
  ],

  "vaccination_gaps": [
    {
      "vaccine_id": "influenza",
      "label": "Influenza (seasonal)",
      "last_administered_date": "2024-10-08",
      "overdue_days": 155,
      "recommended_annual": true,
      "priority_color": "Orange",
      "guideline": "CDC ACIP 2024",
      "note": "Last Oct 2024. Overdue as of Mar 2026 — should have received Oct/Nov 2025."
    },
    {
      "vaccine_id": "pneumococcal",
      "label": "Pneumococcal (PCV20 or PCV15+PPSV23)",
      "last_administered_date": null,
      "overdue_days": null,
      "recommended_at_age": 65,
      "age_at_evaluation": 54,
      "years_until_due": 11,
      "priority_color": "Green",
      "guideline": "CDC ACIP 2022",
      "note": "Not yet indicated (age 54). Flag for reminder at age 65."
    },
    {
      "vaccine_id": "shingrix",
      "label": "Shingles (RZV/Shingrix) — 2-dose series",
      "last_administered_date": null,
      "doses_received": 0,
      "doses_required": 2,
      "overdue_days": null,
      "eligible_since_age": 50,
      "priority_color": "Orange",
      "guideline": "CDC ACIP 2017",
      "note": "Eligible since age 50. Never started. 4 years overdue for initiation."
    },
    {
      "vaccine_id": "hepatitis_b",
      "label": "Hepatitis B — anti-HBs titer check",
      "last_administered_date": "2005-03-01",
      "doses_received": 3,
      "series_complete": true,
      "anti_hbs_checked": false,
      "priority_color": "Yellow",
      "guideline": "AASLD / CDC ACIP",
      "note": "Series complete 2005 but anti-HBs titer never recently re-checked. Recommend titer to confirm immunity."
    }
  ],

  "abnormal_triggers": [
    {
      "trigger_id": "prediabetes_hba1c_repeat",
      "label": "HbA1c 6.1% — pre-diabetic range",
      "source_lab": "hba1c",
      "source_value": 6.1,
      "source_unit": "%",
      "suggested_follow_up": ["hba1c_repeat_12_months", "fasting_glucose_repeat", "dm_lifestyle_program"],
      "urgency": "Routine"
    },
    {
      "trigger_id": "tg_borderline_fibroscan",
      "label": "Triglycerides 182 mg/dL borderline high — NAFLD workup consideration",
      "source_lab": "triglycerides",
      "source_value": 182,
      "source_unit": "mg/dL",
      "suggested_follow_up": ["fatty_liver_workup_consideration"],
      "urgency": "Routine"
    },
    {
      "trigger_id": "uric_acid_elevated",
      "label": "Uric acid 7.4 mg/dL — hyperuricemia",
      "source_lab": "uric_acid",
      "source_value": 7.4,
      "source_unit": "mg/dL",
      "suggested_follow_up": ["uric_acid_recheck_6_months", "dietary_purine_counseling"],
      "urgency": "Routine"
    }
  ],

  "family_history_flags": {
    "ca_breast": false,
    "ca_colon": true,
    "ca_prostate": false,
    "premature_cad": true,
    "premature_cad_detail": "Father, MI age 51 (threshold for males: <55)",
    "ca_colon_detail": "Brother, colon cancer age 48 (onset < 60 → 5yr colonoscopy interval)"
  },

  "behavioral_flags": {
    "smoking": {
      "status": "former",
      "pack_years": 22,
      "quit_years_ago": 3,
      "lung_ct_threshold_met": true
    },
    "alcohol": {
      "audit_c_score": 3,
      "risk_level": "borderline",
      "fibroscan_indicated": false,
      "note": "AUDIT-C 3 is below male threshold of 4. Monitor."
    },
    "occupational": {
      "tags": ["office_syndrome"],
      "add_ons_triggered": ["msk_assessment", "vision_check_annual"]
    },
    "physical_activity": {
      "days_per_week": 1,
      "level": "insufficient",
      "add_ons_triggered": ["exercise_counseling"]
    }
  },

  "symptom_tags": ["fatigue", "neck_pain", "mild_dyspnea_on_exertion"],

  "computed_at": "2026-03-12T03:00:00Z",
  "pipeline_run_id": "pipe_20260312_0300"
}
```

### JSON Schema

```jsonschema
{
  "$schema": "https://json-schema.org/draft/2020-12",
  "$id": "signal-store/get_clinical_signals/response",
  "type": "object",
  "required": [
    "patient_token", "rule_preliminary_tier", "overall_risk_level",
    "applicable_signals", "signals_fired", "missing_signals",
    "risk_flags", "comorbidity_tags", "screening_gaps", "vaccination_gaps",
    "abnormal_triggers", "family_history_flags", "behavioral_flags",
    "symptom_tags", "computed_at"
  ],
  "properties": {
    "patient_token": { "type": "string" },
    "rule_preliminary_tier": {
      "type": "string", "enum": ["Standard", "Advanced", "Premium"],
      "description": "Pre-computed by Clinical Signal Engine + Program Selection Ruleset. Available without get_program_ruleset call. Feeds BAML rule_preliminary_tier and Confidence Calibrator rule_agreement factor."
    },
    "overall_risk_level": { "type": "string", "enum": ["Low", "Moderate", "High"] },
    "applicable_signals": {
      "type": "array", "items": { "type": "string" },
      "description": "All signal IDs evaluated for this patient profile. Denominator of Confidence Calibrator signal_coverage ratio."
    },
    "signals_fired": {
      "type": "array", "items": { "type": "string" },
      "description": "Subset of applicable_signals that evaluated to active. Maps to BAML supporting_signals[]."
    },
    "missing_signals": {
      "type": "array", "items": { "type": "string" },
      "description": "Signals in applicable_signals with no source data available. Maps to BAML missing_signals[]. Feeds Patient High Alert on ROC Dashboard."
    },
    "risk_flags": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["flag_id", "label", "severity", "guideline"],
        "properties": {
          "flag_id": { "type": "string" },
          "label": { "type": "string" },
          "severity": { "type": "string", "enum": ["Low", "Moderate", "High", "Critical"] },
          "source_signals": { "type": "array", "items": { "type": "string" } },
          "guideline": { "type": "string" },
          "add_on_triggers": { "type": "array", "items": { "type": "string" } }
        }
      }
    },
    "comorbidity_tags": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["tag", "label", "onset_year"],
        "properties": {
          "tag": { "type": "string", "examples": ["DM", "HTN", "CKD", "Dyslipidemia", "Prediabetes"] },
          "label": { "type": "string" },
          "onset_year": { "type": "integer" },
          "organ_risk_tags": { "type": "array", "items": { "type": "string" } },
          "on_treatment": { "type": "boolean" },
          "treatment_note": { "type": "string" }
        }
      }
    },
    "screening_gaps": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["screening_id", "label", "priority_color", "guideline"],
        "properties": {
          "screening_id": { "type": "string" },
          "label": { "type": "string" },
          "last_performed_date": { "type": ["string", "null"], "format": "date" },
          "recommended_interval_months": { "type": "integer" },
          "overdue_days": { "type": ["integer", "null"] },
          "overdue_score": {
            "type": ["number", "null"], "minimum": 0.0, "maximum": 1.0,
            "description": "0.0 = not due yet, 1.0 = severely overdue / never done"
          },
          "priority_color": { "type": "string", "enum": ["Red", "Orange", "Yellow", "Green"] },
          "guideline": { "type": "string" },
          "note": { "type": "string" }
        }
      }
    },
    "vaccination_gaps": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["vaccine_id", "label", "priority_color", "guideline"],
        "properties": {
          "vaccine_id": { "type": "string" },
          "label": { "type": "string" },
          "last_administered_date": { "type": ["string", "null"], "format": "date" },
          "overdue_days": { "type": ["integer", "null"] },
          "series_complete": { "type": ["boolean", "null"] },
          "doses_received": { "type": ["integer", "null"] },
          "doses_required": { "type": ["integer", "null"] },
          "priority_color": { "type": "string", "enum": ["Red", "Orange", "Yellow", "Green"] },
          "guideline": { "type": "string" },
          "note": { "type": "string" }
        }
      }
    },
    "abnormal_triggers": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["trigger_id", "label", "suggested_follow_up", "urgency"],
        "properties": {
          "trigger_id": { "type": "string" },
          "label": { "type": "string" },
          "source_lab": { "type": "string" },
          "source_value": { "type": "number" },
          "source_unit": { "type": "string" },
          "suggested_follow_up": { "type": "array", "items": { "type": "string" } },
          "urgency": { "type": "string", "enum": ["Urgent", "Soon", "Routine"] }
        }
      }
    },
    "family_history_flags": {
      "type": "object",
      "required": ["ca_breast", "ca_colon", "ca_prostate", "premature_cad"],
      "properties": {
        "ca_breast": { "type": "boolean" },
        "ca_colon": { "type": "boolean" },
        "ca_prostate": { "type": "boolean" },
        "premature_cad": { "type": "boolean" },
        "premature_cad_detail": { "type": "string" },
        "ca_colon_detail": { "type": "string" }
      }
    },
    "behavioral_flags": {
      "type": "object",
      "properties": {
        "smoking": {
          "type": "object",
          "properties": {
            "status": { "type": "string", "enum": ["current", "former", "never"] },
            "pack_years": { "type": ["number", "null"] },
            "quit_years_ago": { "type": ["number", "null"] },
            "lung_ct_threshold_met": { "type": "boolean" }
          }
        },
        "alcohol": {
          "type": "object",
          "properties": {
            "audit_c_score": { "type": ["number", "null"] },
            "risk_level": { "type": "string", "enum": ["none", "low", "borderline", "at_risk", "dependence_possible"] },
            "fibroscan_indicated": { "type": "boolean" }
          }
        },
        "occupational": {
          "type": "object",
          "properties": {
            "tags": { "type": "array", "items": { "type": "string" }, "examples": [["office_syndrome", "night_shift", "chemical_exposure"]] },
            "add_ons_triggered": { "type": "array", "items": { "type": "string" } }
          }
        },
        "physical_activity": {
          "type": "object",
          "properties": {
            "days_per_week": { "type": ["integer", "null"] },
            "level": { "type": "string", "enum": ["sufficient", "insufficient", "sedentary", "unknown"] }
          }
        }
      }
    },
    "symptom_tags": {
      "type": "array", "items": { "type": "string" },
      "examples": [["palpitations", "fatigue", "chest_pain", "dyspnea_on_exertion", "neck_pain"]]
    },
    "computed_at": { "type": "string", "format": "date-time" },
    "pipeline_run_id": { "type": "string" }
  }
}
```

---

## Tool 3 — `get_biomarker_trends(patient_token)`

### Purpose
Returns pre-computed quantitative biomarker data: current lab values, trend directions, velocities (rate of change per year), and the pre-computed ASCVD 10-year cardiovascular risk score. This is the data the AI needs for numerical reasoning and trend-based justification.

### Example Response — Somchai W.

```json
{
  "patient_token": "tok_hmac_56291047",

  "bmi": {
    "current": 26.7,
    "unit": "kg/m2",
    "threshold_profile": "asian_adjusted",
    "category": "Overweight",
    "trend_direction": "increasing",
    "slope_per_year": 0.9,
    "history": [
      { "date": "2023-08-05", "value": 24.9 },
      { "date": "2024-11-20", "value": 25.8 },
      { "date": "2026-02-15", "value": 26.7 }
    ],
    "alert": "BMI increasing at 0.9 kg/m²/year (Asian-adjusted overweight threshold: ≥23)"
  },

  "blood_pressure": {
    "latest": { "sbp": 138, "dbp": 88, "date": "2026-02-15" },
    "unit": "mmHg",
    "category": "Stage1_HTN",
    "category_label": "Stage 1 Hypertension (ACC/AHA 2017: SBP 130–139 OR DBP 80–89)",
    "trend_direction": "increasing",
    "sbp_slope_per_year": 3.8,
    "history": [
      { "date": "2023-08-05", "sbp": 128, "dbp": 82 },
      { "date": "2024-11-20", "sbp": 134, "dbp": 85 },
      { "date": "2026-02-15", "sbp": 138, "dbp": 88 }
    ],
    "alert": "BP worsening trend. On Amlodipine 5mg — suboptimal control."
  },

  "egfr": {
    "current": 82,
    "unit": "mL/min/1.73m2",
    "loinc_code": "62238-1",
    "ckd_stage": "G2",
    "ckd_stage_label": "CKD Stage G2 — Mildly decreased (60–89)",
    "annual_slope": -2.0,
    "rapid_progression": false,
    "rapid_progression_threshold": -5.0,
    "history": [
      { "date": "2023-08-05", "value": 88 },
      { "date": "2024-11-20", "value": 85 },
      { "date": "2026-02-15", "value": 82 }
    ],
    "alert": null
  },

  "labs": [
    {
      "lab_id": "fbs",
      "label": "Fasting Blood Glucose",
      "loinc_code": "1558-6",
      "current_value": 108,
      "unit": "mg/dL",
      "reference_range": { "low": 70, "high": 99 },
      "interpretation": "H",
      "category": "Prediabetic",
      "velocity_per_year": 6.0,
      "trend_direction": "increasing",
      "trend_flag": "worsening",
      "history": [
        { "date": "2023-08-05", "value": 96 },
        { "date": "2024-11-20", "value": 102 },
        { "date": "2026-02-15", "value": 108 }
      ]
    },
    {
      "lab_id": "hba1c",
      "label": "HbA1c",
      "loinc_code": "4548-4",
      "current_value": 6.1,
      "unit": "%",
      "reference_range": { "high": 5.7 },
      "interpretation": "H",
      "category": "Prediabetic (5.7–6.4%)",
      "velocity_per_year": 0.16,
      "trend_direction": "increasing",
      "trend_flag": "worsening",
      "history": [
        { "date": "2024-11-20", "value": 5.9 },
        { "date": "2026-02-15", "value": 6.1 }
      ],
      "trend_data_note": "Only 2 data points — velocity estimate less reliable"
    },
    {
      "lab_id": "ldl",
      "label": "LDL Cholesterol (calculated)",
      "loinc_code": "13457-7",
      "current_value": 148,
      "unit": "mg/dL",
      "reference_range": { "optimal": 100, "borderline_high_low": 130, "borderline_high_high": 159 },
      "interpretation": "H",
      "category": "Borderline High (130–159 mg/dL)",
      "velocity_per_year": 13.0,
      "trend_direction": "increasing",
      "trend_flag": "worsening",
      "history": [
        { "date": "2023-08-05", "value": 122 },
        { "date": "2024-11-20", "value": 135 },
        { "date": "2026-02-15", "value": 148 }
      ],
      "alert": "LDL increasing despite Atorvastatin 10mg. Consider statin intensification."
    },
    {
      "lab_id": "hdl",
      "label": "HDL Cholesterol",
      "loinc_code": "2085-9",
      "current_value": 42,
      "unit": "mg/dL",
      "reference_range": { "low_male": 40, "protective": 60 },
      "interpretation": "L",
      "category": "Low (male: < 40 mg/dL threshold)",
      "velocity_per_year": null,
      "trend_direction": "insufficient_data",
      "history": [
        { "date": "2026-02-15", "value": 42 }
      ]
    },
    {
      "lab_id": "triglycerides",
      "label": "Triglycerides",
      "loinc_code": "2571-8",
      "current_value": 182,
      "unit": "mg/dL",
      "reference_range": { "normal_high": 150, "borderline_high": 199 },
      "interpretation": "H",
      "category": "Borderline High (150–199 mg/dL)",
      "velocity_per_year": 17.0,
      "trend_direction": "increasing",
      "trend_flag": "worsening",
      "history": [
        { "date": "2024-11-20", "value": 165 },
        { "date": "2026-02-15", "value": 182 }
      ]
    },
    {
      "lab_id": "total_cholesterol",
      "label": "Total Cholesterol",
      "loinc_code": "2093-3",
      "current_value": 218,
      "unit": "mg/dL",
      "reference_range": { "desirable_high": 200, "borderline_high": 239 },
      "interpretation": "H",
      "category": "Borderline High (200–239 mg/dL)",
      "velocity_per_year": null,
      "trend_direction": "insufficient_data",
      "history": [{ "date": "2026-02-15", "value": 218 }]
    },
    {
      "lab_id": "alt",
      "label": "ALT (SGPT)",
      "loinc_code": "1742-6",
      "current_value": 38,
      "unit": "U/L",
      "reference_range": { "uln_male": 40 },
      "interpretation": "N",
      "category": "Normal",
      "velocity_per_year": null,
      "trend_direction": "insufficient_data",
      "history": [{ "date": "2026-02-15", "value": 38 }]
    },
    {
      "lab_id": "ast",
      "label": "AST (SGOT)",
      "loinc_code": "1920-8",
      "current_value": 34,
      "unit": "U/L",
      "reference_range": { "uln": 40 },
      "interpretation": "N",
      "category": "Normal",
      "velocity_per_year": null,
      "trend_direction": "insufficient_data",
      "history": [{ "date": "2026-02-15", "value": 34 }]
    },
    {
      "lab_id": "creatinine",
      "label": "Creatinine (serum)",
      "loinc_code": "2160-0",
      "current_value": 1.0,
      "unit": "mg/dL",
      "reference_range": { "low": 0.7, "high": 1.3 },
      "interpretation": "N",
      "category": "Normal",
      "velocity_per_year": null,
      "trend_direction": "insufficient_data",
      "history": [{ "date": "2026-02-15", "value": 1.0 }]
    },
    {
      "lab_id": "tsh",
      "label": "TSH (Thyroid Stimulating Hormone)",
      "loinc_code": "3016-3",
      "current_value": 2.1,
      "unit": "mIU/L",
      "reference_range": { "low": 0.4, "high": 4.0 },
      "interpretation": "N",
      "category": "Normal",
      "velocity_per_year": null,
      "trend_direction": "insufficient_data",
      "history": [{ "date": "2026-02-15", "value": 2.1 }]
    },
    {
      "lab_id": "psa",
      "label": "PSA (total) — shared decision-making context",
      "loinc_code": "2857-1",
      "current_value": 1.8,
      "unit": "ng/mL",
      "reference_range": { "age_adjusted_uln_50s": 3.5 },
      "interpretation": "N",
      "category": "Normal (age 54, institutional ULN for 50s: <3.5)",
      "sdm_note": "PSA result is for SDM discussion only (USPSTF 2018, ACS 2023). Not a binary abnormal/normal action threshold.",
      "velocity_per_year": null,
      "trend_direction": "insufficient_data",
      "history": [{ "date": "2024-11-20", "value": 1.8 }]
    },
    {
      "lab_id": "uric_acid",
      "label": "Uric Acid",
      "loinc_code": "3084-1",
      "current_value": 7.4,
      "unit": "mg/dL",
      "reference_range": { "uln_male": 7.0 },
      "interpretation": "H",
      "category": "Hyperuricemia (>7.0 mg/dL for males)",
      "velocity_per_year": null,
      "trend_direction": "insufficient_data",
      "history": [{ "date": "2026-02-15", "value": 7.4 }]
    }
  ],

  "ascvd_10yr_risk": {
    "score": 0.082,
    "score_pct": 8.2,
    "category": "Intermediate",
    "category_label": "Intermediate risk (7.5–10%) — ACC/AHA Pooled Cohort Equations",
    "inputs_used": {
      "age": 54,
      "sex": "male",
      "race": "other",
      "total_cholesterol": 218,
      "hdl": 42,
      "systolic_bp": 138,
      "bp_treatment": true,
      "diabetes": false,
      "smoking": "former"
    },
    "guideline": "ACC/AHA Pooled Cohort Equations 2013/2018",
    "note": "Race 'other' uses non-specific coefficients — score may underestimate risk for Asian males"
  },

  "waist_circumference": {
    "value": 91,
    "unit": "cm",
    "threshold_male_asian": 90,
    "category": "Above threshold",
    "note": "Waist 91cm > Asian male threshold 90cm — abdominal obesity"
  },

  "computed_at": "2026-03-12T03:00:00Z",
  "pipeline_run_id": "pipe_20260312_0300"
}
```

### JSON Schema — `get_biomarker_trends` (abbreviated)

```jsonschema
{
  "$schema": "https://json-schema.org/draft/2020-12",
  "$id": "signal-store/get_biomarker_trends/response",
  "type": "object",
  "required": ["patient_token", "bmi", "blood_pressure", "egfr", "labs", "ascvd_10yr_risk", "computed_at"],
  "properties": {
    "patient_token": { "type": "string" },
    "bmi": {
      "type": "object",
      "required": ["current", "unit", "category", "trend_direction", "slope_per_year"],
      "properties": {
        "current": { "type": "number" },
        "unit": { "type": "string", "const": "kg/m2" },
        "threshold_profile": { "type": "string", "enum": ["asian_adjusted", "who_global"] },
        "category": { "type": "string", "enum": ["Underweight", "Normal", "Overweight", "Obese", "Morbidly_Obese"] },
        "trend_direction": { "type": "string", "enum": ["increasing", "stable", "decreasing", "insufficient_data"] },
        "slope_per_year": { "type": ["number", "null"], "description": "Annualized BMI slope from linear regression of ≥3 data points. null if < 3 points." },
        "history": { "type": "array", "items": { "type": "object", "properties": { "date": { "type": "string" }, "value": { "type": "number" } } } },
        "alert": { "type": ["string", "null"] }
      }
    },
    "blood_pressure": {
      "type": "object",
      "required": ["latest", "category", "trend_direction"],
      "properties": {
        "latest": { "type": "object", "properties": { "sbp": { "type": "integer" }, "dbp": { "type": "integer" }, "date": { "type": "string" } } },
        "unit": { "type": "string", "const": "mmHg" },
        "category": { "type": "string", "enum": ["Normal", "Elevated", "Stage1_HTN", "Stage2_HTN", "Crisis"] },
        "trend_direction": { "type": "string", "enum": ["increasing", "stable", "decreasing", "insufficient_data"] },
        "sbp_slope_per_year": { "type": ["number", "null"] },
        "history": { "type": "array" },
        "alert": { "type": ["string", "null"] }
      }
    },
    "egfr": {
      "type": "object",
      "required": ["current", "ckd_stage", "annual_slope", "rapid_progression"],
      "properties": {
        "current": { "type": "number" },
        "unit": { "type": "string", "const": "mL/min/1.73m2" },
        "loinc_code": { "type": "string" },
        "ckd_stage": { "type": "string", "enum": ["G1", "G2", "G3a", "G3b", "G4", "G5"] },
        "annual_slope": { "type": ["number", "null"], "description": "Negative = declining. > -5 = rapid progression (KDIGO 2022)." },
        "rapid_progression": { "type": "boolean" },
        "rapid_progression_threshold": { "type": "number", "const": -5.0 },
        "history": { "type": "array" },
        "alert": { "type": ["string", "null"] }
      }
    },
    "labs": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["lab_id", "label", "loinc_code", "current_value", "unit", "interpretation", "trend_direction"],
        "properties": {
          "lab_id": { "type": "string" },
          "label": { "type": "string" },
          "loinc_code": { "type": "string" },
          "current_value": { "type": "number" },
          "unit": { "type": "string" },
          "reference_range": { "type": "object" },
          "interpretation": { "type": "string", "enum": ["N", "H", "L", "HH", "LL", "A"] },
          "category": { "type": "string" },
          "velocity_per_year": {
            "type": ["number", "null"],
            "description": "Rate of change per year from linear regression. null if < 3 data points."
          },
          "trend_direction": { "type": "string", "enum": ["increasing", "stable", "decreasing", "insufficient_data"] },
          "trend_flag": { "type": ["string", "null"], "enum": ["worsening", "improving", "stable", null] },
          "history": { "type": "array", "items": { "type": "object" } },
          "alert": { "type": ["string", "null"] }
        }
      }
    },
    "ascvd_10yr_risk": {
      "type": "object",
      "required": ["score", "score_pct", "category"],
      "properties": {
        "score": { "type": "number", "minimum": 0.0, "maximum": 1.0 },
        "score_pct": { "type": "number" },
        "category": { "type": "string", "enum": ["Low", "Borderline", "Intermediate", "High", "Very_High"] },
        "category_label": { "type": "string" },
        "inputs_used": { "type": "object" },
        "guideline": { "type": "string" },
        "note": { "type": "string" }
      }
    },
    "waist_circumference": { "type": "object" },
    "computed_at": { "type": "string", "format": "date-time" },
    "pipeline_run_id": { "type": "string" }
  }
}
```

---

## Signal Store DB Record Structure

This section describes what the Clinical Signal Engine **writes** to the Signal Store. The MCP tools read and project subsets of this record.

```json
{
  "_schema": "signal_store_record_v1",
  "patient_token": "tok_hmac_56291047",
  "computed_at": "2026-03-12T03:00:00Z",
  "pipeline_run_id": "pipe_20260312_0300",
  "fhir_snapshot_version": "fhir_snap_20260312",

  "hard_constraints": { /* → returned by get_hard_constraints */ },
  "clinical_signals": { /* → returned by get_clinical_signals */ },
  "biomarker_trends": { /* → returned by get_biomarker_trends */ },

  "_meta": {
    "data_completeness_ratio": 0.89,
    "total_key_fields": 45,
    "populated_key_fields": 40,
    "missing_data_fields": ["reproductive_history", "frax_score", "sleep_apnea_result", "physical_activity_days"]
  }
}
```

**Key fields for Confidence Calibrator:**

| Field | Used By | Formula Slot |
|---|---|---|
| `clinical_signals.applicable_signals` | Confidence Calibrator | `applicable_signals_for_this_patient` (denominator) |
| `clinical_signals.signals_fired` | Confidence Calibrator | `signals_fired` (numerator of `signal_coverage`) |
| `_meta.data_completeness_ratio` | Confidence Calibrator | `data_completeness` |
| `clinical_signals.rule_preliminary_tier` | Confidence Calibrator | `rule_agreement` comparison vs `ai_recommended_tier` |

**Confidence formula (from component inventory §2.5):**
```
signal_coverage   = len(signals_fired) / len(applicable_signals)
data_completeness = populated_key_fields / total_key_fields
rule_agreement    = 1.0 if ai_recommended_tier == rule_preliminary_tier else 0.7

confidence_score  = (0.4 × signal_coverage) + (0.4 × data_completeness) + (0.2 × rule_agreement)
```

**For Somchai W.:**
```
signal_coverage   = 23 / 35 = 0.657
data_completeness = 40 / 45 = 0.889
rule_agreement    = 1.0 (assuming AI agrees with Advanced tier)

confidence_score  = (0.4 × 0.657) + (0.4 × 0.889) + (0.2 × 1.0)
                  = 0.263 + 0.356 + 0.200
                  = 0.819  → confidence_tier: "High"
```

---

## Field Dictionary — Complete Signal ID Catalog

All signal IDs used in `applicable_signals[]`, `signals_fired[]`, and `missing_signals[]`.

| Signal ID | Category | Guideline | Source FHIR Path |
|---|---|---|---|
| `fbs_status` | Lab | ADA 2024 | `Observation` LOINC `1558-6` |
| `hba1c_status` | Lab | ADA 2024 | `Observation` LOINC `4548-4` |
| `ldl_status` | Lab | ACC/AHA 2018 | `Observation` LOINC `13457-7` |
| `hdl_status` | Lab | ACC/AHA 2018 | `Observation` LOINC `2085-9` |
| `tg_status` | Lab | ACC/AHA 2018 | `Observation` LOINC `2571-8` |
| `alt_status` | Lab | AASLD 2023 | `Observation` LOINC `1742-6` |
| `ast_status` | Lab | AASLD 2023 | `Observation` LOINC `1920-8` |
| `egfr_status` | Lab | KDIGO 2022 | `Observation` LOINC `62238-1` |
| `tsh_status` | Lab | ATA 2014 | `Observation` LOINC `3016-3` |
| `psa_sdm_status` | Lab (male only) | ACS 2023, USPSTF 2018 | `Observation` LOINC `2857-1` |
| `uric_acid_status` | Lab | ACR 2020 | `Observation` LOINC `3084-1` |
| `bp_category` | Vital | ACC/AHA 2017 | `Observation` LOINC `85354-9` |
| `bmi_status` | Vital | WHO Asia-Pacific 2000 | `Observation` LOINC `39156-5` |
| `colonoscopy_screening_gap` | Screening | USPSTF 2021 | `Procedure` CPT `45378` |
| `mammogram_screening_gap` | Screening (female only) | USPSTF 2024 | `Procedure` CPT `77067` |
| `pap_smear_screening_gap` | Screening (female 21–65) | USPSTF 2018 | `Procedure` CPT `88141` |
| `lung_ldct_gap` | Screening | USPSTF 2021 | `Procedure` CPT `71250` |
| `dexa_screening_gap` | Screening (female ≥65) | USPSTF 2018 | `Procedure` CPT `77080` |
| `chest_xray_gap` | Screening | Clinical practice | `Procedure` CPT `71046` |
| `ecg_gap` | Screening | Clinical practice | `Procedure` CPT `93000` |
| `est_gap` | Screening | AHA/ACC 2002 | `Procedure` CPT `93015` |
| `echo_gap` | Screening | Clinical practice | `Procedure` CPT `93306` |
| `influenza_vaccination_gap` | Vaccination | CDC ACIP 2024 | `Immunization` CVX `141`/`158` |
| `hepatitis_b_vaccination_status` | Vaccination | CDC ACIP 2022 | `Immunization` CVX `08`/`189` |
| `hpv_vaccination_gap` | Vaccination (≤45) | CDC ACIP 2023 | `Immunization` CVX `137`/`165` |
| `pneumococcal_vaccination_gap` | Vaccination (≥65) | CDC ACIP 2022 | `Immunization` CVX `133`/`152`/`215`/`216` |
| `shingrix_vaccination_gap` | Vaccination (≥50) | CDC ACIP 2017 | `Immunization` CVX `187` |
| `family_hx_premature_cad` | Family History | ACC/AHA Risk Enhancers | `FamilyMemberHistory` |
| `family_hx_breast_ca` | Family History (female) | ACS 2023 | `FamilyMemberHistory` |
| `family_hx_colon_ca` | Family History | USPSTF 2021 | `FamilyMemberHistory` |
| `family_hx_prostate_ca` | Family History (male) | ACS 2023 | `FamilyMemberHistory` |
| `smoking_status` | Behavioral | USPSTF 2021 | `Observation` LOINC `72166-2` |
| `lung_ct_threshold` | Behavioral | USPSTF 2021 | Computed from `8663-7` + `72166-2` |
| `alcohol_risk` | Behavioral | NIAAA | `Observation` LOINC `74013-4` |
| `occupational_risk` | Behavioral | WHO 2008 | `QuestionnaireResponse` |
| `dm_comorbidity` | Comorbidity | — | `Condition` SNOMED `44054006` |
| `htn_comorbidity` | Comorbidity | — | `Condition` SNOMED `38341003` |
| `ckd_comorbidity` | Comorbidity | — | `Condition` SNOMED `709044004` |
| `dyslipidemia_comorbidity` | Comorbidity | — | `Condition` SNOMED `370992007` |
| `ascvd_10yr_risk_status` | Computed | ACC/AHA 2013/2018 | Computed from multiple Observations |
| `dm_organ_complication_screening` | Comorbidity (DM only) | ADA 2024 | Derived from DM comorbidity tag |
| `fibroscan_indication` | Lab/Behavioral | AASLD 2023 | Derived from ALT + AUDIT-C + TG |
| `reproductive_history` | Historical (female only) | — | `QuestionnaireResponse` |
| `frax_bone_density_risk` | Computed (female <65) | USPSTF 2018 | Computed from age + risk factors |
| `sleep_apnea_screen_result` | Behavioral | Clinical practice | `QuestionnaireResponse` |
| `physical_activity_level` | Behavioral | WHO 2020 | `QuestionnaireResponse` |

---

*End of Signal Store Data Contract v1.0*
*Companion documents: `fhir-discovery-report.md`, `clinical-guidelines-reference.md`, `sample_patient_checkup.json`*
*Next: Ruleset Store Contract (deferred), BAML schema file (.baml)*
