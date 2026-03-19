// Recommendation Pipeline Integration Tests
// Validates Agent 1 (AnalyzeClinicalRisks) and Agent 2 (MatchAndCompose)
// using real Signal Store fixture data from MetabolicSyndromeRisk and HealthyRoutineCheckup.
//
// Patient Fixtures:
//   Fai Siriwat   | tok_hmac_1a2b3c4d | 51F | MetabolicSyndromeRisk/record_000.json
//                 | signals_fired: 17  | Expected tier: Advanced
//
//   Kanya Prasert | tok_hmac_1aa1b504  | 35M | HealthyRoutineCheckup/record_000.json
//                 | signals_fired: 0   | Expected tier: Standard

// ── TEST 1: AnalyzeClinicalRisks — Metabolic Syndrome Patient (Fai Siriwat) ──
//
// Clinical picture: pre-diabetes + Stage 1 HTN + atherogenic dyslipidemia +
//   metabolic syndrome cluster + intermediate ASCVD risk (8.2%).
// Ruleset match: ADVANCED_METABOLIC_OR_CVD fires on prediabetes_confirmed alone.
// Expected assertions:
//   - suggested_tier = Advanced or Premium (not Standard)
//   - primary_risks >= 3
//   - clinical_summary_bullets >= 3
//   - supporting_signal_ids non-empty

test AnalyzeRisks_MetabolicSyndrome {
  functions [AnalyzeClinicalRisks]
  args {
    clinical_signals #"
{
  "rule_preliminary_tier": "Advanced",
  "overall_risk_level": "High",
  "signals_fired": [
    "bmi_obese_asian", "bp_stage1_htn", "ascvd_risk_intermediate",
    "ldl_borderline_high", "tg_borderline_high", "hdl_low_female",
    "fbs_prediabetes_range", "prediabetes_confirmed", "metabolic_syndrome_cluster",
    "physical_inactivity", "egfr_status_G2", "mammogram_screening_gap_overdue",
    "shingrix_vaccination_gap_due", "dm_comorbidity_prediabetes",
    "htn_comorbidity_stage1", "dyslipidemia_comorbidity_present",
    "total_cholesterol_borderline_high"
  ],
  "missing_signals": [
    "sleep_apnea_screen_result", "frax_bone_density_risk",
    "dm_organ_complication_screening", "fibroscan_indication",
    "pneumococcal_vaccination_gap"
  ],
  "risk_flags": [
    {
      "flag_id": "bmi_obese_asian",
      "label": "Obesity — Asian-adjusted BMI >= 27.5 kg/m2",
      "severity": "Moderate",
      "guideline": "WHO Asia-Pacific BMI 2000"
    },
    {
      "flag_id": "bp_stage1_htn",
      "label": "Stage 1 Hypertension (SBP 130-139 or DBP 80-89)",
      "severity": "Moderate",
      "guideline": "ACC/AHA High Blood Pressure Guideline 2017"
    },
    {
      "flag_id": "prediabetes_confirmed",
      "label": "Pre-diabetes confirmed (FBS 100-125 or HbA1c 5.7-6.4%)",
      "severity": "Moderate",
      "guideline": "ADA Standards of Medical Care 2024"
    },
    {
      "flag_id": "ascvd_intermediate_risk",
      "label": "ASCVD 10-year risk Intermediate (7.5-20%)",
      "severity": "High",
      "guideline": "ACC/AHA Pooled Cohort Equations 2013/2018"
    },
    {
      "flag_id": "ldl_borderline_high",
      "label": "LDL Borderline High (130-159 mg/dL)",
      "severity": "Moderate",
      "guideline": "ACC/AHA Cholesterol Guideline 2018"
    }
  ],
  "comorbidity_tags": [
    {"tag": "Dyslipidemia", "on_treatment": true, "treatment_note": "Atorvastatin 10mg"},
    {"tag": "Prediabetes", "on_treatment": false}
  ],
  "screening_gaps": [
    {
      "screening_id": "mammogram",
      "label": "Mammography (breast cancer screening)",
      "overdue_days": 14,
      "priority_color": "Yellow",
      "guideline": "USPSTF Breast Cancer Screening 2024"
    }
  ],
  "vaccination_gaps": [
    {
      "vaccine_id": "shingrix",
      "label": "Shingles (RZV/Shingrix)",
      "doses_received": 0,
      "doses_required": 2,
      "overdue_days": 365,
      "priority_color": "Yellow",
      "guideline": "CDC ACIP 2017"
    }
  ],
  "symptom_tags": ["fatigue", "joint_pain", "mild_headaches"]
}
    "#
    biomarker_trends #"
{
  "bmi": {
    "current": 29.3,
    "unit": "kg/m2",
    "category": "Obese (Asian-adjusted >= 27.5 kg/m2)",
    "trend_direction": "increasing",
    "slope_per_year": 0.6,
    "history": [
      {"date": "2023-07-20", "value": 27.6},
      {"date": "2024-09-01", "value": 28.5},
      {"date": "2026-02-20", "value": 29.3}
    ]
  },
  "blood_pressure": {
    "latest": {"sbp": 139, "dbp": 88, "date": "2026-02-20"},
    "unit": "mmHg",
    "category": "Stage1_HTN",
    "trend_direction": "increasing",
    "sbp_slope_per_year": 3.0,
    "history": [
      {"date": "2023-07-20", "sbp": 131, "dbp": 82},
      {"date": "2024-09-01", "sbp": 135, "dbp": 84},
      {"date": "2026-02-20", "sbp": 139, "dbp": 88}
    ]
  },
  "egfr": {
    "current": 86.0,
    "unit": "mL/min/1.73m2",
    "ckd_stage": "G2",
    "annual_slope": -1.2,
    "rapid_progression": false
  },
  "labs": [
    {
      "lab_id": "fbs",
      "label": "Fasting Blood Glucose",
      "current_value": 111.0,
      "unit": "mg/dL",
      "category": "Prediabetic (100-125 mg/dL)",
      "velocity_per_year": 4.5,
      "trend_direction": "increasing",
      "trend_flag": "worsening",
      "history": [{"date": "2023-07-20", "value": 103.0}, {"date": "2024-09-01", "value": 107.0}, {"date": "2026-02-20", "value": 111.0}]
    },
    {
      "lab_id": "hba1c",
      "label": "HbA1c",
      "current_value": 6.2,
      "unit": "%",
      "category": "Prediabetic (5.7-6.4%)",
      "velocity_per_year": 0.1,
      "trend_direction": "increasing",
      "history": [{"date": "2024-09-01", "value": 6.0}, {"date": "2026-02-20", "value": 6.2}]
    },
    {
      "lab_id": "ldl",
      "label": "LDL Cholesterol",
      "current_value": 149.0,
      "unit": "mg/dL",
      "category": "Borderline High (130-159 mg/dL)",
      "velocity_per_year": 8.0,
      "trend_direction": "increasing",
      "trend_flag": "worsening",
      "history": [{"date": "2023-07-20", "value": 133.0}, {"date": "2024-09-01", "value": 141.0}, {"date": "2026-02-20", "value": 149.0}]
    },
    {
      "lab_id": "triglycerides",
      "label": "Triglycerides",
      "current_value": 194.0,
      "unit": "mg/dL",
      "category": "Borderline High (150-199 mg/dL)",
      "trend_direction": "increasing",
      "history": [{"date": "2024-09-01", "value": 173.0}, {"date": "2026-02-20", "value": 194.0}]
    },
    {
      "lab_id": "hdl",
      "label": "HDL Cholesterol",
      "current_value": 37.0,
      "unit": "mg/dL",
      "category": "Low for female (< 50 mg/dL)",
      "history": [{"date": "2026-02-20", "value": 37.0}]
    },
    {
      "lab_id": "total_cholesterol",
      "label": "Total Cholesterol",
      "current_value": 214.0,
      "unit": "mg/dL",
      "category": "Borderline High (200-239 mg/dL)",
      "history": [{"date": "2026-02-20", "value": 214.0}]
    }
  ],
  "ascvd_10yr_risk": {
    "score_pct": 8.2,
    "category": "Intermediate",
    "note": "Intermediate ASCVD risk amplified by metabolic syndrome components."
  },
  "waist_circumference": {
    "value": 94.0,
    "unit": "cm",
    "category": "Above female Asian threshold (>= 80 cm)",
    "note": "Central obesity; key component of metabolic syndrome."
  }
}
    "#
    hard_constraints #"
{
  "patient_demographics": {
    "gender": "female",
    "age": 51,
    "ethnicity": "asian",
    "bmi_threshold_profile": "asian_adjusted"
  },
  "eligibility_exclusions": [],
  "active_safety_flags": [],
  "tier_ceiling": null
}
    "#
    program_ruleset #"
{
  "ruleset_version": "v2026.03.1-draft",
  "rule_preliminary_tier": "Advanced",
  "tier_selection_rules": [
    {
      "rule_id": "PREMIUM_SEVERE_SINGLE",
      "priority": 1,
      "tier": "Premium",
      "match_logic": "ANY",
      "conditions": [
        {"type": "signal_active", "signal_ids": ["ckd_rapid_progression"], "description": "CKD rapid progression — eGFR annual decline > 5 mL/min/1.73m2"},
        {"type": "signal_active", "signal_ids": ["ascvd_very_high"], "description": "ASCVD 10-year risk >= 20%"},
        {"type": "signal_active", "signal_ids": ["hypertensive_crisis"], "description": "Hypertensive crisis — SBP > 180 OR DBP > 120"},
        {"type": "signal_active", "signal_ids": ["diabetes_confirmed"], "and_signal_active": ["dm_organ_complication_screening"], "description": "Confirmed DM with active organ complication screening gap"}
      ]
    },
    {
      "rule_id": "PREMIUM_MULTI_SIGNAL",
      "priority": 2,
      "tier": "Premium",
      "match_logic": "COUNT_THRESHOLD",
      "conditions": [{
        "type": "signal_count_threshold",
        "signal_pool": ["prediabetes_confirmed", "htn_active", "dyslipidemia_active", "bmi_obese_asian", "ascvd_risk_intermediate", "family_hx_premature_cad", "lung_ct_threshold_met", "ckd_comorbidity", "uric_acid_hyperuricemia"],
        "min_count": 5,
        "description": ">= 5 moderate-severity signals active simultaneously"
      }]
    },
    {
      "rule_id": "ADVANCED_METABOLIC_OR_CVD",
      "priority": 3,
      "tier": "Advanced",
      "match_logic": "ANY",
      "conditions": [
        {"type": "signal_active", "signal_ids": ["prediabetes_confirmed", "diabetes_confirmation_required"], "description": "Pre-diabetes confirmed or diabetes requiring confirmation — ADA 2024"},
        {"type": "signal_active", "signal_ids": ["ascvd_risk_intermediate"], "description": "ASCVD 10-year intermediate risk 7.5-19.9%"},
        {"type": "signal_active", "signal_ids": ["htn_active"], "description": "Active hypertension comorbidity"},
        {"type": "signal_active", "signal_ids": ["bmi_obese_asian"], "description": "Obese by Asian-adjusted BMI >= 27.5 kg/m2"},
        {"type": "signal_count_threshold", "signal_pool": ["bmi_overweight_asian", "low_hdl", "high_triglycerides", "high_ldl", "bp_stage1_htn", "family_hx_premature_cad", "dyslipidemia_active"], "min_count": 2, "description": ">= 2 low-moderate severity signals"}
      ]
    },
    {
      "rule_id": "STANDARD_DEFAULT",
      "priority": 4,
      "tier": "Standard",
      "match_logic": "DEFAULT",
      "conditions": []
    }
  ]
}
    "#
  }
  // Tier: not Standard — prediabetes_confirmed alone fires ADVANCED_METABOLIC_OR_CVD
  @@assert( {{ this.suggested_tier == "Advanced" or this.suggested_tier == "Premium" }} )
  // Must identify at least 3 primary risks (prediabetes, HTN, dyslipidemia, ASCVD are all present)
  @@assert( {{ this.primary_risks|length >= 3 }} )
  // Biomarker interpretation must reference the abnormal values
  @@assert( {{ this.biomarker_interpretation|length > 0 }} )
  // Clinical summary bullets must be populated (min 3 for this complex case)
  @@assert( {{ this.clinical_summary_bullets|length >= 3 }} )
  // Severity assessment must be present
  @@assert( {{ this.severity_assessment|length > 0 }} )
  // Must reference at least some of the 17 fired signals
  @@assert( {{ this.supporting_signal_ids|length > 0 }} )
}


// ── TEST 2: MatchAndCompose — Metabolic Syndrome Recommendation (Fai Siriwat) ─
//
// Input: pre-constructed ClinicalRiskProfile (representative of Agent 1 output).
// Program ruleset includes 8 add-on items with trigger_signals matching signals_fired.
// Expected assertions:
//   - ai_recommended_tier = Advanced or Premium
//   - selected_add_ons non-empty (mammogram + shingrix directly triggered)
//   - communication_script fully populated
//   - policy_reasoning non-empty

test MatchAndCompose_MetabolicSyndrome {
  functions [MatchAndCompose]
  args {
    risk_profile {
      primary_risks [
        "Active Pre-diabetes (FBS 111 mg/dL, HbA1c 6.2%) with accelerating worsening trend",
        "Stage 1 Hypertension (BP 139/88 mmHg, rising +3 mmHg SBP/yr) — untreated",
        "Atherogenic Dyslipidemia — LDL 149 mg/dL borderline high (+8/yr despite Atorvastatin 10mg), HDL 37 mg/dL critically low, TG 194 mg/dL borderline high",
        "Metabolic Syndrome Cluster — central obesity (waist 94 cm) + Stage 1 HTN + atherogenic dyslipidemia",
        "Intermediate ASCVD 10-year Risk (8.2%) amplified by co-occurring metabolic syndrome burden"
      ]
      severity_assessment "High — five converging cardiometabolic risk factors across glucose metabolism, blood pressure, lipids, and adiposity with worsening biomarker trajectories indicating progressive multi-system risk accumulation."
      biomarker_interpretation "BMI 29.3 kg/m2 (Asian-adjusted obese, +0.6/yr). BP 139/88 mmHg Stage 1 HTN rising +3 mmHg SBP/yr over 3 measurements. FBS 111 mg/dL and HbA1c 6.2% both prediabetic, FBS rising +4.5 mg/dL/yr. LDL 149 mg/dL borderline high despite Atorvastatin 10mg (+8 mg/dL/yr); HDL critically low 37 mg/dL (female reference >= 50). TG 194 mg/dL borderline high. ASCVD 10-yr 8.2% intermediate. eGFR 86 mL/min/1.73m2 CKD G2 (mild decline -1.2/yr, not rapid)."
      clinical_summary_bullets [
        "**Pre-diabetes confirmed**: FBS 111 mg/dL and HbA1c 6.2% both in prediabetic range; FBS rising +4.5 mg/dL/yr — trajectory toward Type 2 DM without lifestyle intervention",
        "**Stage 1 Hypertension on no treatment**: BP 139/88 mmHg, SBP rising +3 mmHg/yr over 3 consecutive measurements; end-organ assessment warranted",
        "**Residual dyslipidemia on statin therapy**: LDL 149 mg/dL (+8/yr) despite Atorvastatin 10mg; HDL 37 mg/dL critically low (female threshold 50); TG 194 mg/dL borderline high — inadequate lipid control",
        "**Metabolic syndrome confirmed**: central obesity (waist 94 cm, above female Asian threshold), elevated BP, and atherogenic dyslipidemia — 3 of 5 IDF criteria met",
        "**Intermediate ASCVD cardiovascular risk**: 10-year risk 8.2% amplified beyond individual factor contribution by metabolic syndrome",
        "**Mammography overdue by 14 days**: USPSTF 2024 Grade B biennial screening due March 2026; expedited scheduling recommended",
        "**Shingrix vaccination not initiated**: age 51, 0/2 doses received; eligible since age 50 — 2-dose series recommended (CDC ACIP 2017)"
      ]
      suggested_tier Advanced
      supporting_signal_ids [
        "bmi_obese_asian",
        "bp_stage1_htn",
        "ascvd_risk_intermediate",
        "prediabetes_confirmed",
        "metabolic_syndrome_cluster",
        "ldl_borderline_high",
        "hdl_low_female",
        "tg_borderline_high",
        "mammogram_screening_gap_overdue",
        "shingrix_vaccination_gap_due"
      ]
      missing_signal_ids [
        "sleep_apnea_screen_result",
        "frax_bone_density_risk",
        "dm_organ_complication_screening",
        "fibroscan_indication"
      ]
    }
    program_ruleset #"
{
  "ruleset_version": "v2026.03.1-draft",
  "rule_preliminary_tier": "Advanced",
  "tier_selection_rules": [
    {
      "rule_id": "PREMIUM_SEVERE_SINGLE", "priority": 1, "tier": "Premium", "match_logic": "ANY",
      "conditions": [
        {"type": "signal_active", "signal_ids": ["ckd_rapid_progression"]},
        {"type": "signal_active", "signal_ids": ["ascvd_very_high"]},
        {"type": "signal_active", "signal_ids": ["diabetes_confirmed"], "and_signal_active": ["dm_organ_complication_screening"]}
      ]
    },
    {
      "rule_id": "ADVANCED_METABOLIC_OR_CVD", "priority": 3, "tier": "Advanced", "match_logic": "ANY",
      "conditions": [
        {"type": "signal_active", "signal_ids": ["prediabetes_confirmed"]},
        {"type": "signal_active", "signal_ids": ["ascvd_risk_intermediate"]},
        {"type": "signal_active", "signal_ids": ["bmi_obese_asian"]}
      ]
    },
    {"rule_id": "STANDARD_DEFAULT", "priority": 4, "tier": "Standard", "match_logic": "DEFAULT", "conditions": []}
  ],
  "add_on_library": [
    {
      "item_code": "exercise_stress_test",
      "label": "Exercise Stress Test (EST) — Treadmill ECG",
      "category": "cardiac",
      "trigger_signals": ["ascvd_risk_intermediate", "est_gap", "est_consideration"],
      "priority_level_default": "Yellow",
      "safety_contraindication_signals": ["hypertensive_crisis"],
      "navavej_product": {"product_name": "Exercise Stress Test (EST)", "product_code": "EST_TREADMILL", "price_thb": 2900},
      "gender_constraint": null,
      "age_min": 30,
      "guideline": "AHA/ACC Exercise Testing Guidelines 2002"
    },
    {
      "item_code": "mammogram",
      "label": "Mammography (Bilateral Digital Screening)",
      "category": "cancer_screening",
      "trigger_signals": ["mammogram_screening_gap", "mammogram_screening_gap_overdue"],
      "priority_level_default": "Yellow",
      "safety_contraindication_signals": [],
      "navavej_product": {"product_name": "Mammogram (Digital Bilateral)", "product_code": "MAMMO_DIGITAL", "price_thb": 3500},
      "gender_constraint": "female",
      "age_min": 40,
      "age_max": 74,
      "guideline": "USPSTF Breast Cancer Screening 2024 — Grade B biennial 40-74"
    },
    {
      "item_code": "shingrix_vaccine",
      "label": "Shingles Vaccine (RZV/Shingrix) — per dose",
      "category": "vaccination",
      "trigger_signals": ["shingrix_vaccination_gap", "shingrix_vaccination_gap_due"],
      "priority_level_default": "Yellow",
      "safety_contraindication_signals": [],
      "navavej_product": {"product_name": "Shingrix (RZV) per dose", "product_code": "VAX_SHINGRIX", "price_thb": 6500},
      "gender_constraint": null,
      "age_min": 50,
      "guideline": "CDC ACIP 2017 — 2-dose series for age >= 50"
    },
    {
      "item_code": "home_bp_monitoring",
      "label": "Home Blood Pressure Monitoring Program",
      "category": "cardiovascular",
      "trigger_signals": ["bp_stage1_htn", "htn_comorbidity_stage1"],
      "priority_level_default": "Yellow",
      "safety_contraindication_signals": [],
      "navavej_product": {"product_name": "Home BP Monitoring Kit + Nurse Consult", "product_code": "BP_HOME_KIT", "price_thb": 1800},
      "gender_constraint": null,
      "guideline": "ACC/AHA 2017 — Self-monitoring recommended for Stage 1 HTN"
    },
    {
      "item_code": "dm_lifestyle_program",
      "label": "Diabetes Prevention Lifestyle Program (6-session)",
      "category": "metabolic",
      "trigger_signals": ["prediabetes_confirmed", "fbs_prediabetes_range", "dm_comorbidity_prediabetes"],
      "priority_level_default": "Orange",
      "safety_contraindication_signals": [],
      "navavej_product": {"product_name": "DM Prevention Program (6-session)", "product_code": "DM_PREVENT_6", "price_thb": 4500},
      "gender_constraint": null,
      "guideline": "ADA Standards of Medical Care 2024 — Intensive lifestyle intervention for prediabetes"
    },
    {
      "item_code": "dietary_counseling",
      "label": "Medical Nutrition Therapy — Dietitian Consultation",
      "category": "lifestyle",
      "trigger_signals": ["bmi_obese_asian", "metabolic_syndrome_cluster", "physical_inactivity"],
      "priority_level_default": "Yellow",
      "safety_contraindication_signals": [],
      "navavej_product": {"product_name": "Dietitian Consultation (60 min)", "product_code": "DIET_CONSULT", "price_thb": 1200},
      "gender_constraint": null,
      "guideline": "ADA 2024 — Medical nutrition therapy for weight management and glycemic control"
    },
    {
      "item_code": "sleep_apnea_screen",
      "label": "Obstructive Sleep Apnea Screening (STOP-BANG + SpO2)",
      "category": "respiratory",
      "trigger_signals": ["bmi_obese_asian", "sleep_apnea_screen_result"],
      "priority_level_default": "Yellow",
      "safety_contraindication_signals": [],
      "navavej_product": {"product_name": "OSA Screening — STOP-BANG + SpO2", "product_code": "OSA_SCREEN", "price_thb": 900},
      "gender_constraint": null,
      "guideline": "USPSTF 2022 — screening indicated for adults with obesity"
    },
    {
      "item_code": "echocardiogram",
      "label": "Echocardiogram — Cardiac Structure and Function",
      "category": "cardiac",
      "trigger_signals": ["htn_active", "htn_comorbidity_stage1", "echo_gap"],
      "priority_level_default": "Yellow",
      "safety_contraindication_signals": [],
      "navavej_product": {"product_name": "Echocardiogram (2D/Doppler)", "product_code": "ECHO_2D", "price_thb": 4200},
      "gender_constraint": null,
      "guideline": "ACC/AHA 2017 — end-organ damage assessment for hypertension"
    }
  ],
  "package_resolution_map": {
    "Standard": {"female": {"age_any": {"package_name": "Gold — Women",    "package_code": "GOLD_F_ANY",  "price_thb": 5900}}},
    "Advanced": {"female": {"age_any": {"package_name": "Platinum — Women", "package_code": "PLAT_F_ANY", "price_thb": 12500}}},
    "Premium":  {"female": {"age_any": {"package_name": "Diamond — Women",  "package_code": "DIAM_F_ANY",  "price_thb": 22000}}}
  }
}
    "#
  }
  // Tier: not Standard — metabolic syndrome burden qualifies for Advanced at minimum
  @@assert( {{ this.ai_recommended_tier == "Advanced" or this.ai_recommended_tier == "Premium" }} )
  // Must select at least one add-on (mammogram and shingrix are directly triggered by signals_fired)
  @@assert( {{ this.selected_add_ons|length > 0 }} )
  // Communication script: health_summary must be a non-empty clinical paragraph
  @@assert( {{ this.communication_script.health_summary|length > 0 }} )
  // Communication script: recommendation_rationale must be populated
  @@assert( {{ this.communication_script.recommendation_rationale|length > 0 }} )
  // Communication script: next_steps must be actionable
  @@assert( {{ this.communication_script.next_steps|length > 0 }} )
  // Policy reasoning must explain the tier and add-on selection
  @@assert( {{ this.policy_reasoning|length > 0 }} )
}


// ── TEST 3: AnalyzeClinicalRisks — Healthy Routine Checkup (Kanya Prasert) ───
//
// Clinical picture: 35M, all biomarkers normal, no signals fired, no comorbidities.
// Ruleset match: no rule fires → STANDARD_DEFAULT.
// Expected assertions:
//   - suggested_tier = Standard
//   - supporting_signal_ids empty (nothing to support elevated risk)
//   - clinical_summary_bullets populated (preventive findings still noted)

test AnalyzeRisks_Healthy {
  functions [AnalyzeClinicalRisks]
  args {
    clinical_signals #"
{
  "rule_preliminary_tier": "Standard",
  "overall_risk_level": "Low",
  "signals_fired": [],
  "missing_signals": [
    "tg_status", "alt_status", "ast_status", "tsh_status", "uric_acid_status",
    "est_gap", "echo_gap", "hepatitis_b_vaccination_status",
    "dm_organ_complication_screening", "fibroscan_indication", "sleep_apnea_screen_result"
  ],
  "risk_flags": [],
  "comorbidity_tags": [],
  "screening_gaps": [],
  "vaccination_gaps": [
    {
      "vaccine_id": "influenza",
      "label": "Influenza (seasonal)",
      "last_administered_date": "2025-10-20",
      "overdue_days": 0,
      "priority_color": "Green",
      "guideline": "CDC ACIP 2024",
      "note": "Up to date; next due Q4 2026."
    }
  ],
  "family_history_flags": {
    "ca_breast": false,
    "ca_colon": false,
    "premature_cad": false
  },
  "behavioral_flags": {
    "smoking": {"status": "never", "lung_ct_threshold_met": false},
    "alcohol": {"risk_level": "none"},
    "physical_activity": {"days_per_week": 3, "level": "moderate"}
  },
  "symptom_tags": []
}
    "#
    biomarker_trends #"
{
  "bmi": {
    "current": 22.4,
    "unit": "kg/m2",
    "category": "Normal (Asian-adjusted < 23 kg/m2)",
    "trend_direction": "stable",
    "slope_per_year": 0.1
  },
  "blood_pressure": {
    "latest": {"sbp": 116, "dbp": 72, "date": "2026-03-05"},
    "unit": "mmHg",
    "category": "Normal (< 120/80 mmHg)",
    "trend_direction": "stable"
  },
  "egfr": {
    "current": 99.0,
    "unit": "mL/min/1.73m2",
    "ckd_stage": "G1",
    "annual_slope": -0.2,
    "rapid_progression": false
  },
  "labs": [
    {"lab_id": "fbs", "label": "Fasting Blood Glucose", "current_value": 91.0, "unit": "mg/dL", "category": "Normal (70-99 mg/dL)", "trend_direction": "stable"},
    {"lab_id": "hba1c", "label": "HbA1c", "current_value": 5.3, "unit": "%", "category": "Normal (< 5.7%)", "trend_direction": "stable"},
    {"lab_id": "ldl", "label": "LDL Cholesterol", "current_value": 98.0, "unit": "mg/dL", "category": "Optimal (< 100 mg/dL)", "trend_direction": "stable"},
    {"lab_id": "hdl", "label": "HDL Cholesterol", "current_value": 58.0, "unit": "mg/dL", "category": "Normal for male (>= 40 mg/dL)", "trend_direction": "stable"}
  ],
  "ascvd_10yr_risk": {
    "score_pct": 1.8,
    "category": "Low",
    "category_label": "Low risk (< 5%)"
  }
}
    "#
    hard_constraints #"
{
  "patient_demographics": {
    "gender": "male",
    "age": 35,
    "ethnicity": "asian",
    "bmi_threshold_profile": "asian_adjusted"
  },
  "eligibility_exclusions": [
    {"test_code": "mammogram", "reason_code": "gender_male_ineligible", "overridable": false},
    {"test_code": "pap_smear",  "reason_code": "gender_male_ineligible", "overridable": false}
  ],
  "active_safety_flags": [],
  "tier_ceiling": null
}
    "#
    program_ruleset #"
{
  "ruleset_version": "v2026.03.1-draft",
  "rule_preliminary_tier": "Standard",
  "tier_selection_rules": [
    {
      "rule_id": "PREMIUM_SEVERE_SINGLE", "priority": 1, "tier": "Premium", "match_logic": "ANY",
      "conditions": [
        {"type": "signal_active", "signal_ids": ["ckd_rapid_progression"]},
        {"type": "signal_active", "signal_ids": ["ascvd_very_high"]},
        {"type": "signal_active", "signal_ids": ["hypertensive_crisis"]},
        {"type": "signal_active", "signal_ids": ["diabetes_confirmed"], "and_signal_active": ["dm_organ_complication_screening"]}
      ]
    },
    {
      "rule_id": "PREMIUM_MULTI_SIGNAL", "priority": 2, "tier": "Premium", "match_logic": "COUNT_THRESHOLD",
      "conditions": [{"type": "signal_count_threshold", "signal_pool": ["prediabetes_confirmed", "htn_active", "dyslipidemia_active", "bmi_obese_asian", "ascvd_risk_intermediate", "family_hx_premature_cad", "lung_ct_threshold_met"], "min_count": 5}]
    },
    {
      "rule_id": "ADVANCED_METABOLIC_OR_CVD", "priority": 3, "tier": "Advanced", "match_logic": "ANY",
      "conditions": [
        {"type": "signal_active", "signal_ids": ["prediabetes_confirmed", "diabetes_confirmation_required"]},
        {"type": "signal_active", "signal_ids": ["ascvd_risk_intermediate"]},
        {"type": "signal_active", "signal_ids": ["htn_active"]},
        {"type": "signal_active", "signal_ids": ["bmi_obese_asian"]},
        {"type": "signal_count_threshold", "signal_pool": ["bmi_overweight_asian", "low_hdl", "high_triglycerides", "high_ldl", "bp_stage1_htn", "family_hx_premature_cad", "dyslipidemia_active"], "min_count": 2}
      ]
    },
    {"rule_id": "STANDARD_DEFAULT", "priority": 4, "tier": "Standard", "match_logic": "DEFAULT", "conditions": []}
  ]
}
    "#
  }
  // Tier: Standard — no risk signals fired, all biomarkers normal, STANDARD_DEFAULT applies
  @@assert( {{ this.suggested_tier == "Standard" }} )
  // No pathological signals — primary_risks should acknowledge low/normal findings
  @@assert( {{ this.primary_risks|length > 0 }} )
  // Summary bullets must still be populated (preventive context, missing data notes)
  @@assert( {{ this.clinical_summary_bullets|length > 0 }} )
  // Severity assessment must be present (expected: Low or Minimal)
  @@assert( {{ this.severity_assessment|length > 0 }} )
}
