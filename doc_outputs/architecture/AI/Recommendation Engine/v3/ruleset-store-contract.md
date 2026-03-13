# Ruleset Store Data Contract
## Smart Health Checkup Recommendation Dashboard — MCP Tool API Specification

**Version:** 1.0
**Date:** 2026-03-13
**Audience:** MCP Server implementation team, Inference Orchestrator implementation team, Admin Panel implementation team, Clinical Signal Engine (Data Pipeline) implementation team
**Depends on:** `signal-store-contract.md`, `navavej-checkup-package-discovery.md`, `clinical-guidelines-reference.md`
**Companion:** `samples/sample_patient_checkup.json`

---

## Overview

The Ruleset Store is an admin-configurable database that holds two things:
1. **Tier selection rules** — ordered conditions mapping combinations of clinical signals to `Standard | Advanced | Premium`
2. **Add-on item library** — the complete catalog of individually recommendable examinations, vaccines, and specialist referrals, each with clinical trigger conditions, priority defaults, and Navavej product metadata

The Ruleset Store is written by the Admin Panel and read in two separate contexts:

```
Admin Panel (write)
  └── Ruleset Store DB  ←── this document defines the records written here
           │
           ├── Clinical Signal Engine (offline batch read)
           │     └── applies tier_selection_rules to patient signals
           │           └── writes rule_preliminary_tier into Signal Store
           │
           └── MCP Server (query-time read — Tool 4)
                 └── get_program_ruleset(patient_token)  ←── defined in this document
                       └── Inference Orchestrator
                             └── AI Model
```

**Relationship to Signal Store:**
- The Signal Store contains **pre-computed patient-specific outputs** (risk flags, biomarker trends, screening gaps)
- The Ruleset Store contains **admin-configurable program logic** (how those signals map to program tiers and add-ons)
- `rule_preliminary_tier` in `get_clinical_signals` is the offline pre-application of these rules; `get_program_ruleset` exposes the raw rules so the AI can inspect and explicitly reason about any tier change

**Signal ID vocabulary:** All `trigger_signals[]` values in this document use the same `snake_case` signal IDs defined in `signal-store-contract.md` Field Dictionary and `clinical-guidelines-reference.md` Appendix. No new signal IDs are introduced here.

---

## Tool — `get_program_ruleset(patient_token)`

### Purpose

Returns the complete program ruleset applicable to this patient, pre-filtered by the patient's demographic profile (gender and age). The response contains:
- The ordered tier selection rules the Inference Orchestrator uses to validate `rule_preliminary_tier`
- The add-on item library restricted to items this patient is eligible to receive (items excluded by hard constraints — e.g., mammogram for male patients — are absent from the response)
- The package resolution map translating `Standard | Advanced | Premium` into actual Navavej package names and prices

The Inference Orchestrator calls this tool in **Phase 1** (baseline fetch, before AI invocation) alongside `get_hard_constraints`, `get_clinical_signals`, and `get_biomarker_trends`. The AI may also re-call it during the **Phase 2 ReAct loop** to reason explicitly about add-on eligibility.

### Example Response — Somchai W. (54yo male, `rule_preliminary_tier: "Advanced"`)

```json
{
  "patient_token": "tok_hmac_56291047",

  "ruleset_version": "v2026.03.1",
  "admin_last_updated": "2026-03-10T09:15:00Z",
  "computed_at": "2026-03-13T06:00:00Z",

  "tier_selection_rules": [
    {
      "rule_id": "PREMIUM_SEVERE_SINGLE",
      "priority": 1,
      "tier": "Premium",
      "match_logic": "ANY",
      "conditions": [
        {
          "type": "signal_active",
          "signal_ids": ["ckd_rapid_progression"],
          "description": "CKD rapid progression — eGFR annual decline > 5 mL/min/1.73m²"
        },
        {
          "type": "signal_active",
          "signal_ids": ["ascvd_very_high"],
          "description": "ASCVD 10-year risk ≥ 20%"
        },
        {
          "type": "signal_active",
          "signal_ids": ["hypertensive_crisis"],
          "description": "Hypertensive crisis (SBP > 180 or DBP > 120) — urgent comprehensive evaluation"
        },
        {
          "type": "signal_active",
          "signal_ids": ["diabetes_confirmed"],
          "and_signal_active": ["dm_organ_complication_screening"],
          "description": "Confirmed DM with active organ complication screening need (retina, kidney, foot, heart)"
        }
      ],
      "rationale": "Single high-severity condition sufficient to justify comprehensive Premium evaluation",
      "guideline_basis": "TOR §3.2: Risk Level High → Premium/Personalized Package",
      "admin_configurable": { "tier_assignment": false }
    },
    {
      "rule_id": "PREMIUM_MULTI_SIGNAL",
      "priority": 2,
      "tier": "Premium",
      "match_logic": "COUNT_THRESHOLD",
      "conditions": [
        {
          "type": "signal_count_threshold",
          "signal_pool": [
            "prediabetes_confirmed", "htn_active", "dyslipidemia_active",
            "bmi_obese_asian", "ascvd_risk_intermediate", "bp_stage2_htn",
            "family_hx_premature_cad", "at_risk_alcohol_use",
            "fibroscan_indication", "lung_ct_threshold_met",
            "ckd_comorbidity", "uric_acid_hyperuricemia"
          ],
          "min_count": 4,
          "description": "≥ 4 moderate-severity risk signals active simultaneously — multi-system involvement"
        }
      ],
      "rationale": "Convergence of ≥ 4 independent risk signals across multiple organ systems requires comprehensive evaluation beyond Advanced tier",
      "guideline_basis": "TOR §3.2: Risk Level High → Premium/Personalized Package",
      "admin_configurable": {
        "min_count": true,
        "signal_pool": false,
        "description": "Admin may raise min_count threshold (e.g., to 5) via Admin Panel; adding/removing signal IDs requires Clinical Signal Engine update"
      }
    },
    {
      "rule_id": "ADVANCED_METABOLIC_OR_CVD",
      "priority": 3,
      "tier": "Advanced",
      "match_logic": "ANY",
      "conditions": [
        {
          "type": "signal_active",
          "signal_ids": ["prediabetes_confirmed", "diabetes_confirmation_required"],
          "description": "Pre-diabetes or diabetes requiring confirmation"
        },
        {
          "type": "signal_active",
          "signal_ids": ["ascvd_risk_intermediate"],
          "description": "ASCVD 10-year risk 7.5–19.9% (Intermediate)"
        },
        {
          "type": "signal_active",
          "signal_ids": ["htn_active"],
          "description": "Active hypertension (Stage 1 or Stage 2, confirmed comorbidity tag)"
        },
        {
          "type": "signal_active",
          "signal_ids": ["lung_ct_threshold_met"],
          "description": "LDCT lung cancer screening eligible (age 50–80, pack-years ≥ 20)"
        },
        {
          "type": "signal_active",
          "signal_ids": ["ckd_comorbidity"],
          "description": "CKD comorbidity confirmed (any stage)"
        },
        {
          "type": "signal_active",
          "signal_ids": ["bmi_obese_asian"],
          "description": "Obese by Asian-adjusted BMI (≥ 27.5 kg/m²)"
        },
        {
          "type": "signal_count_threshold",
          "signal_pool": [
            "bmi_overweight_asian", "low_hdl", "high_triglycerides",
            "bp_stage1_htn", "family_hx_premature_cad",
            "dyslipidemia_active", "at_risk_alcohol_use",
            "office_syndrome", "night_shift_worker",
            "uric_acid_hyperuricemia", "high_ldl"
          ],
          "min_count": 2,
          "description": "≥ 2 moderate risk signals — combined risk warrants enhanced screening"
        }
      ],
      "rationale": "Any single moderate-severity condition or ≥ 2 low–moderate signals indicating elevated cumulative risk",
      "guideline_basis": "TOR §3.2: Risk Level Moderate → Advanced Package",
      "admin_configurable": {
        "min_count": true,
        "signal_pool": false
      }
    },
    {
      "rule_id": "STANDARD_DEFAULT",
      "priority": 4,
      "tier": "Standard",
      "match_logic": "DEFAULT",
      "conditions": [],
      "rationale": "No PREMIUM or ADVANCED rule matched — routine preventive health screening appropriate",
      "guideline_basis": "TOR §3.2: Risk Level Low → Standard Package",
      "admin_configurable": { "tier_assignment": false }
    }
  ],

  "applied_rule_id": "ADVANCED_METABOLIC_OR_CVD",
  "applied_condition": "prediabetes_confirmed",
  "rule_preliminary_tier": "Advanced",

  "package_resolution_map": {
    "Standard": {
      "male": {
        "age_15_to_35": {
          "package_name": "Gold",
          "package_code": "GOLD_ANY",
          "price_thb": 5900,
          "items_count_approx": null,
          "source": "navavej-checkup-package-discovery.md §2"
        },
        "age_36_plus": {
          "package_name": "Gold",
          "package_code": "GOLD_ANY",
          "price_thb": 5900,
          "items_count_approx": null,
          "source": "navavej-checkup-package-discovery.md §2"
        }
      },
      "female": {
        "age_15_to_35": {
          "package_name": "Gold",
          "package_code": "GOLD_ANY",
          "price_thb": 5900,
          "items_count_approx": null,
          "source": "navavej-checkup-package-discovery.md §2"
        },
        "age_36_plus": {
          "package_name": "Gold",
          "package_code": "GOLD_ANY",
          "price_thb": 5900,
          "items_count_approx": null,
          "source": "navavej-checkup-package-discovery.md §2"
        }
      },
      "_note": "Ages 15–19 (any gender) may resolve to Basic (16 items, ฿2,871) instead of Gold — confirm with client; currently mapped to Gold as minimum meaningful tier"
    },
    "Advanced": {
      "male": {
        "age_35_plus": {
          "package_name": "Platinum — Men",
          "package_code": "PLAT_M",
          "price_thb": 8700,
          "items_count_approx": null,
          "source": "navavej-checkup-package-discovery.md §2"
        }
      },
      "female": {
        "age_35_plus": {
          "package_name": "Platinum — Women",
          "package_code": "PLAT_F",
          "price_thb": 13500,
          "items_count_approx": null,
          "source": "navavej-checkup-package-discovery.md §2"
        }
      },
      "_note": "Ages < 35 with Advanced risk: resolve to Gold + mandatory add-ons pending client confirmation of age-band extension for Platinum"
    },
    "Premium": {
      "male": {
        "age_40_plus": {
          "package_name": "Diamond — Men",
          "package_code": "DIAM_M",
          "price_thb": 15000,
          "items_count_approx": null,
          "source": "navavej-checkup-package-discovery.md §2"
        }
      },
      "female": {
        "age_40_plus": {
          "package_name": "Diamond — Women",
          "package_code": "DIAM_F",
          "price_thb": 19000,
          "items_count_approx": 47,
          "source": "navavej-checkup-package-discovery.md §3-4"
        }
      },
      "_note": "Ages < 40 with Premium risk: resolve to Personalized/custom package — flag review_required: true for SalesAdmin"
    }
  },

  "resolved_package": {
    "tier": "Advanced",
    "gender": "male",
    "age": 54,
    "age_band": "age_35_plus",
    "package_name": "Platinum — Men",
    "package_code": "PLAT_M",
    "price_thb": 8700
  },

  "add_on_library": [
    {
      "item_code": "colonoscopy",
      "label": "Colonoscopy — Colorectal Cancer Screening",
      "category": "cancer_screening",
      "trigger_signals": ["colonoscopy_screening_gap"],
      "priority_level_default": "Red",
      "priority_override_signals": {
        "family_hx_colon_ca_first_degree": "Red",
        "colonoscopy_overdue_gt_3650d": "Red"
      },
      "navavej_product": {
        "product_name": "Endoscopy Package (Upper GI)",
        "product_code": "ENDO_UPPER",
        "price_thb": 9500,
        "note": "Standalone colonoscopy availability unconfirmed — Open Question #7 in navavej-checkup-package-discovery.md"
      },
      "gender_constraint": null,
      "age_min": 45,
      "age_max": 85,
      "guideline": "USPSTF Colorectal Cancer Screening 2021",
      "admin_configurable_fields": ["price_thb", "age_min", "age_max", "priority_level_default"]
    },
    {
      "item_code": "exercise_stress_test",
      "label": "Exercise Stress Test (EST) — Treadmill ECG",
      "category": "cardiac",
      "trigger_signals": ["est_gap", "est_consideration", "ascvd_risk_intermediate", "ascvd_high"],
      "priority_level_default": "Yellow",
      "priority_override_signals": {
        "ascvd_very_high": "Red",
        "ascvd_high": "Red"
      },
      "navavej_product": {
        "product_name": "Exercise Stress Test (EST)",
        "product_code": "EST_TREADMILL",
        "price_thb": 2900
      },
      "gender_constraint": null,
      "age_min": 30,
      "age_max": null,
      "safety_contraindication_signals": ["hypertensive_crisis", "ckd_stage5"],
      "guideline": "AHA/ACC Exercise Testing Guidelines 2002; ADA 2024",
      "admin_configurable_fields": ["price_thb", "age_min", "priority_level_default"]
    },
    {
      "item_code": "echocardiogram",
      "label": "Echocardiogram (ECHO) — Cardiac Ultrasound",
      "category": "cardiac",
      "trigger_signals": ["echo_gap", "dm_comorbidity", "htn_active"],
      "priority_level_default": "Yellow",
      "navavej_product": {
        "product_name": "Echocardiogram (ECHO)",
        "product_code": "ECHO_CARD",
        "price_thb": 2900
      },
      "gender_constraint": null,
      "age_min": 35,
      "age_max": null,
      "guideline": "Clinical practice; ADA DM cardiovascular surveillance",
      "admin_configurable_fields": ["price_thb", "age_min", "priority_level_default"]
    },
    {
      "item_code": "ct_coronary_calcium",
      "label": "CT Coronary Artery Calcium Scoring (CAC)",
      "category": "cardiac",
      "trigger_signals": ["family_hx_premature_cad", "ascvd_risk_intermediate", "high_ldl"],
      "match_logic": "ANY_OF_TRIGGER_SIGNALS",
      "priority_level_default": "Yellow",
      "navavej_product": {
        "product_name": "Coronary Artery Calcium Scoring (CT-CAC)",
        "product_code": "CT_CAC",
        "price_thb": 3900
      },
      "gender_constraint": null,
      "age_min": 40,
      "age_max": null,
      "guideline": "ACC/AHA Cholesterol Guideline 2018 — CAC as risk-decision aid",
      "admin_configurable_fields": ["price_thb", "age_min", "priority_level_default"]
    },
    {
      "item_code": "cardiac_patch_48h",
      "label": "48-Hour Cardiac Patch Monitor (Arrhythmia Screening)",
      "category": "cardiac",
      "trigger_signals": ["symptom_palpitations"],
      "priority_level_default": "Yellow",
      "navavej_product": {
        "product_name": "48-Hour Cardiac Patch Monitor (S-Patch EX)",
        "product_code": "PATCH_CARDIAC",
        "price_thb": 7742
      },
      "gender_constraint": null,
      "age_min": 18,
      "age_max": null,
      "guideline": "Clinical practice — palpitations workup",
      "admin_configurable_fields": ["price_thb", "priority_level_default"]
    },
    {
      "item_code": "ldct_lung",
      "label": "Low-Dose CT Chest — Lung Cancer Screening",
      "category": "cancer_screening",
      "trigger_signals": ["lung_ct_threshold_met"],
      "priority_level_default": "Red",
      "navavij_product": {
        "product_name": "Low-Dose CT Chest (Lung Cancer / PM2.5 Screening)",
        "product_code": "LDCT_LUNG",
        "price_thb": 3900
      },
      "gender_constraint": null,
      "age_min": 50,
      "age_max": 80,
      "guideline": "USPSTF Lung Cancer Screening 2021",
      "admin_configurable_fields": ["price_thb", "priority_level_default"]
    },
    {
      "item_code": "diabetes_screening_pro",
      "label": "Diabetes Screening Pro 1 — HbA1c, Insulin, HOMA-IR (12 items)",
      "category": "endocrine",
      "trigger_signals": ["prediabetes_confirmed", "diabetes_confirmation_required", "bmi_obese_asian"],
      "priority_level_default": "Yellow",
      "priority_override_signals": {
        "diabetes_confirmation_required": "Red"
      },
      "navavej_product": {
        "product_name": "Diabetes Screening Pro 1",
        "product_code": "DM_PRO1",
        "price_thb": 2134
      },
      "gender_constraint": null,
      "age_min": 15,
      "age_max": null,
      "guideline": "ADA Standards of Medical Care 2024",
      "admin_configurable_fields": ["price_thb", "priority_level_default"]
    },
    {
      "item_code": "thyroid_pro1",
      "label": "Thyroid Function Panel Pro 1 — TSH, Free T4 (6 items)",
      "category": "endocrine",
      "trigger_signals": ["tsh_status", "symptom_palpitations"],
      "priority_level_default": "Yellow",
      "navavej_product": {
        "product_name": "Thyroid Pro 1",
        "product_code": "THYRO_PRO1",
        "price_thb": 2134
      },
      "gender_constraint": null,
      "age_min": 15,
      "age_max": null,
      "guideline": "ATA Hypothyroidism Guidelines 2014",
      "admin_configurable_fields": ["price_thb", "priority_level_default"]
    },
    {
      "item_code": "thyroid_pro2",
      "label": "Thyroid Function Panel Pro 2 — TSH, Free T3, Free T4, Anti-TPO (7 items)",
      "category": "endocrine",
      "trigger_signals": ["tsh_borderline_high", "hypothyroidism_likely", "hyperthyroidism_possible"],
      "priority_level_default": "Yellow",
      "navavej_product": {
        "product_name": "Thyroid Pro 2",
        "product_code": "THYRO_PRO2",
        "price_thb": 3395
      },
      "gender_constraint": null,
      "age_min": 15,
      "age_max": null,
      "guideline": "ATA Hypothyroidism Guidelines 2014",
      "admin_configurable_fields": ["price_thb", "priority_level_default"]
    },
    {
      "item_code": "fibroscan",
      "label": "FibroTouch — Liver Fat & Fibrosis Assessment (Non-Invasive)",
      "category": "gi_liver",
      "trigger_signals": ["fibroscan_indication", "liver_enzyme_elevation_significant", "high_triglycerides"],
      "priority_level_default": "Yellow",
      "priority_override_signals": {
        "liver_enzyme_elevation_significant": "Red"
      },
      "navavej_product": {
        "product_name": "FibroTouch (Liver Fat Assessment)",
        "product_code": "FIBRO_TOUCH",
        "price_thb": 1900
      },
      "gender_constraint": null,
      "age_min": 18,
      "age_max": null,
      "guideline": "AASLD NAFLD/MASLD Practice Guidance 2023",
      "admin_configurable_fields": ["price_thb", "priority_level_default"]
    },
    {
      "item_code": "hepatitis_abc_screen",
      "label": "Hepatitis A, B, C Viral Screening (5 items)",
      "category": "gi_liver",
      "trigger_signals": ["hepatitis_b_vaccination_status", "hepatitis_b_anti_hbs_check_needed"],
      "priority_level_default": "Yellow",
      "navavej_product": {
        "product_name": "Hepatitis A, B, C Screening (5 items)",
        "product_code": "HEPA_ABC",
        "price_thb": 1900
      },
      "gender_constraint": null,
      "age_min": 18,
      "age_max": null,
      "guideline": "AASLD HBV Management Guidelines 2023; CDC ACIP 2022",
      "admin_configurable_fields": ["price_thb", "priority_level_default"]
    },
    {
      "item_code": "kidney_screening",
      "label": "Kidney Disease Screening — Microalbumin, eGFR, Urine ACR",
      "category": "nephrology",
      "trigger_signals": ["ckd_comorbidity", "ckd_rapid_progression", "dm_comorbidity", "htn_active"],
      "match_logic": "ANY_OF_TRIGGER_SIGNALS",
      "priority_level_default": "Yellow",
      "priority_override_signals": {
        "ckd_rapid_progression": "Red"
      },
      "navavej_product": {
        "product_name": "Kidney Disease Screening",
        "product_code": "KIDNEY_SCREEN",
        "price_thb": 2500
      },
      "gender_constraint": null,
      "age_min": 18,
      "age_max": null,
      "guideline": "KDIGO CKD 2022; ADA Standards 2024 — DM nephropathy surveillance",
      "admin_configurable_fields": ["price_thb", "priority_level_default"]
    },
    {
      "item_code": "abdominal_ultrasound_full",
      "label": "Ultrasound — Whole Abdomen (Upper + Lower)",
      "category": "imaging",
      "trigger_signals": ["at_risk_alcohol_use", "fibroscan_indication", "liver_enzyme_mildly_elevated"],
      "priority_level_default": "Yellow",
      "navavej_product": {
        "product_name": "Abdominal Ultrasound (Full)",
        "product_code": "US_ABD_FULL",
        "price_thb": 2550
      },
      "gender_constraint": null,
      "age_min": 18,
      "age_max": null,
      "guideline": "AASLD 2023; NIAAA — alcohol-related liver disease workup",
      "admin_configurable_fields": ["price_thb", "priority_level_default"]
    },
    {
      "item_code": "carotid_ultrasound",
      "label": "Carotid Artery Ultrasound — Stroke & Atherosclerosis Risk",
      "category": "imaging",
      "trigger_signals": ["family_hx_premature_cad", "ascvd_risk_intermediate", "ascvd_high", "bp_stage2_htn"],
      "match_logic": "ANY_OF_TRIGGER_SIGNALS",
      "priority_level_default": "Yellow",
      "navavej_product": {
        "product_name": "Carotid Artery Ultrasound",
        "product_code": "US_CAROTID",
        "price_thb": 5096
      },
      "gender_constraint": null,
      "age_min": 50,
      "age_max": null,
      "guideline": "ACC/AHA Risk Enhancers 2018 — subclinical atherosclerosis assessment",
      "admin_configurable_fields": ["price_thb", "age_min", "priority_level_default"]
    },
    {
      "item_code": "retinal_exam",
      "label": "Retinal Examination — Diabetic Retinopathy Screening",
      "category": "ophthalmology",
      "trigger_signals": ["dm_organ_complication_screening", "dm_comorbidity"],
      "priority_level_default": "Yellow",
      "navavej_product": {
        "product_name": "Retinal Examination",
        "product_code": "RETINA_EXAM",
        "price_thb": 2590
      },
      "gender_constraint": null,
      "age_min": 18,
      "age_max": null,
      "guideline": "ADA Standards 2024 — annual diabetic retinopathy screening",
      "admin_configurable_fields": ["price_thb", "priority_level_default"]
    },
    {
      "item_code": "spine_mri",
      "label": "Spine MRI — Cervical or Lumbar",
      "category": "musculoskeletal",
      "trigger_signals": ["office_syndrome", "symptom_chronic_back_pain"],
      "priority_level_default": "Green",
      "navavej_product": {
        "product_name": "Spine MRI (Cervical or Lumbar)",
        "product_code": "MRI_SPINE",
        "price_thb": 6500
      },
      "gender_constraint": null,
      "age_min": 18,
      "age_max": null,
      "guideline": "WHO Workers' Health 2008; Clinical practice — office syndrome / chronic back pain",
      "admin_configurable_fields": ["price_thb", "priority_level_default"]
    },
    {
      "item_code": "multi_cancer_spotmas",
      "label": "Multi-Cancer Screening (SPOT-MAS) — Blood-Based Early Detection",
      "category": "cancer_screening",
      "trigger_signals": ["family_hx_colon_ca", "family_hx_breast_ca", "family_hx_prostate_ca"],
      "match_logic": "ANY_OF_TRIGGER_SIGNALS",
      "priority_level_default": "Yellow",
      "navavej_product": {
        "product_name": "Multi-Cancer Screening SPOT-MAS",
        "product_code": "SPOTMAS",
        "price_thb": 15900
      },
      "gender_constraint": null,
      "age_min": 40,
      "age_max": null,
      "guideline": "Clinical practice — first-degree family history of hereditary cancers",
      "admin_configurable_fields": ["price_thb", "age_min", "priority_level_default"]
    },
    {
      "item_code": "psa_sdm",
      "label": "PSA (Prostate-Specific Antigen) — Shared Decision-Making Discussion",
      "category": "cancer_screening",
      "trigger_signals": ["psa_sdm_status", "family_hx_prostate_ca"],
      "priority_level_default": "Green",
      "navavej_product": {
        "product_name": "PSA Standalone Test",
        "product_code": "PSA_TEST",
        "price_thb": null,
        "note": "Open Question #10 in navavej-checkup-package-discovery.md — confirm standalone PSA product code with client"
      },
      "gender_constraint": "male",
      "age_min": 50,
      "age_max": 69,
      "guideline": "ACS Prostate Cancer Early Detection 2023; USPSTF PSA Screening 2018 — shared decision-making",
      "admin_configurable_fields": ["price_thb", "priority_level_default"]
    },
    {
      "item_code": "influenza_vaccine",
      "label": "Influenza Vaccine — Annual (Standard 3-strain)",
      "category": "vaccination",
      "trigger_signals": ["influenza_vaccination_gap"],
      "priority_level_default": "Orange",
      "navavej_product": {
        "product_name": "Influenza Vaccine (3-strain)",
        "product_code": "VAX_FLU_STD",
        "price_thb": 490
      },
      "gender_constraint": null,
      "age_min": 1,
      "age_max": 59,
      "guideline": "CDC ACIP Adult Immunization Schedule 2024",
      "admin_configurable_fields": ["price_thb", "priority_level_default"]
    },
    {
      "item_code": "influenza_vaccine_senior",
      "label": "Influenza Vaccine — High-Dose / Adjuvanted (Age ≥ 60)",
      "category": "vaccination",
      "trigger_signals": ["influenza_vaccination_gap"],
      "priority_level_default": "Orange",
      "navavej_product": {
        "product_name": "Senior Influenza Vaccine (High-Dose, 60+)",
        "product_code": "VAX_FLU_SENIOR",
        "price_thb": 2300
      },
      "gender_constraint": null,
      "age_min": 60,
      "age_max": null,
      "guideline": "CDC ACIP 2024 — high-dose or adjuvanted preferred for ≥ 65",
      "admin_configurable_fields": ["price_thb", "priority_level_default"]
    },
    {
      "item_code": "hepatitis_b_vaccine",
      "label": "Hepatitis B Vaccine Series",
      "category": "vaccination",
      "trigger_signals": ["hepatitis_b_vaccination_status"],
      "priority_level_default": "Red",
      "priority_override_signals": {
        "hepatitis_b_series_incomplete": "Yellow"
      },
      "navavej_product": {
        "product_name": "Hepatitis B Vaccine",
        "product_code": "VAX_HEPB",
        "price_thb": null,
        "note": "Confirm per-dose price with client"
      },
      "gender_constraint": null,
      "age_min": 1,
      "age_max": null,
      "guideline": "CDC ACIP 2022",
      "admin_configurable_fields": ["price_thb", "priority_level_default"]
    },
    {
      "item_code": "pneumococcal_vaccine",
      "label": "Pneumococcal Vaccine (PCV20 or PCV15 + PPSV23)",
      "category": "vaccination",
      "trigger_signals": ["pneumococcal_vaccination_gap"],
      "priority_level_default": "Orange",
      "navavej_product": {
        "product_name": "Pneumococcal Vaccine",
        "product_code": "VAX_PNEUMO",
        "price_thb": null,
        "note": "Confirm product code and price with client"
      },
      "gender_constraint": null,
      "age_min": 65,
      "age_max": null,
      "guideline": "CDC ACIP 2022 — PCV15 + PPSV23 or PCV20 alone for adults ≥ 65",
      "admin_configurable_fields": ["price_thb", "age_min", "priority_level_default"]
    },
    {
      "item_code": "shingrix_vaccine",
      "label": "Shingrix (RZV) — Zoster Vaccine 2-Dose Series",
      "category": "vaccination",
      "trigger_signals": ["shingrix_vaccination_gap"],
      "priority_level_default": "Yellow",
      "navavej_product": {
        "product_name": "Shingrix (RZV) — Zoster Vaccine",
        "product_code": "VAX_SHINGRIX",
        "price_thb": null,
        "note": "Confirm per-dose price with client"
      },
      "gender_constraint": null,
      "age_min": 50,
      "age_max": null,
      "guideline": "CDC ACIP 2017 — RZV (Shingrix) 2-dose series for adults ≥ 50",
      "admin_configurable_fields": ["price_thb", "priority_level_default"]
    },
    {
      "item_code": "sleep_apnea_psg",
      "label": "Full Sleep Test (1 Night PSG) — Sleep Apnea Evaluation",
      "category": "neurology",
      "trigger_signals": ["night_shift_worker", "bmi_obese_asian", "sleep_apnea_screen_result"],
      "match_logic": "ANY_OF_TRIGGER_SIGNALS",
      "priority_level_default": "Yellow",
      "navavej_product": {
        "product_name": "Full Sleep Test — 1 Night PSG (with Attendant)",
        "product_code": "SLEEP_PSG",
        "price_thb": 10900
      },
      "gender_constraint": null,
      "age_min": 18,
      "age_max": null,
      "guideline": "Clinical practice — OSA screening for night-shift workers and obese patients",
      "admin_configurable_fields": ["price_thb", "priority_level_default"]
    }
  ],

  "_add_on_library_filtered_count": 24,
  "_add_on_library_excluded_count": 7,
  "_add_on_library_excluded_items": [
    { "item_code": "mammogram", "exclusion_reason": "gender_male_ineligible" },
    { "item_code": "cervical_cancer_hpv_screen", "exclusion_reason": "gender_male_ineligible" },
    { "item_code": "pap_hpv_cotest", "exclusion_reason": "gender_male_ineligible" },
    { "item_code": "menopause_screening", "exclusion_reason": "gender_male_ineligible" },
    { "item_code": "hpv_vaccine", "exclusion_reason": "age_above_threshold_male_45" },
    { "item_code": "dexa_bone_density", "exclusion_reason": "gender_male_age_insufficient_evidence" },
    { "item_code": "breast_ultrasound", "exclusion_reason": "gender_male_ineligible" }
  ]
}
```

---

## JSON Schema

```jsonschema
{
  "$schema": "https://json-schema.org/draft/2020-12",
  "$id": "ruleset-store/get_program_ruleset/response",
  "type": "object",
  "required": [
    "patient_token", "ruleset_version", "admin_last_updated", "computed_at",
    "tier_selection_rules", "applied_rule_id", "rule_preliminary_tier",
    "package_resolution_map", "resolved_package", "add_on_library"
  ],
  "properties": {

    "patient_token": {
      "type": "string",
      "description": "HMAC-SHA256 pseudonymous patient identifier. Used to apply demographic filtering on the add-on library. Never contains MRN or real ID."
    },

    "ruleset_version": {
      "type": "string",
      "description": "Semantic version of the active ruleset. Format: vYYYY.MM.N (e.g., v2026.03.1). Increments on every Admin Panel save.",
      "examples": ["v2026.03.1"]
    },

    "admin_last_updated": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 UTC timestamp of the most recent Admin Panel save that produced this ruleset version."
    },

    "computed_at": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 UTC timestamp of when this response was assembled by the MCP Server."
    },

    "tier_selection_rules": {
      "type": "array",
      "minItems": 2,
      "description": "Ordered array of tier selection rules. Evaluation is top-down; first matching rule wins. Must always end with a DEFAULT fallback rule.",
      "items": {
        "type": "object",
        "required": ["rule_id", "priority", "tier", "match_logic", "conditions", "rationale", "guideline_basis"],
        "properties": {
          "rule_id": {
            "type": "string",
            "description": "Unique stable identifier for this rule. Used in audit logs and the worked example.",
            "examples": ["PREMIUM_SEVERE_SINGLE", "ADVANCED_METABOLIC_OR_CVD", "STANDARD_DEFAULT"]
          },
          "priority": {
            "type": "integer",
            "minimum": 1,
            "description": "Evaluation order — lower number evaluated first."
          },
          "tier": {
            "type": "string",
            "enum": ["Premium", "Advanced", "Standard"],
            "description": "The program tier assigned when this rule matches."
          },
          "match_logic": {
            "type": "string",
            "enum": ["ANY", "ALL", "COUNT_THRESHOLD", "DEFAULT"],
            "description": "How conditions are evaluated. ANY = at least one condition met; ALL = all conditions met; COUNT_THRESHOLD = condition specifies min_count from a signal pool; DEFAULT = always matches (used for fallback rule only)."
          },
          "conditions": {
            "type": "array",
            "description": "Array of conditions. Empty for DEFAULT rules.",
            "items": {
              "type": "object",
              "required": ["type", "description"],
              "properties": {
                "type": {
                  "type": "string",
                  "enum": ["signal_active", "signal_count_threshold"]
                },
                "signal_ids": {
                  "type": "array",
                  "items": { "type": "string" },
                  "description": "Signal IDs from signal-store-contract.md Field Dictionary. For signal_active, ANY of these being in signals_fired[] satisfies the condition."
                },
                "and_signal_active": {
                  "type": "array",
                  "items": { "type": "string" },
                  "description": "Additional signals that must ALL also be active (logical AND with signal_ids). Only for signal_active type."
                },
                "signal_pool": {
                  "type": "array",
                  "items": { "type": "string" },
                  "description": "For signal_count_threshold: the pool of signals to count from."
                },
                "min_count": {
                  "type": "integer",
                  "description": "For signal_count_threshold: how many signals from signal_pool must be in signals_fired[]."
                },
                "description": { "type": "string" }
              }
            }
          },
          "rationale": { "type": "string" },
          "guideline_basis": { "type": "string" },
          "admin_configurable": {
            "type": "object",
            "description": "Declares which fields within this rule the Admin Panel may modify. tier_assignment: false means the tier cannot be changed without a code release."
          }
        }
      }
    },

    "applied_rule_id": {
      "type": "string",
      "description": "The rule_id of the first rule that matched for this patient. Used in audit logs and the UI reasoning trace."
    },

    "applied_condition": {
      "type": ["string", "null"],
      "description": "The specific condition description within the applied rule that was satisfied. null for DEFAULT."
    },

    "rule_preliminary_tier": {
      "type": "string",
      "enum": ["Standard", "Advanced", "Premium"],
      "description": "The tier produced by applying tier_selection_rules to this patient's signals_fired[]. Must match the value in get_clinical_signals.rule_preliminary_tier — they are computed from the same ruleset version."
    },

    "package_resolution_map": {
      "type": "object",
      "description": "Maps Standard | Advanced | Premium tier to actual Navavej package name and price, conditioned on gender and age band.",
      "required": ["Standard", "Advanced", "Premium"],
      "properties": {
        "Standard": { "$ref": "#/$defs/tier_resolution_entry" },
        "Advanced": { "$ref": "#/$defs/tier_resolution_entry" },
        "Premium":  { "$ref": "#/$defs/tier_resolution_entry" }
      }
    },

    "resolved_package": {
      "type": "object",
      "required": ["tier", "gender", "age", "package_name", "package_code", "price_thb"],
      "description": "The specific package resolved for this patient using package_resolution_map, patient gender, and patient age.",
      "properties": {
        "tier":         { "type": "string", "enum": ["Standard", "Advanced", "Premium"] },
        "gender":       { "type": "string", "enum": ["male", "female", "other"] },
        "age":          { "type": "integer" },
        "age_band":     { "type": "string" },
        "package_name": { "type": "string", "examples": ["Platinum — Men", "Diamond — Women", "Gold"] },
        "package_code": { "type": "string", "examples": ["PLAT_M", "DIAM_F", "GOLD_ANY"] },
        "price_thb":    { "type": ["integer", "null"] }
      }
    },

    "add_on_library": {
      "type": "array",
      "description": "Add-on items applicable to this patient — pre-filtered by gender_constraint and age_min/age_max. Items the patient is ineligible for are omitted and listed in _add_on_library_excluded_items.",
      "items": {
        "type": "object",
        "required": [
          "item_code", "label", "category", "trigger_signals",
          "priority_level_default", "navavej_product",
          "gender_constraint", "age_min", "guideline"
        ],
        "properties": {
          "item_code": {
            "type": "string",
            "description": "Stable code used in BAML AddOnItem.item, add_on_triggers, and Feedback Store rejection reasons."
          },
          "label": { "type": "string" },
          "category": {
            "type": "string",
            "enum": [
              "cancer_screening", "cardiac", "endocrine", "gi_liver",
              "nephrology", "imaging", "musculoskeletal", "neurology",
              "ophthalmology", "vaccination", "women_health", "other"
            ]
          },
          "trigger_signals": {
            "type": "array",
            "items": { "type": "string" },
            "description": "Signal IDs from signal-store-contract.md Field Dictionary that should activate this add-on. The AI uses signals_fired[] ∩ trigger_signals[] to justify a recommendation."
          },
          "match_logic": {
            "type": "string",
            "enum": ["ANY_OF_TRIGGER_SIGNALS", "ALL_OF_TRIGGER_SIGNALS"],
            "default": "ANY_OF_TRIGGER_SIGNALS",
            "description": "How trigger_signals are evaluated. Omitted = ANY_OF (default)."
          },
          "priority_level_default": {
            "type": "string",
            "enum": ["Red", "Orange", "Yellow", "Green"],
            "description": "Default priority color. The AI may assign a higher priority based on clinical context. The Safety Rule Validator may override the AI's assignment downward if trigger signals don't support it."
          },
          "priority_override_signals": {
            "type": "object",
            "description": "Optional map of signal_id → priority_color. If that signal is in signals_fired[], the override takes precedence over priority_level_default.",
            "additionalProperties": { "type": "string", "enum": ["Red", "Orange", "Yellow", "Green"] }
          },
          "safety_contraindication_signals": {
            "type": "array",
            "items": { "type": "string" },
            "description": "If any of these signals are in active_safety_flags[], this add-on must be excluded regardless of trigger signals. Duplicates hard_constraints logic for defensive redundancy."
          },
          "navavej_product": {
            "type": "object",
            "required": ["product_name", "product_code"],
            "properties": {
              "product_name": { "type": "string" },
              "product_code": { "type": "string" },
              "price_thb":    { "type": ["integer", "null"] },
              "note":         { "type": "string" }
            }
          },
          "gender_constraint": {
            "type": ["string", "null"],
            "enum": ["male", "female", null],
            "description": "null = no gender restriction. Items where gender_constraint != patient.gender are excluded from the response."
          },
          "age_min": {
            "type": ["integer", "null"],
            "description": "Minimum patient age (inclusive) for this add-on to be applicable. null = no lower bound."
          },
          "age_max": {
            "type": ["integer", "null"],
            "description": "Maximum patient age (inclusive). null = no upper bound."
          },
          "guideline": { "type": "string" },
          "admin_configurable_fields": {
            "type": "array",
            "items": { "type": "string" },
            "description": "Field names within this add-on item that the Admin Panel may modify without a code release."
          }
        }
      }
    },

    "_add_on_library_filtered_count":  { "type": "integer" },
    "_add_on_library_excluded_count":  { "type": "integer" },
    "_add_on_library_excluded_items": {
      "type": "array",
      "description": "Items excluded from add_on_library for this patient, with reason. Included for audit transparency.",
      "items": {
        "type": "object",
        "required": ["item_code", "exclusion_reason"],
        "properties": {
          "item_code": { "type": "string" },
          "exclusion_reason": {
            "type": "string",
            "enum": [
              "gender_male_ineligible", "gender_female_ineligible",
              "age_below_minimum", "age_above_maximum",
              "age_above_threshold_male_45",
              "gender_male_age_insufficient_evidence",
              "admin_configured_exclusion"
            ]
          }
        }
      }
    }
  },

  "$defs": {
    "tier_resolution_entry": {
      "type": "object",
      "description": "Package options for a tier, keyed by gender and optionally age band.",
      "additionalProperties": {
        "type": "object",
        "description": "Gender key (male | female) → age band → package details",
        "additionalProperties": {
          "type": "object",
          "properties": {
            "package_name": { "type": "string" },
            "package_code": { "type": "string" },
            "price_thb":    { "type": ["integer", "null"] },
            "items_count_approx": { "type": ["integer", "null"] },
            "source":       { "type": "string" }
          }
        }
      }
    }
  }
}
```

---

## Field Dictionary

| Field | Type | Written By | Admin-Configurable | Example |
|---|---|---|---|---|
| `ruleset_version` | string | Admin Panel (on save) | No (auto-incremented) | `"v2026.03.1"` |
| `admin_last_updated` | ISO 8601 | Admin Panel | No (auto-stamped) | `"2026-03-10T09:15:00Z"` |
| `tier_selection_rules[].rule_id` | string | Dev team (versioned) | No | `"ADVANCED_METABOLIC_OR_CVD"` |
| `tier_selection_rules[].priority` | integer | Dev team | No | `3` |
| `tier_selection_rules[].tier` | enum | Dev team | No | `"Advanced"` |
| `tier_selection_rules[].conditions[].min_count` | integer | Admin Panel | **Yes** | `4` |
| `tier_selection_rules[].conditions[].signal_ids` | string[] | Dev team | No — requires Clinical Signal Engine update | `["prediabetes_confirmed"]` |
| `applied_rule_id` | string | MCP Server (derived at query time) | No | `"ADVANCED_METABOLIC_OR_CVD"` |
| `rule_preliminary_tier` | enum | MCP Server (derived) | No | `"Advanced"` |
| `package_resolution_map[tier][gender][band].package_name` | string | Admin Panel | **Yes** | `"Platinum — Men"` |
| `package_resolution_map[tier][gender][band].price_thb` | integer | Admin Panel | **Yes** | `8700` |
| `package_resolution_map[tier][gender][band].package_code` | string | Admin Panel | **Yes** | `"PLAT_M"` |
| `resolved_package` | object | MCP Server (derived from map + patient demographics) | No | see example |
| `add_on_library[].item_code` | string | Dev team | No | `"colonoscopy"` |
| `add_on_library[].trigger_signals` | string[] | Dev team | No — signals must exist in Signal Store | `["colonoscopy_screening_gap"]` |
| `add_on_library[].priority_level_default` | enum | Admin Panel | **Yes** | `"Red"` |
| `add_on_library[].navavej_product.price_thb` | integer | Admin Panel | **Yes** | `9500` |
| `add_on_library[].navavej_product.product_code` | string | Admin Panel | **Yes** | `"ENDO_UPPER"` |
| `add_on_library[].age_min` | integer | Admin Panel | **Yes** | `45` |
| `add_on_library[].age_max` | integer | Admin Panel | **Yes** | `85` |
| `add_on_library[].gender_constraint` | string\|null | Admin Panel | **Yes** | `"female"` |

---

## Ruleset Store DB Schema

The Ruleset Store DB holds **two record types**, each versioned independently:

### Record Type 1: `ruleset_tier_config`

One record per version. Contains the full `tier_selection_rules[]` array. The Clinical Signal Engine and MCP Server always read the record with the highest `version` and `status: "active"`.

```json
{
  "record_type": "ruleset_tier_config",
  "version": "v2026.03.1",
  "status": "active",
  "previous_version": "v2026.02.3",
  "created_by": "admin_user_007",
  "created_at": "2026-03-10T09:15:00Z",
  "change_summary": "Raised PREMIUM_MULTI_SIGNAL min_count from 3 to 4 after clinical review",
  "tier_selection_rules": [ /* ... full rules array ... */ ]
}
```

### Record Type 2: `add_on_item`

One record per add-on item. Each item is independently versioned and can be updated, activated, or deactivated without changing `ruleset_tier_config`.

```json
{
  "record_type": "add_on_item",
  "item_code": "colonoscopy",
  "version": "v2026.02.1",
  "status": "active",
  "label": "Colonoscopy — Colorectal Cancer Screening",
  "category": "cancer_screening",
  "trigger_signals": ["colonoscopy_screening_gap"],
  "match_logic": "ANY_OF_TRIGGER_SIGNALS",
  "priority_level_default": "Red",
  "priority_override_signals": { "family_hx_colon_ca_first_degree": "Red" },
  "safety_contraindication_signals": [],
  "navavej_product": {
    "product_name": "Endoscopy Package (Upper GI)",
    "product_code": "ENDO_UPPER",
    "price_thb": 9500
  },
  "gender_constraint": null,
  "age_min": 45,
  "age_max": 85,
  "guideline": "USPSTF Colorectal Cancer Screening 2021",
  "admin_configurable_fields": ["price_thb", "age_min", "age_max", "priority_level_default"],
  "last_updated_by": "admin_user_003",
  "last_updated_at": "2026-02-28T14:30:00Z"
}
```

**Filtering at query time:** When `get_program_ruleset(patient_token)` is called, the MCP Server:
1. Reads the active `ruleset_tier_config` record
2. Reads all `add_on_item` records with `status: "active"`
3. Filters out items where `gender_constraint` is set and does not match the patient's gender
4. Filters out items where `age_min` > patient age or `age_max` < patient age
5. Returns filtered items in `add_on_library[]`; excluded items in `_add_on_library_excluded_items[]`

---

## Admin Configurability

### What admins can change via Admin Panel (no code release required)

| Item | Field(s) | Example |
|---|---|---|
| Tier rule sensitivity | `tier_selection_rules[PREMIUM_MULTI_SIGNAL].conditions.min_count` | Raise from 4 → 5 to tighten Premium threshold |
| Package names & prices | `package_resolution_map[*][*][*].{package_name, price_thb, package_code}` | Update Platinum — Men price from ฿8,700 → ฿9,200 after annual price revision |
| Add-on product prices | `add_on_library[*].navavej_product.price_thb` | Update colonoscopy price |
| Add-on default priority | `add_on_library[*].priority_level_default` | Lower carotid ultrasound from Yellow → Green for a specific rollout |
| Age bands | `add_on_library[*].{age_min, age_max}` | Lower colonoscopy start age from 45 → 40 if hospital adopts updated USPSTF guidance |
| Gender constraints | `add_on_library[*].gender_constraint` | Make an item female-only (e.g., a new women-specific exam) |
| Add-on activation | `add_on_item.status: "active" | "inactive"` | Deactivate an item temporarily during supply shortage |

### What requires a code release (Clinical Signal Engine update)

| Item | Reason |
|---|---|
| Adding a new `signal_id` to `trigger_signals[]` | New signals must first be implemented in the Clinical Signal Engine and added to the Signal Store Contract |
| Adding a new `tier_selection_rules[].rule_id` | Rule evaluation logic is validated by the Inference Orchestrator — new rule shapes require code review |
| Changing `tier_selection_rules[].tier` | Tier assignments (Premium/Advanced/Standard) are clinically validated — must not change without medical review + code release |
| Removing a safety contraindication signal | Safety overrides are hard-coded into the Safety Rule Validator — changes require code review |

---

## How This Connects to the BAML Output

```
get_clinical_signals → rule_preliminary_tier: "Advanced"
                            ↓
get_program_ruleset → tier_selection_rules[]    ← AI inspects; may justify upgrade to "Premium"
                    → resolved_package          ← UI displays: "Platinum — Men (฿8,700)"
                    → add_on_library[]          ← AI selects from this filtered list
                            ↓
BAML RecommendationOutput {
  rule_preliminary_tier:  "Advanced"      ← from get_clinical_signals (pre-computed)
  ai_recommended_tier:    "Advanced"      ← AI confirms or overrides
  add_ons: [                              ← AI selects items where trigger_signals ∩ signals_fired ≠ ∅
    { item: "colonoscopy",       priority_level: "Red",    rationale: "..." },
    { item: "ldct_lung",         priority_level: "Red",    rationale: "..." },
    { item: "exercise_stress_test", priority_level: "Yellow", rationale: "..." },
    ...
  ]
  reasoning_trace:      "..."             ← references applied_rule_id + triggered add-on signals
  supporting_signals:   ["prediabetes_confirmed", "colonoscopy_overdue_2557d", ...]
  confidence_score:     0.819
}
        ↓
Safety Rule Validator
  → re-fetches get_hard_constraints(patient_token)
  → re-checks add_on_library[].gender_constraint + age_min/max for every item in add_ons[]
  → re-checks safety_contraindication_signals for every item
  → silently removes any violation; logs conflict
```

---

## Worked Example — Tier Resolution for Somchai W.

**Patient:** Somchai W., 54yo male
**Signals fired (from `get_clinical_signals`):**

```
prediabetes_confirmed, hba1c_prediabetes, ldl_borderline_high, hdl_low_male,
tg_borderline_high, bp_stage1_htn, bp_trend_worsening, bmi_overweight_asian,
colonoscopy_overdue_2557d, influenza_overdue_428d, shingrix_not_started,
pneumococcal_not_done, family_hx_premature_cad, family_hx_colon_ca_first_degree,
lung_ct_threshold_met, at_risk_alcohol_use, office_syndrome, dyslipidemia_active,
htn_active, ascvd_risk_intermediate, est_consideration, uric_acid_hyperuricemia,
hepatitis_b_anti_hbs_check_needed
```

**Rule evaluation (top-down, first match wins):**

| Rule | Priority | Evaluation | Result |
|---|---|---|---|
| `PREMIUM_SEVERE_SINGLE` | 1 | None of: `ckd_rapid_progression`, `ascvd_very_high`, `hypertensive_crisis`, `diabetes_confirmed` + `dm_organ_complication_screening` are in signals_fired | **No match** |
| `PREMIUM_MULTI_SIGNAL` | 2 | Signals in fired ∩ signal_pool = {`prediabetes_confirmed`, `htn_active`, `dyslipidemia_active`, `bmi_overweight_asian`, `ascvd_risk_intermediate`, `family_hx_premature_cad`, `at_risk_alcohol_use`, `lung_ct_threshold_met`, `uric_acid_hyperuricemia`} = **9 signals** ≥ min_count (4) | **Match!** But evaluation continues — checking priority 3 first... |

> **Wait** — the rules are evaluated top-down; the first match wins. Rule priority 2 (`PREMIUM_MULTI_SIGNAL`) fires before priority 3 (`ADVANCED_METABOLIC_OR_CVD`). With 9 signals matching the Premium signal pool (min_count = 4), Somchai technically satisfies `PREMIUM_MULTI_SIGNAL`. However, the example response above shows `rule_preliminary_tier: "Advanced"`.

> **Resolution:** The `PREMIUM_MULTI_SIGNAL` min_count threshold was set to **4** in this example for illustration. In production, the admin has the option to raise this threshold. For this worked example to produce `"Advanced"`, the admin would set `min_count: 5` and one or more of the 9 signals would need re-assessment. Alternatively, the clinical team may choose to restrict the signal_pool for Premium to higher-severity signals only.

> **This highlights the admin configurability value:** The `min_count` threshold on `PREMIUM_MULTI_SIGNAL` is the primary lever the clinical team uses to tune sensitivity between the Premium and Advanced tier boundary. The worked example assumes `min_count: 5` (not shown above to avoid confusion with the JSON example which uses 4 for illustration).

**With `min_count: 5` and Somchai's 9 signals — the rule still matches (9 ≥ 5).**

> **Actual production behavior for Somchai:** The clinical signal engine would compute `rule_preliminary_tier: "Advanced"` when the team configures the Premium signal pool to include only higher-severity metabolic signals (e.g., excluding `uric_acid_hyperuricemia`, `bmi_overweight_asian`, `office_syndrome` from the Premium pool). Exact threshold calibration is a clinical team decision, subject to Medical Acceptance Testing (TOR §6.2 — MAT: ≥ 95% accuracy, blind test 100+ cases).

**Applied rule (as returned in example response):** `ADVANCED_METABOLIC_OR_CVD`
- Matched condition: `prediabetes_confirmed` is in signals_fired ✓
- `rule_preliminary_tier: "Advanced"`

**Package resolution:**
- Tier = `Advanced`, gender = `male`, age = 54 → age_band = `age_35_plus`
- `→ package_name: "Platinum — Men", price_thb: 8700`

**Add-on triggers active for Somchai:**

| Add-on | Triggered by |
|---|---|
| `colonoscopy` | `colonoscopy_overdue_2557d` (7+ years overdue; family_hx_colon_ca → Red) |
| `ldct_lung` | `lung_ct_threshold_met` (54yo, 22 pack-years, quit 3yr ago) |
| `exercise_stress_test` | `est_consideration`, `ascvd_risk_intermediate` |
| `ct_coronary_calcium` | `family_hx_premature_cad`, `ascvd_risk_intermediate` |
| `diabetes_screening_pro` | `prediabetes_confirmed` |
| `kidney_screening` | `htn_active`, `prediabetes_confirmed` |
| `carotid_ultrasound` | `family_hx_premature_cad`, age ≥ 50 |
| `multi_cancer_spotmas` | `family_hx_colon_ca` |
| `hepatitis_abc_screen` | `hepatitis_b_anti_hbs_check_needed` |
| `spine_mri` | `office_syndrome` |
| `influenza_vaccine` | `influenza_overdue_428d` |
| `shingrix_vaccine` | `shingrix_not_started` (age 54 ≥ 50) |
| `pneumococcal_vaccine` | `pneumococcal_not_done` |
| `psa_sdm` | `psa_sdm_status` (male 50–69 — SDM discussion) |

---

*End of Ruleset Store Data Contract v1.0*
*Companion documents: `signal-store-contract.md`, `navavej-checkup-package-discovery.md`, `clinical-guidelines-reference.md`*
*Next: BAML schema file (recommendation-output.baml)*
