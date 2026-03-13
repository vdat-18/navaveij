# Health Checkup Recommendation System — Clinical Rule Review
### For Medical Expert Review and Feedback

**Date:** March 13, 2026
**Prepared by:** Smart Health Checkup Recommendation Dashboard Project Team
**For:** Clinical Expert Review — Physician Feedback

---

## How to Use This Document

This document describes the clinical decision rules that the AI recommendation system will use to suggest health checkup programs and additional examinations for patients.

**Your role:** Please read through the rules and mark any that you feel are clinically inappropriate, incomplete, or requiring adjustment. Specific questions are highlighted in **bold** throughout the document. A consolidated list of all questions appears at the end (Part 4).

**What this system does:** When a patient visits the health checkup center, the system reviews their medical history, lab results, family history, lifestyle, and symptoms, then recommends:
1. Which annual health checkup package is most appropriate (Standard / Advanced / Premium)
2. Which additional examinations should be added based on their individual clinical profile

**The system does not replace physician judgment.** All recommendations are reviewed and approved by a SalesAdmin / physician before any program is offered to the patient.

---

## Part 1: Program Tier Assignment Rules

The system assigns each patient to one of three program tiers based on their clinical profile. The rules are evaluated in order — the first rule that applies determines the tier.

---

### Rule 1 — Premium Program (Highest Priority)

**When ANY ONE of the following applies, the patient is assigned the Premium (Diamond) program:**

| # | Condition | Clinical Basis |
|---|---|---|
| 1a | Confirmed kidney disease with rapid deterioration (eGFR declining by more than 5 mL/min/1.73m² per year) | KDIGO 2022 — requires urgent specialist evaluation |
| 1b | Very high 10-year cardiovascular risk (ASCVD score ≥ 20%) | ACC/AHA 2018 — high-intensity statin + comprehensive cardiac workup required |
| 1c | Active hypertensive crisis (systolic BP > 180 OR diastolic BP > 120) | ACC/AHA 2017 — emergency evaluation; standard procedures contraindicated |
| 1d | Confirmed diabetes (HbA1c ≥ 6.5%) AND at least one organ complication screening is overdue (eye, kidney, foot, or cardiac) | ADA 2024 — multi-organ surveillance required |
| 1e | Significantly elevated liver enzymes (ALT > 3× upper normal limit) combined with a liver disease risk factor (obesity with elevated ALT, at-risk alcohol use, or triglycerides ≥ 200 mg/dL) | AASLD 2023 — comprehensive hepatic evaluation required |

> **Expert Question 1:** Are these the right conditions to automatically place a patient in the Premium tier? Is any condition here too aggressive (should it be Advanced instead)? Is any important condition missing?

---

### Rule 2 — Premium Program (Multiple Risk Factors)

**When 5 or more of the following conditions are simultaneously present, the patient is assigned the Premium (Diamond) program:**

| Signal | Description |
|---|---|
| Pre-diabetes confirmed | Fasting glucose 100–125 mg/dL or HbA1c 5.7–6.4% |
| Active hypertension | Stage 1 or Stage 2 hypertension (confirmed diagnosis) |
| Active dyslipidemia | Confirmed dyslipidemia diagnosis on record |
| Obese (Asian-adjusted) | BMI ≥ 27.5 kg/m² |
| Intermediate cardiovascular risk | ASCVD 10-year risk 7.5–19.9% |
| Stage 2 hypertension | SBP ≥ 140 or DBP ≥ 90 mmHg |
| Family history of premature heart disease | First-degree relative with CAD onset before age 55 (male) or 65 (female) |
| At-risk alcohol use | AUDIT-C score ≥ 4 (men) or ≥ 3 (women) |
| Liver disease risk indicator | Meets criteria for FibroScan evaluation |
| Lung cancer screening eligible | Age 50–80, ≥ 20 pack-years, currently smoking or quit within 15 years |
| Confirmed chronic kidney disease | Any CKD stage |
| Hyperuricemia | Uric acid above sex-specific threshold |

**Current threshold: 5 out of 12 conditions.**

> **Expert Question 2 (Critical):** The reference patient — a 54-year-old male with pre-diabetes, Stage 1 hypertension, dyslipidemia, intermediate ASCVD risk, family history of premature CAD, at-risk alcohol use, lung cancer screening eligibility, and hyperuricemia — meets **8 of 12** conditions above, placing him in the Premium tier under this rule. Clinically, do you feel this patient warrants the Premium (Diamond) package, or should he be in the Advanced (Platinum) package? Your answer will determine whether we adjust the threshold (currently 5) or remove certain conditions from this list.

---

### Rule 3 — Advanced Program

**When ANY ONE of the following applies (and Rule 1 and Rule 2 have not triggered), the patient is assigned the Advanced (Platinum) program:**

| Condition | Clinical Basis |
|---|---|
| Pre-diabetes confirmed (fasting glucose 100–125 mg/dL or HbA1c 5.7–6.4%) | ADA 2024 |
| Suspected diabetes requiring confirmatory testing (fasting glucose ≥ 126 mg/dL, pending repeat) | ADA 2024 |
| Intermediate cardiovascular risk (ASCVD 10-year risk 7.5–19.9%) | ACC/AHA 2018 |
| Active hypertension (confirmed diagnosis, any stage) | ACC/AHA 2017 |
| Lung cancer screening eligible (age 50–80, ≥ 20 pack-years, current or recent smoker) | USPSTF 2021 |
| Confirmed chronic kidney disease (any stage) | KDIGO 2022 |
| Obese by Asian-adjusted BMI (≥ 27.5 kg/m²) | WHO Asia-Pacific 2000 |

**OR when 2 or more of the following lower-severity conditions co-occur:**

| Condition |
|---|
| Overweight by Asian-adjusted BMI (≥ 23.0 kg/m²) |
| Low HDL cholesterol (< 40 mg/dL men / < 50 mg/dL women) |
| High triglycerides (≥ 200 mg/dL) |
| High LDL cholesterol (≥ 160 mg/dL) |
| Stage 1 hypertension (SBP 130–139 or DBP 80–89 mmHg, not yet a confirmed diagnosis) |
| Blood pressure worsening trend over serial readings |
| Family history of premature coronary artery disease |
| At-risk alcohol use (AUDIT-C positive) |
| Prolonged sedentary desk work (office syndrome) |
| Night shift work (rotating or permanent) |
| Hyperuricemia |
| Confirmed dyslipidemia |
| Liver disease risk indicator |

> **Expert Question 3:** Are the single-signal Advanced qualifiers appropriate? Should any be Standard (too low risk for Advanced)? Should any be Premium (higher than Advanced)?

---

### Rule 4 — Standard Program (Default)

**When none of the above rules apply, the patient is assigned the Standard (Gold) program.** This represents a routine annual health screening for a person with no active elevated risk signals.

---

### Package Names

When the system assigns a tier, the actual Navavej package offered is:

| Tier | Male patient | Female patient |
|---|---|---|
| Standard | Gold | Gold |
| Advanced | Platinum — Men | Platinum — Women |
| Premium | Diamond — Men | Diamond — Women |

> **Expert Question 4:** Do these package-to-tier mappings make clinical sense? Are there any patient profiles where a different package would be more appropriate (e.g., a 35-year-old with pre-diabetes — should they receive Platinum, or is Gold + targeted add-ons sufficient)?

---

## Part 2: Additional Examination (Add-On) Recommendations

For each patient, the system also recommends individual examinations to add to their base package. Each add-on is triggered by specific clinical findings in the patient's record.

**Urgency levels used:**
- 🔴 **Red** — Urgent: significant gap or high-severity finding; should be completed at this visit or within 1 month
- 🟠 **Orange** — Timely: recommended within this visit or this quarter
- 🟡 **Yellow** — Recommended: schedule within 6 months; shared decision appropriate
- 🟢 **Green** — Optional / Discussion: low urgency; raise with patient for consideration

---

### 2.1 Cancer Screening

---

**Colonoscopy** 🔴 Red
*For: Men and women, age 45–85*

**Recommended when:** Colorectal cancer screening is overdue (interval: every 10 years for average risk; every 5 years if first-degree relative had colorectal cancer).

**Clinical basis:** USPSTF 2021 — Grade A (ages 45–75); shared decision for ages 76–85.

> **Expert Question 5:** USPSTF 2021 lowered the recommended start age from 50 to 45. Do you agree that 45 is the right age to begin recommending colonoscopy in the Thai context?

---

**Low-Dose CT Chest (Lung Cancer Screening)** 🔴 Red
*For: Men and women, age 50–80*

**Recommended when:** Patient is age 50–80, has a smoking history of ≥ 20 pack-years, and is either currently smoking or quit within the past 15 years, AND annual CT has not been done.

**Clinical basis:** USPSTF 2021 — Grade B.

> **Expert Question 6:** USPSTF 2021 changed the criteria from age 55–80 / ≥ 30 pack-years to age 50–80 / ≥ 20 pack-years. Do you agree with applying these updated thresholds?

---

**Mammogram (Bilateral Screening)** 🔴 Red
*For: Women only, age 40–74*

**Recommended when:** Mammogram screening is overdue. Standard interval: every 2 years (USPSTF 2024). Annual if first-degree family history of breast cancer.

**Clinical basis:** USPSTF 2024 — Grade B (biennial from age 40); ACS 2023 (annual from age 45 as alternative).

> **Expert Question 7:** USPSTF 2024 recommends starting at age 40 (previously 50). ACS recommends annual from 45. Which interval and start age should this system use as the default for Thai patients?

---

**Cervical Cancer Screening (Pap Smear + HPV Co-test)** 🟠 Orange
*For: Women only, age 21–65*

**Recommended when:** Cervical cancer screening is overdue. Interval: every 3 years for Pap smear alone (age 21–29); every 5 years for Pap + HPV co-test (age 30–65).

**Clinical basis:** USPSTF 2018 — Grade A.

---

**Multi-Cancer Screening — SPOT-MAS (Blood Test)** 🟡 Yellow
*For: Men and women, age 40+*

**Recommended when:** Patient has a first-degree family history of colorectal cancer, breast cancer, or prostate cancer.

**Clinical basis:** Clinical practice — emerging cfDNA-based multi-cancer early detection. *Not yet a major guideline recommendation.*

> **Expert Question 8:** SPOT-MAS is not currently endorsed by USPSTF or equivalent major guidelines as a primary screening tool. Is it appropriate to recommend this test based on family history alone? If yes, should any minimum criteria apply (e.g., at least 2 cancer types in family history)?

---

**Bone Density Scan — DEXA** 🟠 Orange
*For: Women only, age 65+*

**Recommended when:** DEXA scan for osteoporosis is overdue.

**Clinical basis:** USPSTF 2018 — Grade B for women ≥ 65.

> **Expert Question 9:** Should men ever receive a DEXA recommendation? USPSTF currently has insufficient evidence for routine male screening, but clinical practice sometimes includes men with risk factors (long-term steroid use, low BMI, osteoporosis family history). Should we add a separate indication for men?

---

### 2.2 Cardiovascular

---

**Exercise Stress Test (EST) — Treadmill ECG** 🟡 Yellow
*For: Men and women, age 30+*

**Recommended when:** EST is overdue for a patient with intermediate or high cardiovascular risk, OR when there are 2+ CV risk factors with diabetes in a patient over 40, OR when the patient reports chest pain or shortness of breath on exertion.

**Safety restriction:** Must NOT be recommended if patient is in hypertensive crisis (systolic > 180 or diastolic > 120) or has active hypoglycemia.

**Urgency escalates to Red** if ASCVD 10-year risk is ≥ 20%.

**Clinical basis:** AHA/ACC 2002 Exercise Testing Guidelines; ADA 2024.

---

**Echocardiogram (ECHO)** 🟡 Yellow
*For: Men and women, age 35+*

**Recommended when:** Patient has confirmed diabetes or active hypertension and cardiac surveillance is indicated.

> **Expert Question 10:** Should the minimum age for ECHO be 35, or should it be determined by the presence of DM/HTN regardless of age?

---

**CT Coronary Artery Calcium Scoring (CAC)** 🟡 Yellow
*For: Men and women, age 40+*

**Recommended when:** Patient has a family history of premature heart disease, intermediate cardiovascular risk, or high LDL cholesterol — situations where the decision to start statin therapy is uncertain.

**Clinical basis:** ACC/AHA Cholesterol Guideline 2018 — CAC as a risk-refinement tool.

> **Expert Question 11:** ACC/AHA positions CAC as a tool to resolve uncertainty in statin initiation for borderline-to-intermediate risk patients. Is it appropriate to recommend CAC for all patients with a family history of premature CAD, or only when lipid management decisions are unclear?

---

**48-Hour Cardiac Patch Monitor** 🟡 Yellow
*For: Men and women, age 18+*

**Recommended when:** Patient reports palpitations, chest pain, or shortness of breath on exertion.

---

**Carotid Artery Ultrasound** 🟡 Yellow (🟠 Orange if high ASCVD risk)
*For: Men and women, age 50+*

**Recommended when:** Patient has a family history of premature heart disease, intermediate or high cardiovascular risk, or Stage 2 hypertension.

**Clinical basis:** ACC/AHA 2018 — carotid IMT as a cardiovascular risk-enhancing factor.

> **Expert Question 12:** Should the minimum age be 50, or lower (e.g., 40) when the indication is first-degree family history of premature CAD?

---

### 2.3 Metabolic & Endocrine

---

**Diabetes Screening Pro (HbA1c, Insulin, HOMA-IR — 12 items)** 🟡 Yellow (🔴 Red if diagnostic confirmation required)
*For: Men and women, age 15+*

**Recommended when:** Pre-diabetes has been confirmed, or diabetes requires confirmatory testing, or patient is obese (Asian-adjusted BMI ≥ 27.5).

**Clinical basis:** ADA Standards of Medical Care 2024.

---

**Thyroid Function Panel — Basic (TSH + Free T4, 6 items)** 🟡 Yellow
*For: Men and women, age 15+*

**Recommended when:** Any thyroid function abnormality detected in a prior result, OR the patient reports palpitations.

---

**Thyroid Function Panel — Extended (TSH, Free T3, Free T4, Anti-TPO, 7 items)** 🟡 Yellow (🟠 Orange if definitive diagnosis)
*For: Men and women, age 15+*

**Recommended when:** TSH is confirmed borderline high, or hypothyroidism/hyperthyroidism is likely based on lab values.

---

**Menopause Screening Pro Premium (Hormonal Assessment, 19 items)** 🟡 Yellow
*For: Women only, age 45–60*

**Recommended when:** Patient's reproductive history questionnaire indicates perimenopausal or menopausal status.

> **Expert Question 13:** If the reproductive history questionnaire has not been completed (missing data), should the system still recommend menopause screening for women aged 45–60 based on age alone? Currently, no questionnaire = no recommendation.

---

**Prostate Cancer (PSA) — Shared Decision-Making Discussion** 🟢 Green (🟡 Yellow if family history)
*For: Men only, age 50–69*

**Recommended when:** Standard age-based PSA discussion, or first-degree family history of prostate cancer.

**Clinical basis:** ACS 2023 / USPSTF 2018 — shared decision-making; not routine universal screening.

> **Expert Question 14:** ACS recommends offering PSA discussion from age 40 for high-risk patients (first-degree family history of prostate cancer, or BRCA2 carrier). Should the age_min be lowered to 40 when the trigger is family history?

---

### 2.4 Liver & Gastrointestinal

---

**FibroTouch — Liver Fibrosis & Fat Assessment** 🟡 Yellow (🔴 Red if ALT > 3× normal)
*For: Men and women, age 18+*

**Recommended when:** Patient meets liver disease risk criteria — Asian-adjusted BMI ≥ 23 with elevated ALT, at-risk alcohol use with elevated ALT, or triglycerides ≥ 200 mg/dL. Also recommended for significantly elevated liver enzymes.

**Clinical basis:** AASLD NAFLD/MASLD Practice Guidance 2023.

---

**Abdominal Ultrasound — Whole Abdomen** 🟡 Yellow
*For: Men and women, age 18+*

**Recommended when:** At-risk alcohol use, liver disease risk indicator, or mildly elevated liver enzymes.

---

**Hepatitis A, B, C Screening (5 items)** 🟡 Yellow (🔴 Red if no Hepatitis B doses received)
*For: Men and women, age 18+*

**Recommended when:** Hepatitis B vaccination series is incomplete, or anti-HBs immunity check is needed.

> **Expert Question 15:** Should Hepatitis C screening (anti-HCV) have a dedicated separate trigger for specific at-risk populations (e.g., patients born 1945–1965, or patients with a history of blood transfusion or injected drug use)? Currently it is included in the 5-item panel but has no dedicated trigger.

---

### 2.5 Kidney

---

**Kidney Disease Screening (Urine ACR, eGFR, Microalbumin)** 🟡 Yellow (🔴 Red if rapid CKD progression)
*For: Men and women, age 18+*

**Recommended when:** Confirmed CKD, rapid CKD progression, confirmed diabetes, or active hypertension.

**Clinical basis:** KDIGO 2022; ADA Standards 2024 — annual urine ACR + eGFR for all patients with DM.

---

### 2.6 Imaging

---

**Retinal Examination — Diabetic Retinopathy** 🟡 Yellow
*For: Men and women, age 18+*

**Recommended when:** Confirmed diabetes with retinopathy screening overdue.

**Clinical basis:** ADA Standards 2024 — annual dilated eye exam at diagnosis, then every 1–2 years if stable.

---

### 2.7 Musculoskeletal & Neurology

---

**Spine MRI — Cervical or Lumbar** 🟢 Green
*For: Men and women, age 18+*

**Recommended when:** Patient works in a prolonged sedentary desk job (office syndrome), or reports chronic back pain.

---

**Full Sleep Test (1-Night PSG) — Sleep Apnea Evaluation** 🟡 Yellow
*For: Men and women, age 18+*

**Recommended when:** Patient is a night shift worker, or is obese (Asian-adjusted BMI ≥ 27.5), or has a positive sleep apnea screening questionnaire result.

> **Expert Question 16:** Is obesity alone (BMI ≥ 27.5 Asian) a sufficient trigger for sleep apnea PSG, or should it require at least one additional indicator (e.g., reported snoring, observed apnea, or hypertension comorbidity)?

---

**Unexplained Weight Loss Workup (Tumor Marker Panel + Thyroid)** 🔴 Red
*For: Men and women, age 18+*

**Recommended when:** Patient reports unexplained weight loss (from symptom questionnaire).

> **Expert Question 17:** Should this be a single bundled add-on (Tumor Markers + Thyroid together), or should these be recommended as two separate items that can be ordered or declined independently?

---

### 2.8 Vaccinations

---

**Influenza Vaccine — Standard (Age 1–59)** 🟠 Orange
**Recommended when:** Annual influenza vaccination is overdue (> ~14 months since last dose).

**Influenza Vaccine — High-Dose / Senior (Age 60+)** 🟠 Orange
**Recommended when:** Annual influenza vaccination is overdue; patient is ≥ 60 years old.

> **Expert Question 18:** CDC ACIP recommends the high-dose/adjuvanted formulation from age ≥ 65, not ≥ 60. Should the cutover be 60 or 65 for this system?

---

**Hepatitis B Vaccine Series** 🔴 Red (if not started) / 🟡 Yellow (if series incomplete)
**Recommended when:** Hepatitis B vaccination series has not been started, or is incomplete.

---

**Pneumococcal Vaccine (PCV20 or PCV15 + PPSV23)** 🟠 Orange
*For: Men and women, age 65+*
**Recommended when:** No pneumococcal vaccine on record.

> **Expert Question 19:** Should patients under 65 with certain high-risk conditions (e.g., CKD, diabetes, or immunosuppression) also receive this recommendation? ACIP does recommend pneumococcal vaccine for high-risk adults < 65.

---

**Shingrix (RZV) — Zoster Vaccine, 2-Dose Series** 🟡 Yellow
*For: Men and women, age 50+*
**Recommended when:** Shingrix vaccination series not started or incomplete.

---

## Part 3: Summary of All Expert Review Questions

| # | Question | Section |
|---|---|---|
| 1 | Are the 5 Premium single-condition triggers appropriate? Too aggressive or too lenient? | Rule 1 |
| 2 | **(Critical)** Reference patient fires 8/12 multi-signal conditions → Premium tier. Is this clinically appropriate, or should he be Advanced? | Rule 2 |
| 3 | Are the single-signal Advanced qualifiers correct? Any that should be Standard or Premium? | Rule 3 |
| 4 | Do the package-to-tier mappings make clinical sense (Gold / Platinum / Diamond per tier)? | Tier–Package Map |
| 5 | Should colonoscopy screening start at age 45 (USPSTF 2021) in the Thai context? | Colonoscopy |
| 6 | Should LDCT lung cancer screening use the updated USPSTF 2021 criteria (age 50, ≥ 20 pack-years)? | Lung LDCT |
| 7 | Mammogram: which interval and start age — USPSTF 2024 (biennial from 40) or ACS 2023 (annual from 45)? | Mammogram |
| 8 | Is SPOT-MAS appropriate to recommend based on family history alone (no major guideline endorsement)? | Multi-Cancer |
| 9 | Should men with risk factors ever receive a DEXA recommendation? | DEXA |
| 10 | Should ECHO age_min be 35, or purely comorbidity-driven (DM/HTN) without age restriction? | Echocardiogram |
| 11 | Is CT-CAC appropriate for all patients with family history of premature CAD, or only when statin decision is unclear? | CT-CAC |
| 12 | Should carotid ultrasound age_min be 50, or 40 for patients with family history of premature CAD? | Carotid Ultrasound |
| 13 | If reproductive history questionnaire is missing, should menopause screening be recommended by age (45–60) alone? | Menopause |
| 14 | Should PSA SDM discussion start at age 40 (not 50) for patients with prostate cancer family history? | PSA |
| 15 | Should HCV screening have a dedicated trigger for at-risk populations, separate from the Hepatitis B trigger? | Hepatitis Screening |
| 16 | Is obesity alone (BMI ≥ 27.5 Asian) sufficient to trigger PSG sleep study, or should additional criteria apply? | Sleep Apnea PSG |
| 17 | Should unexplained weight loss workup be a single bundle or separate Tumor Marker + Thyroid items? | Weight Loss Workup |
| 18 | Should the high-dose influenza vaccine threshold be age 60 (current) or age 65 (ACIP recommendation)? | Senior Flu Vaccine |
| 19 | Should pneumococcal vaccine be recommended for high-risk patients under 65 (CKD, DM, immunosuppression)? | Pneumococcal Vaccine |

---

## Part 4: Physician Feedback

*Please use this section to write your overall comments, corrections, and any additional recommendations not covered above.*

**Overall assessment of the tier assignment rules (Rules 1–4):**

&nbsp;

&nbsp;

&nbsp;

**Overall assessment of the add-on recommendation catalog:**

&nbsp;

&nbsp;

&nbsp;

**Clinical conditions or examinations that should be added but are not currently included:**

&nbsp;

&nbsp;

&nbsp;

**Clinical conditions or examinations that should be removed or modified:**

&nbsp;

&nbsp;

&nbsp;

**Any other comments:**

&nbsp;

&nbsp;

&nbsp;

---

*Thank you for your time and expertise. Your feedback will be used to calibrate the system before the Medical Acceptance Test (100 blind cases, ≥ 95% accuracy target).*
