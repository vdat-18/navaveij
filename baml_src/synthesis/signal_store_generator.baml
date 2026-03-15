// Signal Store Generator - Synthesizes complete Signal Store DB records
// Based on signal-store-contract.md v1.0

function SynthesizeSignalStoreRecord(scenario: ClinicalScenario) -> SignalStoreRecord {
  client NavaveijClient

  prompt #"
    Generate a complete Signal Store DB record according to signal-store-contract.md v1.0.
    
    CONTEXT:
    - This is for Navavej International Hospital AI Recommendation Engine testing
    - The record must follow the exact schema in signal-store-contract.md
    - All signal IDs must match the Field Dictionary (40 signals total)
    - Patient token format: "tok_hmac_XXXXXXXX" (8 hex digits)
    - Pipeline run ID format: "pipe_YYYYMMDD_HHMM"
    
    REQUIREMENTS:
    
    1. SIGNAL ID CATALOG COMPLIANCE (40 signals from Field Dictionary):
       
       Lab Signals (11):
       - fbs_status, hba1c_status, ldl_status, hdl_status, tg_status
       - alt_status, ast_status, egfr_status, tsh_status
       - psa_sdm_status (male only, age 50-69)
       - uric_acid_status
       
       Vital Signals (2):
       - bp_category, bmi_status
       
       Screening Gaps (7):
       - colonoscopy_screening_gap (age ≥45)
       - mammogram_screening_gap (female, age 40-74)
       - pap_smear_screening_gap (female, age 21-65)
       - lung_ldct_gap (age 50-80, pack-years ≥20)
       - dexa_screening_gap (female ≥65)
       - est_gap, echo_gap
       
       Vaccination (5):
       - influenza_vaccination_gap (all adults, annual)
       - hepatitis_b_vaccination_status (all ages)
       - hpv_vaccination_gap (≤45)
       - pneumococcal_vaccination_gap (≥65)
       - shingrix_vaccination_gap (≥50)
       
       Family History (4):
       - family_hx_premature_cad, family_hx_breast_ca (female), family_hx_colon_ca, family_hx_prostate_ca (male)
       
       Behavioral (4):
       - smoking_status, lung_ct_threshold, alcohol_risk, occupational_risk
       
       Comorbidity (4):
       - dm_comorbidity, htn_comorbidity, ckd_comorbidity, dyslipidemia_comorbidity
       
       Computed (3):
       - ascvd_10yr_risk_status, dm_organ_complication_screening, fibroscan_indication
       
       Other (4):
       - reproductive_history (female), frax_bone_density_risk (female <65), sleep_apnea_screen_result, physical_activity_level
    
    2. THREE PARALLEL SIGNAL LISTS (Critical for Confidence Calibrator):
       - applicable_signals[]: ALL signals evaluated for this patient profile (based on age, gender, ethnicity)
         * For male: exclude mammogram_screening_gap, pap_smear_screening_gap, reproductive_history, frax_bone_density_risk
         * For female: exclude psa_sdm_status
         * Age-based: exclude pneumococcal_vaccination_gap if age < 65, exclude shingrix_vaccination_gap if age < 50
         * Typically 30-35 signals for a middle-aged patient
       - signals_fired[]: Subset that evaluated to active (realistic subset, 15-25 signals, not all)
         * Must be a proper subset of applicable_signals
         * Signal IDs use snake_case (e.g., "prediabetes_confirmed", "colonoscopy_overdue_2557d")
       - missing_signals[]: Signals in applicable but with no source data
         * Examples: sleep_apnea_screen_result (questionnaire not done), physical_activity_level (not asked)
         * Typically 2-5 missing signals for realistic data
       - signal_coverage = len(signals_fired) / len(applicable_signals) should be 0.6-0.9
    
    3. CLINICAL SCENARIO MAPPING:
       
       Based on the scenario provided, generate data that matches:
       
       - UncontrolledHypertension: signals_fired MUST include htn_active, bp_stage1_htn or bp_stage2_htn, bp_trend_worsening.
         Risk flags MUST include BP-related flags with severity "Moderate" or "High".
         biomarker_trends.blood_pressure MUST show increasing trend (sbp_slope_per_year > 0, trend_direction: "increasing").
         comorbidity_tags MUST include HTN with on_treatment: true.
       
       - MetabolicSyndromeRisk: signals_fired MUST include prediabetes_confirmed, bmi_overweight_asian or bmi_obese_asian, dyslipidemia_active.
         Risk flags MUST include metabolic flags (prediabetes_confirmed, ldl_borderline_high, etc.).
         biomarker_trends.labs MUST show worsening trends for FBS, HbA1c, lipids.
       
       - SeniorCancerScreeningGap: signals_fired MUST include colonoscopy_overdue_XXXd (overdue > 2 years = 730+ days).
         If female: mammogram_overdue_XXXd (overdue > 2 years).
         screening_gaps MUST show overdue_days > 730, priority_color: "Red", overdue_score > 0.8.
         age MUST be ≥50.
       
       - EarlyOnsetDiabetes: signals_fired MUST include diabetes_confirmed, dm_comorbidity, dm_organ_complication_screening.
         Risk flags MUST include diabetes_confirmed with severity "High".
         comorbidity_tags MUST include DM with organ_risk_tags.
       
       - ChronicKidneyDiseaseProgression: signals_fired MUST include ckd_comorbidity, ckd_rapid_progression (if annual_slope < -5).
         biomarker_trends.egfr MUST show declining trend (annual_slope < 0).
         Risk flags MUST include CKD-related flags.
       
       - HealthyRoutineCheckup: signals_fired should be minimal (5-10 signals, mostly normal/low severity).
         No major risk flags (severity "High" or "Critical").
         rule_preliminary_tier: "Standard".
    
    4. RISK FLAGS STRUCTURE:
       Each risk_flag MUST have:
       - flag_id: exact signal ID from catalog (e.g., "prediabetes_confirmed", "bp_stage1_htn", "lung_ct_threshold_met")
       - label: human-readable (e.g., "Pre-diabetes confirmed", "Stage 1 Hypertension (ACC/AHA 2017)")
       - severity: "Low" | "Moderate" | "High" | "Critical"
       - source_signals: array of specific value signals (e.g., ["fbs_108_mgdl", "hba1c_6_1_pct"])
       - guideline: citation (e.g., "ADA Standards of Medical Care 2024", "ACC/AHA High Blood Pressure Guideline 2017")
       - add_on_triggers: array of add-on item codes if applicable (e.g., ["hba1c_repeat_12_months"])
    
    5. BIOMARKER TRENDS:
       - bmi: MUST have trend_direction, slope_per_year (if ≥3 data points), history[] with ≥3 data points spanning 2-3 years
       - blood_pressure: MUST have trend_direction, sbp_slope_per_year (if ≥3 readings), history[] with ≥3 readings
       - egfr: MUST have annual_slope, rapid_progression flag (true if annual_slope < -5), history[] with ≥3 values
       - labs[]: Each lab MUST have:
         * velocity_per_year if ≥3 data points (null if insufficient)
         * trend_direction: "increasing" | "stable" | "decreasing" | "insufficient_data"
         * trend_flag: "worsening" | "improving" | "stable" (null if insufficient_data)
         * history[] with at least 1 data point (prefer 3+ for trends)
       - ascvd_10yr_risk: MUST be computed with inputs_used object (age, sex, race, total_cholesterol, hdl, systolic_bp, bp_treatment, diabetes, smoking)
    
    6. HARD CONSTRAINTS:
       - eligibility_exclusions: MUST include gender-based exclusions
         * Male: exclude mammogram, pap_smear, cervical_cancer_hpv_screen
         * Female: exclude psa_sdm (if age < 50 or > 69)
         * Age-based: exclude colonoscopy if age > 85, exclude hpv_vaccination if age > 45
       - active_safety_flags: Include if eGFR < 30 (ckd_no_contrast), hypertensive_crisis, hypoglycemia_active
       - tier_ceiling: null unless patient is severely frail (eGFR < 30, end-stage disease)
    
    7. SCREENING GAPS:
       - overdue_days: calculated from last_performed_date + recommended_interval_months vs today
       - overdue_score: 0.0 (not due) to 1.0 (severely overdue/never done)
       - priority_color: "Red" (overdue ≥2× interval or never done), "Orange" (overdue <2×), "Yellow" (approaching due), "Green" (not yet due)
    
    8. VACCINATION GAPS:
       - influenza_vaccination_gap: overdue_days if > 14 months since last
       - shingrix_vaccination_gap: eligible_since_age 50, doses_received vs doses_required (2)
       - pneumococcal_vaccination_gap: only applicable if age ≥65
       - hepatitis_b_vaccination_status: series_complete, anti_hbs_checked flag
    
    9. DATA COMPLETENESS:
       - _meta.data_completeness_ratio: 0.7-0.95 (realistic range)
       - _meta.total_key_fields: 40-45
       - _meta.populated_key_fields: calculated from total (e.g., 40 populated / 45 total = 0.889)
       - _meta.missing_data_fields: list of signals with no data (e.g., ["sleep_apnea_screen_result", "physical_activity_level"])
    
    10. SIGNAL NAMING CONVENTION:
        - All signal IDs use snake_case
        - Derived from clinical-guidelines-reference.md flag names
        - Examples: "prediabetes_confirmed", "colonoscopy_overdue_2557d", "lung_ct_threshold_met", "bp_stage1_htn"
        - Overdue signals: "{screening_id}_overdue_{days}d" (e.g., "colonoscopy_overdue_2557d")
    
    11. RULE PRELIMINARY TIER:
        - "Standard": Low risk, no major signals
        - "Advanced": Moderate risk (prediabetes, active HTN, ASCVD intermediate, etc.)
        - "Premium": High risk (diabetes with complications, rapid CKD progression, ASCVD very high, multi-signal count ≥4)
        - Must be consistent with signals_fired[] and risk_flags[]
    
    12. TIMESTAMPS:
        - schema_version: MUST be "signal_store_record_v1"
        - computed_at: ISO 8601 UTC (e.g., "2026-03-12T03:00:00Z")
        - pipeline_run_id: "pipe_YYYYMMDD_HHMM" (e.g., "pipe_20260312_0300")
        - fhir_snapshot_version: "fhir_snap_YYYYMMDD" (e.g., "fhir_snap_20260312")
        - All dates in history arrays: ISO 8601 format (YYYY-MM-DD)
    
    13. THAI LOCALIZATION:
        - Use Thai names (e.g., Somchai, Arisa, Boonmee) but formatted in English
        - Ethnicity: "asian" for Thai patients
        - bmi_threshold_profile: "asian_adjusted" for Thai/SE Asian patients
        - Units: mg/dL, kg/m², U/L, mmHg (Thai hospital standards)
    
    {{ ctx.output_format }}
  "#
}
