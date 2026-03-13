# Clinical Guidelines Reference
## Smart Health Checkup Recommendation Dashboard — Signal Processing Rules Basis

**Version:** 1.0
**Date:** 2026-03-12
**Audience:** Clinical Signal Engine implementation team
**Purpose:** Defines the clinical thresholds, screening intervals, and risk rules used by the Clinical Signal Engine to transform raw FHIR patient data into structured health signals (risk flags, screening gaps, abnormal triggers, overdue scores). Every rule traces to a named guideline with source and year.

---

## How to Read This Document

Each section follows this structure:
- **Source** — Organization, guideline name, year
- **Thresholds / Rules** — Precise numeric values with sex/age/ethnicity adjustments
- **FHIR Signal** — Which LOINC code or FHIR resource this reads from (references `fhir-discovery-report.md`)
- **Signal Processing Rule** — Pseudocode rule the Clinical Signal Engine applies

---

## Section 1 — Lab Reference Ranges & Abnormal Thresholds

### 1.1 Fasting Blood Glucose (FBS)

**Source:** American Diabetes Association (ADA), *Standards of Medical Care in Diabetes*, 2024

| Category | FBS Range (mg/dL) | Signal Processing Rule |
|---|---|---|
| Normal | < 100 | `interpretation: N` |
| Pre-diabetic | 100 – 125 | `abnormal_trigger: prediabetes_confirmed` → flag HbA1c order |
| Diabetic (diagnostic) | ≥ 126 (requires confirmation) | `abnormal_trigger: diabetes_confirmation_required` → flag HbA1c + repeat FBS |
| Hypoglycemia | < 70 | `abnormal_trigger: hypoglycemia_alert` (safety flag) |

**FHIR Signal:** `Observation` LOINC `1558-6` / `76629-5`, `Observation.valueQuantity.value`

**Signal Processing Rules:**
```
if fbs >= 126 → abnormal_trigger: "diabetes_confirmation_required", risk_flag: "dm_high_risk"
if fbs >= 100 and fbs < 126 → abnormal_trigger: "prediabetes", risk_flag: "dm_moderate_risk"
if fbs < 70 → hard_constraint_flag: "hypoglycemia_active" (safety, cannot recommend exercise stress test)
```

---

### 1.2 HbA1c

**Source:** ADA *Standards of Medical Care*, 2024

| Category | HbA1c | Signal Processing Rule |
|---|---|---|
| Normal | < 5.7% | `interpretation: N` |
| Pre-diabetic | 5.7% – 6.4% | `abnormal_trigger: prediabetes_confirmed` |
| Diabetic | ≥ 6.5% | `abnormal_trigger: diabetes_confirmed` |

**FHIR Signal:** `Observation` LOINC `4548-4`, `Observation.valueQuantity.value`

**Signal Processing Rules:**
```
if hba1c >= 6.5 → abnormal_trigger: "diabetes_confirmed", comorbidity_tag: "DM"
if hba1c >= 5.7 and hba1c < 6.5 → abnormal_trigger: "prediabetes_confirmed"
  → add_on_trigger: "hba1c_repeat_in_12_months"
  → add_on_trigger: "dm_education_referral"
```

**Progression monitoring (ADA 2024):** Once pre-diabetes confirmed, retest every 1 year (high risk) to 3 years (lower risk). Once DM confirmed, HbA1c every 3 months until controlled, then every 6 months.

---

### 1.3 Lipid Panel

**Source:** ACC/AHA *2018 Guideline on the Management of Blood Cholesterol*

#### LDL Cholesterol

| Category | LDL (mg/dL) | Clinical Significance |
|---|---|---|
| Optimal | < 100 | Ideal for patients with CVD risk |
| Near-optimal | 100 – 129 | — |
| Borderline High | 130 – 159 | Consider lifestyle modification |
| High | 160 – 189 | Consider pharmacotherapy |
| Very High | ≥ 190 | Statin therapy indicated (guideline-directed) |

**FHIR Signal:** `Observation` LOINC `13457-7` (calculated) / `18262-6` (direct)

**Signal Processing Rules:**
```
if ldl >= 190 → abnormal_trigger: "severe_hypercholesterolemia", add_on: "lipid_specialist_referral"
if ldl >= 160 → abnormal_trigger: "high_ldl", risk_flag: "cv_risk_elevated"
if ldl >= 130 → abnormal_trigger: "borderline_high_ldl"
```

#### HDL Cholesterol

| Category | Male | Female |
|---|---|---|
| Low (risk factor) | < 40 mg/dL | < 50 mg/dL |
| Borderline low | 40–59 mg/dL | 50–59 mg/dL |
| Protective | ≥ 60 mg/dL | ≥ 60 mg/dL |

**FHIR Signal:** `Observation` LOINC `2085-9`

```
if hdl < 40 and gender == "male" → risk_flag: "low_hdl", cv_risk_factor: true
if hdl < 50 and gender == "female" → risk_flag: "low_hdl", cv_risk_factor: true
```

#### Total Cholesterol

| Category | Value |
|---|---|
| Desirable | < 200 mg/dL |
| Borderline High | 200 – 239 mg/dL |
| High | ≥ 240 mg/dL |

**FHIR Signal:** `Observation` LOINC `2093-3`

#### Triglycerides

| Category | Value |
|---|---|
| Normal | < 150 mg/dL |
| Borderline High | 150 – 199 mg/dL |
| High | 200 – 499 mg/dL |
| Very High | ≥ 500 mg/dL (pancreatitis risk) |

**FHIR Signal:** `Observation` LOINC `2571-8`

```
if tg >= 500 → hard_constraint_flag: "hypertriglyceridemia_severe" (pancreatitis risk — flag urgently)
if tg >= 200 → abnormal_trigger: "high_triglycerides", add_on: "fibroscan_indicated"
```

---

### 1.4 Liver Enzymes (ALT, AST)

**Source:** AASLD *Practice Guidance on Nonalcoholic Fatty Liver Disease*, 2023; standard lab ULN

| Level | ALT (men) | ALT (women) | AST |
|---|---|---|---|
| Normal (ULN) | ≤ 40 U/L | ≤ 35 U/L | ≤ 40 U/L |
| Mildly elevated | 1–3× ULN | — | — |
| Significantly elevated | > 3× ULN | — | — |
| Critical | > 10× ULN | — | — |

**FHIR Signals:** ALT: LOINC `1742-6`; AST: LOINC `1920-8`

```
uln_alt = 40 if gender == "male" else 35
if alt > 3 * uln_alt → abnormal_trigger: "liver_enzyme_elevation_significant"
  → add_on: "hepatitis_panel", add_on: "fibroscan_indicated"
if alt > uln_alt and alt <= 3 * uln_alt → abnormal_trigger: "liver_enzyme_mildly_elevated"
  → add_on: "fatty_liver_workup"
```

---

### 1.5 Kidney Function (Creatinine & eGFR)

**Source:** KDIGO *2022 Clinical Practice Guideline for Diabetes Management in Chronic Kidney Disease*; KDIGO CKD guidelines

#### eGFR CKD Staging (KDIGO)

| Stage | eGFR (mL/min/1.73m²) | Description |
|---|---|---|
| G1 | ≥ 90 | Normal or high (with other kidney damage markers) |
| G2 | 60 – 89 | Mildly decreased |
| G3a | 45 – 59 | Mildly to moderately decreased |
| G3b | 30 – 44 | Moderately to severely decreased |
| G4 | 15 – 29 | Severely decreased |
| G5 | < 15 | Kidney failure |

**FHIR Signal:** `Observation` LOINC `62238-1` (CKD-EPI) / `69405-9` (MDRD)

```
if egfr < 15 → hard_constraint_flag: "ckd_stage5", comorbidity_tag: "CKD_G5"
  → hard_constraint: "no_contrast_procedures"
if egfr < 30 → comorbidity_tag: "CKD_G4", add_on: "nephrology_referral_urgent"
if egfr < 45 → comorbidity_tag: "CKD_G3b", add_on: "nephrology_referral"
if egfr < 60 → comorbidity_tag: "CKD_G3a", risk_flag: "kidney_impairment"
if egfr < 90 → comorbidity_tag: "CKD_G2"

# Rapid progression flag (KDIGO 2022)
if egfr_annual_slope < -5 → abnormal_trigger: "ckd_rapid_progression"
  → add_on: "nephrology_referral_urgent"
```

**Monitoring frequency by CKD stage (KDIGO 2022):**
- G1–G2: Once yearly
- G3a–G3b: 1–2× per year
- G4: 2–3× per year
- G5: > 3× per year / nephrology-managed

---

### 1.6 TSH (Thyroid)

**Source:** ATA *2014 Hypothyroidism Guidelines* (standard reference ranges)

| Category | TSH (mIU/L) |
|---|---|
| Low (possible hyperthyroidism) | < 0.4 |
| Normal | 0.4 – 4.0 |
| Borderline high | 4.0 – 10.0 |
| High (hypothyroidism likely) | > 10.0 |

**FHIR Signal:** `Observation` LOINC `3016-3`

```
if tsh > 10.0 → abnormal_trigger: "hypothyroidism_likely", add_on: "thyroid_free_t4"
if tsh > 4.0 → abnormal_trigger: "tsh_borderline_high", add_on: "thyroid_follow_up_6_months"
if tsh < 0.4 → abnormal_trigger: "hyperthyroidism_possible", add_on: "thyroid_free_t3_t4"
```

---

### 1.7 PSA (Prostate-Specific Antigen)

**Source:** ACS *2023 Prostate Cancer Early Detection Guideline*; USPSTF *2018 Recommendation on PSA Screening*

> **Important:** Neither ACS nor USPSTF endorses universal PSA screening with fixed cut-off thresholds. Both recommend **shared decision-making (SDM)**. The age-specific reference values below are from institutional lab norms, not universal action thresholds.

| Age Band | Institutional ULN | ACS Guidance |
|---|---|---|
| 40–49 | < 2.5 ng/mL | SDM at age 40 if high risk (family Hx, BRCA2, African descent) |
| 50–59 | < 3.5 ng/mL | SDM at age 50 for average risk |
| 60–69 | < 4.5 ng/mL | SDM; benefit less clear after 70 |
| 70+ | — | USPSTF: recommends against routine screening |

**FHIR Signal:** `Observation` LOINC `2857-1`

```
# Only applies to male patients
if gender == "male":
  if age < 50 and (family_hx_prostate_ca or brca2_carrier):
    → add_on: "psa_screening_sdm_discussion" (high-risk early start)
  if age >= 50 and age < 70:
    psa_uln = 2.5 if age < 50 else (3.5 if age < 60 else 4.5)
    if psa > psa_uln:
      → abnormal_trigger: "psa_elevated_sdm_required"
      → add_on: "urology_referral_sdm"
  if age >= 70:
    → no routine PSA recommendation (USPSTF)
```

---

### 1.8 Uric Acid

**Source:** ACR *2020 Guideline for the Management of Gout*

| Category | Male | Female |
|---|---|---|
| Hyperuricemia | > 7.0 mg/dL | > 6.0 mg/dL |

**FHIR Signal:** `Observation` LOINC `3084-1`

```
threshold = 7.0 if gender == "male" else 6.0
if uric_acid > threshold → abnormal_trigger: "hyperuricemia", risk_flag: "gout_risk"
```

---

## Section 2 — Blood Pressure Classification

**Source:** ACC/AHA *2017 High Blood Pressure Clinical Practice Guideline*

> Note: JNC 8 (2014) used 140/90 as Stage 1 threshold. ACC/AHA 2017 lowered this to 130/80. This system applies ACC/AHA 2017.

| Category | Systolic (mmHg) | Diastolic (mmHg) | Signal |
|---|---|---|---|
| Normal | < 120 | AND < 80 | `bp_category: "Normal"` |
| Elevated | 120 – 129 | AND < 80 | `bp_category: "Elevated"` |
| Stage 1 HTN | 130 – 139 | OR 80 – 89 | `bp_category: "Stage1_HTN"` |
| Stage 2 HTN | ≥ 140 | OR ≥ 90 | `bp_category: "Stage2_HTN"` |
| Hypertensive Crisis | > 180 | OR > 120 | `bp_category: "Crisis"` — safety flag |

**FHIR Signal:** `Observation` panel LOINC `85354-9`; SBP: `8480-6`, DBP: `8462-4`

**Signal Processing Rules:**
```
sbp = latest systolic observation value
dbp = latest diastolic observation value

if sbp > 180 or dbp > 120:
  → hard_constraint_flag: "hypertensive_crisis" (do NOT recommend exercise stress test)
  → abnormal_trigger: "hypertensive_crisis_urgent_referral"
elif sbp >= 140 or dbp >= 90:
  → bp_category: "Stage2_HTN"
  → risk_flag: "cv_risk_elevated", comorbidity_tag: "HTN"
  → add_on: "ambulatory_bp_monitoring" if not already on treatment
elif sbp >= 130 or dbp >= 80:
  → bp_category: "Stage1_HTN"
  → risk_flag: "cv_risk_moderate"
elif sbp >= 120 and dbp < 80:
  → bp_category: "Elevated"
  → risk_flag: "prehypertension"
else:
  → bp_category: "Normal"
```

**Trend flag:**
```
if bp_trend_direction == "increasing" and bp_category in ["Elevated", "Stage1_HTN"]:
  → trend_flag: "bp_worsening", priority_color: "orange"
```

---

## Section 3 — BMI Classification

**Primary Source:** WHO *Obesity: Preventing and Managing the Global Epidemic*, 2000
**Asia-Pacific Adjustment:** WHO/IASO/IOTF *The Asia-Pacific Perspective: Redefining Obesity and its Treatment*, 2000

> For Thai and Southeast Asian patients, the Asian-adjusted thresholds apply.

| Category | WHO Global | Asian-Adjusted (SE Asian) |
|---|---|---|
| Underweight | < 18.5 | < 18.5 |
| Normal | 18.5 – 24.9 | 18.5 – 22.9 |
| Overweight | 25.0 – 29.9 | 23.0 – 27.4 |
| Obese Class I | 30.0 – 34.9 | 27.5 – 32.4 |
| Obese Class II | 35.0 – 39.9 | 32.5 – 37.4 |
| Morbidly Obese | ≥ 40.0 | ≥ 37.5 |

**FHIR Signal:** `Observation` LOINC `39156-5`

**Signal Processing Rules:**
```
# Use Asian-adjusted thresholds when ethnicity == "asian"
thresholds = ASIAN if patient.ethnicity == "asian" else WHO_GLOBAL

if bmi >= thresholds.morbidly_obese:
  → risk_flag: "morbid_obesity", add_on: "bariatric_referral_sdm"
  → add_on: "sleep_apnea_screen", add_on: "metabolic_panel"
elif bmi >= thresholds.obese:
  → risk_flag: "obesity", abnormal_trigger: "bmi_obese"
  → add_on: "dietary_counseling", add_on: "sleep_apnea_screen"
elif bmi >= thresholds.overweight:
  → risk_flag: "overweight", abnormal_trigger: "bmi_overweight"
elif bmi < 18.5:
  → risk_flag: "underweight"
else:
  → bmi_status: "normal"

# Trend flag
if bmi_trend_direction == "increasing" and bmi_slope > 0.5:  # kg/m² per year
  → trend_flag: "bmi_increasing_rapid"
```

---

## Section 4 — Cancer Screening Intervals & Age Eligibility

### 4.1 Breast Cancer (Mammography)

**Source:** USPSTF *Final Recommendation: Breast Cancer Screening*, April 30, 2024 (B grade)
**Also:** ACS *2023 Breast Cancer Guideline Update*

| Guideline | Start Age | Interval | Stop Age |
|---|---|---|---|
| USPSTF 2024 | **40** | Every 2 years | 74 (insufficient evidence 75+) |
| ACS 2023 | 40 (optional 40–44, recommended 45+) | Annual (45–54), every 1–2 years (55+) | Continue as long as healthy |

> This system uses **USPSTF 2024** as the primary rule (biennial starting at 40), with ACS annual noted as an acceptable alternative.

**FHIR Signal:** `Procedure` CPT `77067` / `77066` + `Procedure.performedDateTime`

**Eligibility:** `gender == "female"` AND `age >= 40` AND `age <= 74`

**High-risk escalation:**
- First-degree relative with breast cancer → consider annual MRI + mammogram from age 30 (ACS)
- BRCA1/2 carrier → annual MRI + mammogram from age 25–30 (NCCN)

**Signal Processing Rules:**
```
if gender == "female" and age >= 40 and age <= 74:
  interval_months = 24  # USPSTF 2024 biennial
  if family_hx_breast_ca or brca_carrier:
    interval_months = 12  # High-risk annual
  mammogram_last = get_last_procedure_date("CPT:77067")
  overdue_days = today - (mammogram_last + interval_months * 30)
  if overdue_days > 0:
    → screening_gap: "mammogram", overdue_days: N, priority_color: "red" if overdue_days > 180 else "orange"
  if mammogram_last is null:
    → screening_gap: "mammogram_never_done", priority_color: "red"
elif gender == "female" and age > 74:
  → eligibility_note: "mammogram_sdm_above_74"
elif gender == "male":
  → hard_constraint: exclude "CPT:77067" from recommendations
```

---

### 4.2 Cervical Cancer (Pap Smear / HPV Co-test)

**Source:** USPSTF *Final Recommendation: Cervical Cancer Screening*, 2018 (A/B grade)
**Also:** ACOG *Practice Bulletin 168*, 2016 (reaffirmed)

| Age | Recommendation | Interval |
|---|---|---|
| < 21 | No screening | — |
| 21 – 29 | Pap smear alone | Every 3 years |
| 30 – 65 | Pap + HPV co-test (preferred) OR Pap alone | Every 5 years (co-test) OR every 3 years (Pap alone) |
| > 65 | Stop screening if adequate prior negative history | — |

**FHIR Signal:** `Procedure` CPT `88141` / `88175` + `Procedure.performedDateTime`

**Eligibility:** `gender == "female"` AND `age >= 21` AND `age <= 65`

**Signal Processing Rules:**
```
if gender == "female" and age >= 21 and age <= 29:
  interval_months = 36
  screen_type = "pap_smear"
elif gender == "female" and age >= 30 and age <= 65:
  interval_months = 60  # co-test preferred
  screen_type = "pap_hpv_cotest"
else:
  → no_cervical_screening_indicated

pap_last = get_last_procedure_date("CPT:88141", "CPT:88175")
overdue_days = today - (pap_last + interval_months * 30)
if overdue_days > 0:
  → screening_gap: "cervical_cancer_screen", overdue_days: N
```

---

### 4.3 Colorectal Cancer (Colonoscopy)

**Source:** USPSTF *Final Recommendation: Colorectal Cancer Screening*, May 2021 (A grade for 45–75)
**Also:** ACS *2018 Colorectal Cancer Guideline*

| Risk | Start Age | Interval | Stop Age |
|---|---|---|---|
| Average risk | **45** | Every 10 years (colonoscopy) | 75 (A grade); SDM 76–85; no screen > 85 |
| First-degree relative CRC (onset ≥ 60) | 40 | Every 10 years | — |
| First-degree relative CRC (onset < 60) | 40 OR 10 years before relative's onset | Every 5 years | — |

> USPSTF 2021 lowered start age from 50 → **45**.

**FHIR Signal:** `Procedure` CPT `45378` + `Procedure.performedDateTime`; `FamilyMemberHistory` for family risk

**Signal Processing Rules:**
```
start_age = 45  # default (USPSTF 2021)
interval_months = 120  # 10 years

# Family history adjustment
if family_hx_colon_ca:
  relative_onset_age = get_family_hx_onset_age("colon_ca")
  start_age = min(40, relative_onset_age - 10)
  interval_months = 60 if relative_onset_age < 60 else 120

if age >= start_age and age <= 85:
  colonoscopy_last = get_last_procedure_date("CPT:45378")
  overdue_days = today - (colonoscopy_last + interval_months * 30)
  if overdue_days > 0:
    → screening_gap: "colonoscopy", overdue_days: N
  if colonoscopy_last is null:
    → screening_gap: "colonoscopy_never_done", priority_color: "red"
elif age > 85:
  → hard_constraint: exclude colonoscopy (benefit outweighed by risk)
```

---

### 4.4 Lung Cancer (Low-Dose CT)

**Source:** USPSTF *Final Recommendation: Lung Cancer Screening*, March 2021 (B grade)

| Criterion | Requirement |
|---|---|
| Age | 50 – 80 years |
| Smoking history | ≥ 20 pack-years |
| Smoking status | Current smoker OR quit within past 15 years |

> USPSTF 2021 changed from: age 55–80, ≥30 pack-years.

**FHIR Signal:** `Observation` LOINC `8663-7` (pack-years), `72166-2` (smoking status); `Procedure` CPT `71250`

**Signal Processing Rules:**
```
pack_years = get_observation_value("LOINC:8663-7")
smoking_status = get_observation_coded("LOINC:72166-2")
years_since_quit = compute_years_since_quit()

lung_ct_eligible = (
  age >= 50 and age <= 80
  and pack_years >= 20
  and (smoking_status == "current" or years_since_quit <= 15)
)

if lung_ct_eligible:
  ldct_last = get_last_procedure_date("CPT:71250")
  if ldct_last is null or days_since(ldct_last) > 365:
    → screening_gap: "lung_ldct_annual", priority_color: "red" if ldct_last is null else "orange"
  → signal_flag: "lung_ct_threshold_met: true"
else:
  → signal_flag: "lung_ct_threshold_met: false"
```

---

### 4.5 Prostate Cancer (PSA)

See **Section 1.7** — rules apply here by reference.

**FHIR Signal:** `Procedure` CPT `86316` or `Observation` LOINC `2857-1`

---

### 4.6 Bone Density (DEXA)

**Source:** USPSTF *Final Recommendation: Osteoporosis to Prevent Fractures*, 2018 (B grade)
**Also:** NOF *Clinician's Guide to Prevention and Treatment of Osteoporosis*, 2022

| Eligibility | Criterion |
|---|---|
| Women ≥ 65 | Routine DEXA — grade B |
| Women < 65 | If 10-year FRAX fracture risk ≥ 10% (equals or exceeds a 65-year-old) |
| Men | Insufficient evidence for routine screening; consider if osteoporosis risk factors present |

**FHIR Signal:** `Procedure` CPT `77080`

**Signal Processing Rules:**
```
if gender == "female" and age >= 65:
  dexa_last = get_last_procedure_date("CPT:77080")
  interval_months = 24  # every 1–2 years if osteopenia; every 5 if normal
  if dexa_last is null or days_since(dexa_last) > interval_months * 30:
    → screening_gap: "bone_density_dexa"
elif gender == "female" and age >= 50:
  # Consider FRAX-based eligibility — flag for physician assessment
  → add_on_trigger: "dexa_frax_assessment"
```

---

### 4.7 Liver Cancer (HCC Surveillance)

**Source:** AASLD *Hepatocellular Carcinoma Guidance*, 2023

| Indication | Recommendation |
|---|---|
| Cirrhosis (any cause) | Ultrasound ± AFP every 6 months |
| Chronic Hepatitis B (specific subgroups) | Ultrasound ± AFP every 6 months |

**Signal Processing Rules:**
```
if comorbidity_tag includes "cirrhosis" or comorbidity_tag includes "chronic_hepatitis_b":
  → add_on: "liver_ultrasound_afp_surveillance"
  → screening_gap logic: every 6 months
```

---

## Section 5 — Cardiovascular Risk Assessment

### 5.1 ASCVD 10-Year Risk

**Source:** ACC/AHA *2013 Pooled Cohort Equations* (updated 2018)

**Required inputs:** Age, sex, race, total cholesterol, HDL, systolic BP, BP treatment status (yes/no), diabetes (yes/no), smoking status (current/no)

| 10-Year ASCVD Risk | Clinical Category | Statin Recommendation |
|---|---|---|
| < 5% | Low | Lifestyle only |
| 5% – < 7.5% | Borderline | SDM on statin |
| 7.5% – < 10% | Intermediate | Moderate-intensity statin (ACC/AHA IIa) |
| ≥ 10% | High | High-intensity statin (ACC/AHA I) |
| ≥ 20% | Very High | High-intensity statin + consider PCSK9i |

**Note:** ASCVD score is a derived/computed value, not directly stored in FHIR. The DE pipeline must compute it using the Pooled Cohort Equations and store as an `Observation` (LOINC `79423-0`).

**Signal Processing Rules:**
```
ascvd_risk = get_computed_ascvd_10yr_risk()  # from Signal Store computed field

if ascvd_risk >= 20:
  → risk_level: "High", risk_flag: "ascvd_very_high"
  → add_on: "cardiology_referral", add_on: "est_indication"
elif ascvd_risk >= 10:
  → risk_level: "High", risk_flag: "ascvd_high"
  → add_on: "est_consideration"
elif ascvd_risk >= 7.5:
  → risk_level: "Moderate", risk_flag: "ascvd_intermediate"
elif ascvd_risk >= 5:
  → risk_level: "Moderate"
else:
  → risk_level: "Low"
```

### 5.2 Exercise Stress Test (EST) Indications

**Source:** AHA/ACC *2002 Guidelines for Exercise Testing*; clinical practice

| Indication | Rule |
|---|---|
| Symptomatic (chest pain, dyspnea on exertion) | Strong indication |
| ASCVD risk ≥ 10% + sedentary starting vigorous exercise | Indicated |
| DM + age > 40 + 2+ CV risk factors | Indicated (ADA) |
| Hypertensive Crisis active | **Contraindicated** (hard constraint) |

**Signal Processing Rules:**
```
est_indicated = any([
  symptom_tags includes "chest_pain" or "dyspnea_on_exertion",
  ascvd_risk >= 10,
  (comorbidity_tag includes "DM" and age > 40 and cv_risk_factor_count >= 2)
])

if bp_category == "Crisis":
  → hard_constraint: exclude "CPT:93015" (EST contraindicated)
elif est_indicated:
  → add_on: "exercise_stress_test_indicated"
```

---

## Section 6 — Diabetes Risk & Follow-up

**Source:** ADA *Standards of Medical Care in Diabetes*, 2024 (Chapter 2: Classification and Diagnosis; Chapter 4: Comprehensive Medical Evaluation)

### 6.1 Screening Intervals for Pre-diabetes

| Risk Profile | Screening Frequency |
|---|---|
| Normal + low risk | Every 3 years (FBS or HbA1c) |
| Overweight/obese + 1 risk factor | Every 1–2 years |
| Pre-diabetes confirmed | Every 1 year (high progression risk) |
| Pre-diabetes + weight loss/metformin | Every 1 year |

### 6.2 Organ Complication Screening (Once DM Confirmed)

| Complication | Screening Test | Frequency | FHIR Resource |
|---|---|---|---|
| Diabetic retinopathy | Dilated eye exam | At diagnosis, then annually (or every 1–2 yrs if stable) | `Procedure` (ophthalmology) |
| Diabetic nephropathy | Urine albumin-to-creatinine ratio + eGFR | Annually | `Observation` |
| Diabetic neuropathy | Foot exam (monofilament) | Annually | `Procedure` |
| Cardiovascular | ASCVD risk assessment | Annually | Computed |
| Dyslipidemia | Fasting lipid panel | Annually | `Observation` |

**Signal Processing Rules:**
```
if comorbidity_tag includes "DM":
  → add_on: "diabetic_retinopathy_screen_annual"
  → add_on: "urine_acr_egfr_annual"
  → add_on: "foot_exam_annual"
  → escalate risk_level to minimum "Moderate"
```

---

## Section 7 — Kidney Disease Monitoring

**Source:** KDIGO *2022 Clinical Practice Guideline for Diabetes Management in CKD*; KDIGO *2012 CKD Guideline* (still current for staging)

### 7.1 eGFR Monitoring Frequency

| CKD Stage | eGFR | Monitoring Frequency |
|---|---|---|
| G1 | ≥ 90 | Once yearly (if CKD established) |
| G2 | 60–89 | Once yearly |
| G3a | 45–59 | 1–2× per year |
| G3b | 30–44 | 2× per year |
| G4 | 15–29 | 2–3× per year |
| G5 | < 15 | Nephrology-managed |

### 7.2 Rapid Progression Definition

> eGFR decline > 5 mL/min/1.73m² per year = rapid progression → nephrology referral

### 7.3 Contrast & NSAIDs Restrictions

```
if egfr < 30:
  → hard_constraint: "no_iodinated_contrast" (CT with contrast, IVP contraindicated)
  → hard_constraint: "no_nsaids"
  → hard_constraint: "no_metformin_without_renal_review"
```

---

## Section 8 — Liver Disease Risk & Screening

**Source:** AASLD *Practice Guidance on NAFLD/MASLD*, 2023; AASLD *HBV Management Guidelines*, 2023

### 8.1 FibroScan / Elastography Indications

| Indication | Criteria |
|---|---|
| MASLD/NAFLD workup | BMI ≥ 25 (Asian: ≥ 23) + elevated ALT > ULN OR metabolic syndrome |
| Alcohol-related liver disease | AUDIT-C ≥ 3 (women) / ≥ 4 (men) + elevated ALT |
| Chronic Hepatitis B monitoring | All HBsAg-positive patients |
| Severe hypertriglyceridemia | TG ≥ 200 mg/dL (associated with fatty liver) |

**FHIR Signal:** `Observation` (ALT: `1742-6`, AUDIT-C: `74013-4`), `Condition` (HBV, NAFLD)

**Signal Processing Rules:**
```
audit_c_threshold = 3 if gender == "female" else 4
bmi_threshold = 23 if ethnicity == "asian" else 25

nafld_risk = (bmi >= bmi_threshold and alt > uln_alt)
alcohol_risk = (audit_c >= audit_c_threshold and alt > uln_alt)
tg_risk = (tg >= 200)

if nafld_risk or alcohol_risk or tg_risk or comorbidity_tag includes "chronic_hepatitis_b":
  → add_on: "fibroscan_indicated"
```

### 8.2 Hepatitis B Vaccination & Anti-HBs Monitoring

**Source:** CDC ACIP 2022; AASLD

```
# Check for prior Hep B vaccination (CVX 08)
hepb_doses = count_immunizations("CVX:08")
if hepb_doses < 3:
  → vaccination_gap: "hepatitis_b_incomplete_series"
elif hepb_doses >= 3 and anti_hbs_titer is null or anti_hbs_titer < 10:
  → add_on: "anti_hbs_titer_check"
  # If titer < 10 mIU/mL → revaccination course (AASLD)
```

---

## Section 9 — Vaccination Schedules

**Source:** CDC ACIP *Recommended Adult Immunization Schedule*, 2024

### 9.1 Influenza

| Recommendation | Rule |
|---|---|
| All adults annually | Every year, ideally October–November |
| High-dose / adjuvanted preferred | Age ≥ 65 |

**FHIR Signal:** `Immunization` CVX `141` (standard injectable), `158` (recombinant), `161` (high-dose)

```
flu_last = get_last_immunization_date("CVX:141", "CVX:158", "CVX:161")
days_since_flu = days_since(flu_last)
# Flu season Oct–Apr; flag if > 14 months since last (catches missed seasons)
if flu_last is null or days_since_flu > 425:
  → vaccination_gap: "influenza_overdue", priority_color: "orange"
```

### 9.2 Hepatitis B

**Source:** ACIP 2022; Heplisav-B (2-dose) approved for adults ≥ 18

| Series | Doses | Schedule |
|---|---|---|
| Engerix-B / Recombivax (3-dose) | 3 | 0, 1, 6 months |
| Heplisav-B (2-dose) | 2 | 0, 1 month |

```
hepb_count = count_immunizations("CVX:08", "CVX:189")  # CVX 189 = Heplisav-B
if hepb_count == 0:
  → vaccination_gap: "hepatitis_b_not_started", priority_color: "red"
elif hepb_count < 2:  # incomplete regardless of series type
  → vaccination_gap: "hepatitis_b_series_incomplete"
```

### 9.3 HPV

**Source:** ACIP 2023

| Age | Recommendation |
|---|---|
| Through age 26 | Routine vaccination (catch-up if not previously vaccinated) |
| 27 – 45 | Shared decision-making |
| > 45 | Not recommended |

**FHIR Signal:** `Immunization` CVX `137` (9-valent Gardasil), `165`

```
hpv_count = count_immunizations("CVX:137", "CVX:165")
if age <= 26 and hpv_count < 3:
  → vaccination_gap: "hpv_incomplete"
elif age >= 27 and age <= 45 and hpv_count == 0:
  → vaccination_gap: "hpv_sdm_discussion"
```

### 9.4 Pneumococcal

**Source:** ACIP 2022 (PCV15/PCV20 updated recommendation)

| Age | Recommendation |
|---|---|
| ≥ 65 | PCV15 + PPSV23 OR PCV20 alone (1 dose) |
| < 65 with high-risk conditions | 1 dose PCV20 or PCV15 + PPSV23 |

**FHIR Signal:** `Immunization` CVX `133` (PPSV23), `152` (PCV13), `215` (PCV15), `216` (PCV20)

```
pneumo_vaccinated = any_immunization_exists("CVX:133", "CVX:152", "CVX:215", "CVX:216")
if age >= 65 and not pneumo_vaccinated:
  → vaccination_gap: "pneumococcal_not_done", priority_color: "orange"
```

### 9.5 Zoster (Shingles)

**Source:** ACIP 2017 (RZV/Shingrix recommendation)

| Age | Recommendation |
|---|---|
| ≥ 50 | RZV (Shingrix) 2-dose series (0, 2–6 months) — preferred over ZVL |

**FHIR Signal:** `Immunization` CVX `187` (RZV/Shingrix)

```
if age >= 50:
  shingrix_count = count_immunizations("CVX:187")
  if shingrix_count < 2:
    → vaccination_gap: "shingrix_incomplete_or_not_started"
```

---

## Section 10 — Smoking & Lung Health

**Source:** USPSTF *Final Recommendation: Lung Cancer Screening*, March 2021
**Also:** CDC *Tobacco Use Guidelines*

### 10.1 Lung Cancer Screening (LDCT) Eligibility

| Criterion | Threshold |
|---|---|
| Age | 50 – 80 years |
| Pack-years | ≥ 20 |
| Smoking status | Current smoker OR quit within past 15 years |

> USPSTF 2021 changed from previous: age 55–80, ≥ 30 pack-years.

**Pack-year calculation:**
```
pack_years = (cigarettes_per_day / 20) × years_smoked
```

**Signal Processing Rules:**
```
pack_years = get_observation_value("LOINC:8663-7")
smoking_coded = get_observation_coded("LOINC:72166-2")

is_current = smoking_coded.code == "449868002"  # SNOMED current smoker
is_former = smoking_coded.code == "8517006"     # SNOMED ex-smoker
years_since_quit = compute_years_since_quit(smoking_history)

lung_ct_threshold_met = (
  50 <= age <= 80
  and pack_years >= 20
  and (is_current or (is_former and years_since_quit <= 15))
)

→ signal: "lung_ct_threshold_met": lung_ct_threshold_met
```

### 10.2 Smoking Cessation

```
if is_current and pack_years > 0:
  → add_on: "smoking_cessation_counseling"
  → risk_flag: "active_smoker"
```

---

## Section 11 — Occupational & Lifestyle Signals

### 11.1 Alcohol Use (AUDIT-C)

**Source:** NIAAA *Helping Patients Who Drink Too Much*, 2005; AUDIT-C (LOINC `74013-4`)

| AUDIT-C Score | Interpretation | Sex Threshold |
|---|---|---|
| 0 – 2 (women) / 0 – 3 (men) | Negative screen | — |
| ≥ 3 (women) | Positive screen — at-risk drinking | — |
| ≥ 4 (men) | Positive screen — at-risk drinking | — |
| ≥ 10 (either) | Likely alcohol dependence | — |

**NIAAA Low-Risk Drinking Limits:**
- Men: ≤ 4 drinks per day AND ≤ 14 per week
- Women: ≤ 3 drinks per day AND ≤ 7 per week

**Signal Processing Rules:**
```
audit_c = get_observation_value("LOINC:74013-4")
threshold = 3 if gender == "female" else 4

if audit_c >= 10:
  → abnormal_trigger: "alcohol_dependence_possible"
  → add_on: "fibroscan_indicated", add_on: "addiction_counseling_referral"
elif audit_c >= threshold:
  → risk_flag: "at_risk_alcohol_use"
  → add_on: "fibroscan_indicated" (if alt > uln_alt)
  → add_on: "alcohol_counseling"
```

### 11.2 Occupational Risk Signals

**Source:** WHO *Global Plan of Action on Workers' Health*, 2008; clinical practice standards

| Occupational Tag | Signal | Suggested Add-On |
|---|---|---|
| `office_syndrome` | Prolonged computer work, sedentary ≥ 8h/day | MSK assessment, ergonomic referral, vision check |
| `chemical_exposure` | Factory / industrial chemical exposure | Pulmonary function test (PFT), liver function |
| `night_shift` | Rotating or permanent night shift ≥ 3 nights/week | Metabolic risk (DM, HTN), sleep assessment |

**FHIR Signal:** `QuestionnaireResponse` (occupational risk question)

**Signal Processing Rules:**
```
occ_tags = get_questionnaire_coded("occupational_risk")

if "office_syndrome" in occ_tags:
  → risk_flag: "office_syndrome"
  → add_on: "msk_assessment", add_on: "vision_check_annual"
if "chemical_exposure" in occ_tags:
  → risk_flag: "occupational_chemical_exposure"
  → add_on: "pulmonary_function_test", add_on: "liver_function_panel"
if "night_shift" in occ_tags:
  → risk_flag: "night_shift_worker"
  → escalate dm_risk, htn_risk by 1 level
  → add_on: "sleep_assessment"
```

### 11.3 Physical Inactivity

**Source:** WHO *Global Recommendations on Physical Activity for Health*, 2020

| Level | Threshold | Signal |
|---|---|---|
| Sufficient | ≥ 150 min/week moderate OR ≥ 75 min/week vigorous | — |
| Insufficient | < 150 min/week moderate | `risk_flag: "sedentary"` |

```
exercise_days = get_questionnaire_value("exercise_days_per_week")
if exercise_days <= 1:
  → risk_flag: "physically_inactive"
  → add_on: "exercise_counseling"
```

---

## Section 12 — Echocardiogram Periodic Screening

**Source:** ADA *Standards of Medical Care in Diabetes*, 2024 (cardiovascular surveillance); Clinical practice guidelines for HTN cardiac evaluation

> There is no USPSTF population-wide recommendation for routine echocardiogram screening. The `echo_gap` signal is a **clinical practice indicator** — it fires when a patient with an established indication (DM or active HTN) has not had an echocardiogram within the recommended surveillance interval, or when the Echo has never been performed.

| Indication | Population | Recommended Interval |
|---|---|---|
| DM + cardiovascular risk | DM comorbidity + age > 35 + ≥1 CV risk factor | Every 3–5 years (or when symptoms change) |
| Active HTN (Stage 1 or 2) | HTN comorbidity confirmed | Every 3–5 years (baseline + surveillance) |
| Intermediate ASCVD risk | Age ≥ 50 + ASCVD 7.5–19.9% | Clinical discretion |

**FHIR Signal:** `Procedure` CPT `93306` / `93307` + `Procedure.performedDateTime`

**Signal Processing Rules:**
```
echo_indicated = any([
  comorbidity_tag includes "DM" and age > 35,
  comorbidity_tag includes "HTN",
  age >= 50 and ascvd_risk >= 7.5
])

if echo_indicated:
  echo_last = get_last_procedure_date("CPT:93306", "CPT:93307")
  interval_months = 60  # 5-year standard; shorten to 36 for high-risk HTN
  if echo_last is null:
    → screening_gap: "echo_gap", priority_color: "Yellow"
  elif days_since(echo_last) > interval_months * 30:
    → screening_gap: "echo_gap", priority_color: "Yellow"
```

> **Note on ECG:** ECG is included in Diamond-tier Navavej packages and is not modeled as a standalone add-on signal. No `ecg_gap` signal is produced by the Recommendation Engine.

---

## Section 13 — Sleep Apnea Screening

**Source:** AASM (American Academy of Sleep Medicine) *Clinical Practice Guideline for Diagnostic Testing for Adult Obstructive Sleep Apnea*, 2017

> The `sleep_apnea_screen_result` signal is populated from a **QuestionnaireResponse** (not a lab or procedure). It fires when structured screening indicates high risk for obstructive sleep apnea (OSA), enabling the Recommendation Engine to trigger the Full Sleep Test (PSG) add-on.

### 13.1 STOP-BANG Screening Criteria

| Criterion | Score |
|---|---|
| **S**noring (audible at closed door) | 1 |
| **T**ired / sleepy during daytime | 1 |
| **O**bserved apnea (witnessed cessation) | 1 |
| **P**ressure (hypertension diagnosed or treated) | 1 |
| **B**MI > 35 (global) / > 30 (Asian-adjusted) | 1 |
| **A**ge > 50 | 1 |
| **N**eck circumference > 40 cm | 1 |
| **G**ender = male | 1 |

| STOP-BANG Score | OSA Risk | Signal |
|---|---|---|
| 0 – 2 | Low | No signal |
| 3 – 4 | Intermediate | `sleep_apnea_screen_result: "intermediate"` |
| 5 – 8 | High | `sleep_apnea_screen_result: "high"` |

**FHIR Signal:** `QuestionnaireResponse` (STOP-BANG instrument); BMI `Observation` LOINC `39156-5`; BP `Observation` LOINC `85354-9`

### 13.2 Signal Processing Rules

```
bmi_stopbang_threshold = 30 if ethnicity == "asian" else 35

# Structured clinical fallback (when STOP-BANG not completed)
high_risk_osa = any([
  bmi >= bmi_stopbang_threshold and bp_category in ["Stage1_HTN", "Stage2_HTN"],
  occupational_tag includes "night_shift" and bmi >= 23,
  comorbidity_tag includes "HTN" and bmi >= bmi_stopbang_threshold
])

if stopbang_score >= 5 or high_risk_osa:
  → signal: "sleep_apnea_screen_result: high"
  → add_on: "sleep_apnea_psg"
elif stopbang_score >= 3:
  → signal: "sleep_apnea_screen_result: intermediate"
  → add_on_consideration: "sleep_apnea_psg" (Yellow priority)
```

> **Maps to Navavej:** Full Sleep Test — 1 Night PSG (฿10,900) · Sleep Apnea Testing with CPAP Trial (฿12,500)

---

## Appendix — Consolidated Signal Processing Rules Summary

This table maps every clinical signal flag to its source guideline for traceability.

| Signal Flag / Trigger | Condition | Source Guideline | Year |
|---|---|---|---|
| `prediabetes_confirmed` | FBS 100–125 or HbA1c 5.7–6.4% | ADA Standards | 2024 |
| `diabetes_confirmation_required` | FBS ≥ 126 | ADA Standards | 2024 |
| `diabetes_confirmed` | HbA1c ≥ 6.5% | ADA Standards | 2024 |
| `high_ldl` | LDL ≥ 160 mg/dL | ACC/AHA Cholesterol | 2018 |
| `severe_hypercholesterolemia` | LDL ≥ 190 mg/dL | ACC/AHA Cholesterol | 2018 |
| `low_hdl` | HDL < 40 (M) / < 50 (F) | ACC/AHA Cholesterol | 2018 |
| `high_triglycerides` | TG ≥ 200 mg/dL | ACC/AHA Cholesterol | 2018 |
| `liver_enzyme_elevation_significant` | ALT > 3× ULN | AASLD NAFLD | 2023 |
| `ckd_rapid_progression` | eGFR slope < −5/year | KDIGO CKD | 2022 |
| `bp_category: Stage1_HTN` | SBP 130–139 OR DBP 80–89 | ACC/AHA BP | 2017 |
| `bp_category: Stage2_HTN` | SBP ≥ 140 OR DBP ≥ 90 | ACC/AHA BP | 2017 |
| `hypertensive_crisis` | SBP > 180 OR DBP > 120 | ACC/AHA BP | 2017 |
| `bmi_overweight_asian` | BMI ≥ 23 (Asian) / ≥ 25 (global) | WHO / Asia-Pacific | 2000 |
| `bmi_obese_asian` | BMI ≥ 27.5 (Asian) / ≥ 30 (global) | WHO / Asia-Pacific | 2000 |
| `lung_ct_threshold_met` | Age 50–80 + ≥20 pack-yrs + current/quit ≤15yr | USPSTF Lung | 2021 |
| `screening_gap: mammogram` | Age 40–74 female, > 24mo since last | USPSTF Breast | 2024 |
| `screening_gap: cervical_cancer_screen` | Age 21–65 female, > 36 or 60mo since last | USPSTF Cervical | 2018 |
| `screening_gap: colonoscopy` | Age 45–85, > 10yr (or 5yr if FHx) since last | USPSTF Colorectal | 2021 |
| `dexa_screening_gap` | Female ≥ 65, overdue | USPSTF Osteoporosis | 2018 |
| `vaccination_gap: influenza_overdue` | > 14mo since last flu vaccine | CDC ACIP | 2024 |
| `vaccination_gap: hepatitis_b_not_started` | 0 Hep B doses | CDC ACIP | 2022 |
| `vaccination_gap: hpv_incomplete` | Age ≤ 26, < 3 doses | CDC ACIP | 2023 |
| `vaccination_gap: pneumococcal_not_done` | Age ≥ 65, no pneumococcal vaccine | CDC ACIP | 2022 |
| `vaccination_gap: shingrix_incomplete` | Age ≥ 50, < 2 RZV doses | CDC ACIP | 2017 |
| `fibroscan_indicated` | AUDIT-C positive + elevated ALT, OR TG ≥ 200, OR BMI ≥ 23/25 + elevated ALT | AASLD | 2023 |
| `ascvd_risk_intermediate` | ASCVD 10-yr risk 7.5–19.9% | ACC/AHA Pooled Cohort | 2013/2018 |
| `ascvd_high` | ASCVD 10-yr risk ≥ 10% (also covered by `ascvd_risk_intermediate` ≥ 7.5%) | ACC/AHA Pooled Cohort | 2013/2018 |
| `ascvd_very_high` | ASCVD 10-yr risk ≥ 20% | ACC/AHA Pooled Cohort | 2013/2018 |
| `at_risk_alcohol_use` | AUDIT-C ≥ 3 (F) / ≥ 4 (M) | NIAAA / AUDIT-C | 2005 |
| `uric_acid_hyperuricemia` | Uric acid > 7.0 (M) / > 6.0 (F) mg/dL | ACR Gout | 2020 |
| `office_syndrome` | Questionnaire: prolonged sedentary desk work | WHO Workers' Health | 2008 |
| `night_shift_worker` | Questionnaire: rotating/permanent night shift | WHO Workers' Health | 2008 |
| `echo_gap` | DM comorbidity or active HTN or ASCVD intermediate, > 60mo since last Echo | Clinical practice / ADA 2024 | 2024 |
| `sleep_apnea_screen_result` | STOP-BANG ≥ 3 OR high-risk clinical criteria (BMI + HTN/night-shift) | AASM OSA Guideline | 2017 |
| `hard_constraint: no_contrast_procedures` | eGFR < 30 | KDIGO | 2022 |
| `hard_constraint: EST_contraindicated` | Hypertensive crisis active | AHA/ACC Exercise Testing | 2002 |
| `hard_constraint: exclude_mammogram` | Male patient | Eligibility | — |
| `hard_constraint: exclude_pap_smear` | Male patient or age > 65 (adequate prior Hx) | USPSTF Cervical | 2018 |
| `hard_constraint: exclude_colonoscopy` | Age > 85 | USPSTF Colorectal | 2021 |

---

*End of Clinical Guidelines Reference. Companion documents: `fhir-discovery-report.md`, `signal-store-contract.md`*
