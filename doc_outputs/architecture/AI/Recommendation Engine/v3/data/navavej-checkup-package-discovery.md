# Navavej International Hospital — Health Checkup Package Discovery Report

**Version:** 1.0
**Date:** 2026-03-12
**Purpose:** Catalog of actual health checkup packages and add-on programs offered by Navavej International Hospital, for use in populating the Ruleset Store and add-on item library of the Smart Health Checkup Recommendation Dashboard.

---

## 1. Hospital Overview

| Field | Detail |
|---|---|
| **Full name** | Navavej International Hospital (โรงพยาบาลนวเวช) |
| **Location** | Bueng Kum District, Bangkok (Ramintra area) |
| **Opened** | 2021 |
| **Beds** | 152 |
| **Specialized centers** | 19 |
| **Accreditation** | AACI (American Accreditation Commission International) |
| **Positioning** | Below Samitivej / Bangkok Hospital by ~30% on comparable procedures |
| **Primary focus** | Senior healthcare; serves all age groups |
| **Contact** | Call 1507 / +66 2-483-9999 · Line: @navavej · navavej.com |

---

## 2. Core Annual Checkup Tiers

Navavej sells named annual checkup packages tiered by age and gender. These map onto the TOR's three risk levels as follows:

| TOR Risk Level | TOR Package Name | Navavej Package Name | Target | Promo Price (2026)¹ |
|---|---|---|---|---|
| Low | Standard | Basic (16 items) | Ages 15+, all genders | ฿2,871 |
| Low | Standard | Afternoon (18 items) | Ages 15+, all genders | ฿3,690 |
| Low–Moderate | Standard / Advanced | Gold | Ages 20–35, all genders | ฿5,900 |
| Moderate | Advanced | Platinum — Men | Ages 35+, male | ฿8,700 |
| Moderate | Advanced | Platinum — Women | Ages 35+, female | ฿13,500 |
| High | Premium | Diamond — Men | Ages 40+, male | ฿15,000 |
| High | Premium | Diamond — Women (47 items) | Ages 40+, female | ฿19,000–฿21,990 |
| High | Premium | Diamond Couple | Ages 40+, pair | ฿26,000–฿34,000 |

¹ Prices reflect the 5th Anniversary Wellbeing Expo 2026 promotional rates (valid through March 31, 2026). Standard prices are higher.

> **Architect note:** The TOR defines three tiers (Standard / Advanced / Premium). Navavej's actual product ladder has 4–5 named tiers. When populating the Ruleset Store, `Standard` should resolve to Basic or Gold depending on age; `Advanced` to Platinum; `Premium` to Diamond.

---

## 3. Basic Package — Itemized (16 items, confirmed)

**Source:** Lazada e-voucher listing · HDmall listing
**Target:** Ages 15+, all genders · **Price:** ฿2,871–฿2,900
**Pre-visit requirement:** 8–12 hour fast

| # | Test / Service | Clinical Category |
|---|---|---|
| 1 | Physical examination by physician | General |
| 2 | Vital signs & BMI | General |
| 3 | Complete Blood Count (CBC) | Hematology |
| 4 | Fasting Blood Sugar (FBS) | Metabolic |
| 5 | Total Cholesterol | Lipid |
| 6 | Triglycerides | Lipid |
| 7 | HDL Cholesterol | Lipid |
| 8 | LDL Cholesterol | Lipid |
| 9 | Uric Acid | Metabolic / Gout |
| 10 | Creatinine + eGFR | Kidney |
| 11 | BUN (Blood Urea Nitrogen) | Kidney |
| 12 | SGOT / AST | Liver |
| 13 | SGPT / ALT | Liver |
| 14 | Urinalysis | Kidney / Urinary |
| 15 | Chest X-ray | Imaging |
| 16 | Physician consultation | General |

---

## 4. Diamond Women Package — Itemized (47 items, confirmed)

**Source:** HDmall listing · Rating: 5.0/5 (400 reviews)
**Target:** Ages 40+, female · **Price:** ฿19,000–฿21,990

The 47-item Diamond Women package extends the Basic panel with:

| Category | Additional Tests vs. Basic |
|---|---|
| Hematology | Differential WBC, Platelet count |
| Metabolic | HbA1c, Insulin, HOMA-IR |
| Kidney | Microalbumin/Creatinine ratio |
| Liver | Alkaline Phosphatase (ALP), Total Bilirubin |
| Thyroid | TSH, Free T4 |
| Bone | Calcium, Phosphorus, Vitamin D (25-OH) |
| Cardiac | ECG (12-lead) |
| Cancer markers — women | CA-125 (ovarian), CA 15-3 (breast), CEA, AFP |
| Imaging | Ultrasound whole abdomen, Mammogram or Breast Ultrasound |
| Bone density | DEXA scan (2 areas) |
| Physician | Specialist consultation |

> **Architect note:** Items confirmed on HDmall listing. Exact itemization of all 47 items requires direct confirmation from the hospital; the above represents the known additions over the Basic 16-item panel based on published category descriptions.

---

## 5. Specialized / Add-On Programs Catalog

These standalone programs are the source library for the `add_ons` output field in the Recommendation Engine. Each maps to one or more clinical triggers in the TOR.

### 5.1 Cardiac & Chest

| Program | Price | Key Trigger (TOR §3.1) |
|---|---|---|
| Exercise Stress Test (EST) | ฿2,900 | Overdue EST, hypertension Stage 2, premature CAD family hx |
| Echocardiogram (ECHO) | ฿2,900 | Overdue Echo, cardiac murmur, DM comorbidity (heart risk) |
| Coronary Artery Calcium Scoring (CT-CAC) | ฿3,900 | Premature CAD family hx, high LDL, male 40+ |
| 48-hour Cardiac Patch Monitor (S-Patch EX) | ฿7,742 | Palpitations symptom, arrhythmia history |
| Arrhythmia Screening Program | ฿9,900 | Palpitations symptom, suspected arrhythmia |
| Low-dose CT Chest (PM2.5 / Lung Screening) | ฿3,900 | Smoking pack-years ≥ 20 AND age ≥ 50 |

### 5.2 Diabetes & Endocrine

| Program | Price | Key Trigger (TOR §3.1) |
|---|---|---|
| Diabetes Screening Pro 1 (12 items) | ฿2,134 | FBS velocity trend upward, overweight BMI trend |
| Menopause Screening | ฿7,900 | Women perimenopausal age (late 40s+), hormone-related symptoms |
| Male Hormone Assessment | ฿2,900 | Men 40+, fatigue / mood symptoms |

### 5.3 Gastrointestinal & Liver

| Program | Price | Key Trigger (TOR §3.1) |
|---|---|---|
| Hepatitis A, B, C Screening (5 items) | ฿1,900–฿2,231 | Overdue Hepatitis B vaccination or screening |
| GI / Liver Screening Package | ฿3,500 | Abnormal ALT/AST, alcohol heavy use |
| FibroTouch (Liver Fat / Fibrosis, non-invasive) | ฿1,900 | Fatty liver diagnosis → LFT + FibroScan trigger |
| Endoscopy Package (Upper GI) | ฿9,500 | Overdue colonoscopy equivalent / upper GI complaints |

### 5.4 Internal Medicine

| Program | Price | Key Trigger (TOR §3.1) |
|---|---|---|
| Kidney Disease Screening | ฿2,500 | eGFR slope > −5 mL/min/1.73m²/yr, DM comorbidity (kidney risk), creatinine trend |
| Lung Cancer Screening (Low-dose CT) | ฿3,900–฿5,723 | Smoking pack-years ≥ 20 AND age ≥ 50 |
| Influenza Vaccine (3-strain) | ฿490 | Overdue influenza vaccination |
| Senior Flu Vaccine (60+, high-dose) | ฿2,300 | Overdue influenza vaccination, age ≥ 60 |

### 5.5 Imaging & Cancer Screening

| Program | Price | Key Trigger (TOR §3.1) |
|---|---|---|
| Mammogram | ฿2,850 | Female 40+ overdue Mammogram screening |
| Breast Ultrasound | — | Female < 40 or dense-tissue Mammogram follow-up |
| Pap Smear + HPV DNA | ฿2,300 | Female overdue Cervical Cancer screening |
| Prostate & Bladder Ultrasound | — | Male 50+ overdue PSA / prostate screening |
| Abdominal Ultrasound (full) | ฿2,550 | Fatty liver, alcohol heavy use, abdominal symptoms |
| Abdominal Ultrasound (single region) | ฿1,650 | Targeted organ follow-up |
| Bone Density Scan DEXA (2 areas) | ฿1,150–฿1,450 | Post-menopausal women, low BMI, steroid use |
| Carotid Artery Ultrasound | ฿5,096 | Hypertension Stage 2, premature CAD family hx, age 50+ |
| Multi-Cancer Screening SPOT-MAS | ฿15,900 | Family hx breast / colon / prostate cancer, unexplained weight loss |
| Nasal Endoscopy | ฿1,350 | Chronic sinus symptoms, occupational chemical exposure |
| Sinus CT (low-dose) | ฿3,900 | Recurrent sinusitis, nasal symptoms |
| Spine MRI (cervical or lumbar) | ฿6,500 | Prolonged computer work (office syndrome), chronic back pain |

### 5.6 Women's Health

| Program | Price | Key Trigger (TOR §3.1) |
|---|---|---|
| Cervical Cancer + HPV Screening | ฿2,300 | Female overdue Pap Smear |
| Menopause Screening Pro Premium (19 items) | ฿7,900 | Perimenopausal symptoms, hormonal contraception history |
| Pre-marriage / Family Planning Check | ฿2,500 | Reproductive history intake |
| 4D Ultrasound | ฿3,500 | Obstetric / pregnancy monitoring |

### 5.7 Bone & Joint

| Program | Price | Key Trigger (TOR §3.1) |
|---|---|---|
| Osteoporosis Screening (DEXA) | ฿1,150 | Post-menopausal women, low BMI, steroid history |
| Spine MRI | ฿6,500 | Chronic back pain symptom, office syndrome occupational risk |
| PRP Joint Injection (1 shot) | ฿6,500 | Osteoarthritis, joint pain follow-up |
| PRP-HA Combined Joint Therapy | ฿9,500 | Severe osteoarthritis |

### 5.8 Brain & Nervous System

| Program | Price | Key Trigger (TOR §3.1) |
|---|---|---|
| Full Sleep Test — 1 night PSG | ฿10,900 | Night shift work / insufficient sleep occupational risk, snoring |
| Sleep Apnea Testing with CPAP Trial | ฿12,500 | High BMI + snoring, hypertension + sleep complaints |
| Dementia / Cognitive Decline Screening | ฿13,900 | Age 65+, family hx dementia |
| Chronic Headache Assessment | ฿13,900 | Unexplained chronic headache symptom |

### 5.9 Thyroid

| Program | Price | Key Trigger (TOR §3.1) |
|---|---|---|
| Thyroid Pro 1 (6 items) | ฿2,134 | Palpitations symptom, unexplained weight change |
| Thyroid Pro 2 (7 items) | ฿3,395 | Abnormal TSH on Basic panel, thyroid nodule |

### 5.10 Allergy & Skin

| Program | Price | Key Trigger (TOR §3.1) |
|---|---|---|
| Food Allergy Test (20 items) | ฿2,900 | Patient-reported food intolerance |
| Airborne Allergy Test (20 items) | ฿2,900 | Occupational / environmental exposure risk |
| Combined Allergy Panel (40 items) | ฿3,900 | Comprehensive allergy workup |

### 5.11 Pediatric & Vaccines

| Program | Price | Key Trigger (TOR §3.1) |
|---|---|---|
| Influenza Vaccine | ฿490 | Overdue annual vaccination |
| Dengue Vaccine | ฿2,990 | Overdue dengue vaccination (ages 4+) |
| HPV Vaccine | ฿6,990 | Overdue HPV vaccination (ages 9–45) |
| Pneumococcal Vaccine | — | Overdue Pneumococcal vaccination, age 65+ |
| Hepatitis B Vaccine | — | Non-immune to Hepatitis B (screening-triggered) |
| Play & Learn Health Check | ฿1,590 | Pediatric annual checkup (ages 5–14) |

### 5.12 Occupational / Pre-employment

| Program | Price | Key Trigger (TOR §3.1) |
|---|---|---|
| Medical Certificate — 5 Diseases (13 items) | ฿2,277 | Pre-employment, childcare / elderly care workers |
| Toxicology Screening (Heavy Metal) | — | Factory / chemical occupational risk |
| Cortisol / Stress Hormone | — | Night shift / insufficient sleep occupational risk |

---

## 6. Recommendation Engine Mapping Notes

### 6.1 Tier Resolution Table

When the Clinical Signal Engine produces a risk level, the Ruleset Store should resolve it to a specific Navavej package name:

| Risk Level | Age Range | Gender | Resolved Package |
|---|---|---|---|
| Low | 15–19 | Any | Basic (16 items) |
| Low | 20–35 | Any | Gold |
| Low | 36+ | Any | Gold (or Basic as minimum) |
| Moderate | 35+ | Male | Platinum — Men |
| Moderate | 35+ | Female | Platinum — Women |
| High | 40+ | Male | Diamond — Men |
| High | 40+ | Female | Diamond — Women |
| High | < 40 | Any | Premium/Personalized (custom) |

### 6.2 Add-On Trigger Cross-Reference

| TOR Trigger Type | Relevant Add-On Programs |
|---|---|
| **Screening Gap — Mammogram overdue** | Mammogram (฿2,850) |
| **Screening Gap — Pap Smear overdue** | Cervical Cancer + HPV Screening (฿2,300) |
| **Screening Gap — Colonoscopy overdue** | Endoscopy Package (฿9,500) |
| **Screening Gap — EST overdue** | Exercise Stress Test (฿2,900) |
| **Screening Gap — Echo overdue** | Echocardiogram (฿2,900) |
| **Screening Gap — DEXA overdue** | Bone Density Scan (฿1,150–฿1,450) |
| **Screening Gap — Vaccinations overdue** | Influenza / Hepatitis B / HPV / Pneumococcal (฿490–฿6,990) |
| **Abnormal — Fatty Liver** | FibroTouch (฿1,900) + GI/Liver Screening (฿3,500) |
| **Abnormal — eGFR slope rapid decline** | Kidney Disease Screening (฿2,500) |
| **Abnormal — FBS/HbA1c trend** | Diabetes Screening Pro 1 (฿2,134) |
| **Abnormal — TSH / thyroid** | Thyroid Pro 1 (฿2,134) or Thyroid Pro 2 (฿3,395) |
| **Abnormal — ALT/AST** | GI/Liver Screening (฿3,500) |
| **Family Hx — CA Breast / CA Colon / CA Prostate** | Multi-Cancer SPOT-MAS (฿15,900) |
| **Family Hx — Premature CAD** | CT-CAC (฿3,900) + Carotid Ultrasound (฿5,096) |
| **Behavioral — Smoking pack-years ≥ 20 + age ≥ 50** | Low-dose CT Chest / Lung Screening (฿3,900–฿5,723) |
| **Behavioral — Heavy alcohol use** | FibroTouch (฿1,900) + Abdominal Ultrasound (฿2,550) |
| **Behavioral — Night shift / insufficient sleep** | Full Sleep Test PSG (฿10,900) |
| **Behavioral — Prolonged computer work** | Spine MRI (฿6,500) |
| **Behavioral — Factory / chemical exposure** | Toxicology Screening (Heavy Metal) |
| **Symptom — Palpitations** | Thyroid Pro 1 (฿2,134) + ECG (included in Diamond; standalone: ฿2,900 Arrhythmia program) |
| **Symptom — Chronic back pain** | Spine MRI (฿6,500) + Urinalysis (in Basic) |
| **Symptom — Unexplained weight loss** | Multi-Cancer SPOT-MAS (฿15,900) + Thyroid Pro 2 (฿3,395) |
| **Comorbidity — DM → Eye risk** | Retinal Examination (฿2,590) |
| **Comorbidity — DM → Kidney risk** | Kidney Disease Screening (฿2,500) |
| **Comorbidity — DM → Heart risk** | ECG / Echocardiogram (฿2,900) |
| **Reproductive Hx — Hormonal contraception / family hx** | CA-125, CA 15-3 (in Diamond Women or standalone) |

### 6.3 Gender / Age Hard Constraints

These must be enforced by the Safety Rule Validator regardless of AI output:

| Rule | Constraint |
|---|---|
| Mammogram | Female patients only |
| Pap Smear + HPV Screening | Female patients only |
| CA-125, CA 15-3 (ovarian/breast markers) | Female patients only |
| Menopause Screening | Female patients only |
| Prostate screening (PSA / Prostate Ultrasound) | Male patients only |
| Male Hormone Assessment | Male patients only |
| Platinum — Women / Diamond — Women | Female patients only |
| Platinum — Men / Diamond — Men | Male patients only |
| Dengue Vaccine | Ages 4+ only |
| HPV Vaccine | Ages 9–45 only |
| Senior Flu Vaccine (high-dose) | Ages 60+ only |
| Low-dose CT Lung Cancer Screening | Smoking pack-years ≥ 20 AND age ≥ 50 |

---

## 7. Open Questions for Client

The following items require direct confirmation from Navavej before the Ruleset Store can be fully populated:

| # | Question | Relevance |
|---|---|---|
| 1 | What is the exact itemized test list for Gold, Platinum (M/F), and Diamond Men packages? | Tier resolution and duplicate-test deduplication logic |
| 2 | Is there a colonoscopy standalone program, or is the Endoscopy Package the correct equivalent? | Screening Gap — Colonoscopy trigger |
| 3 | Are heavy metal / toxicology tests offered as standalone programs? What are the prices and product codes? | Occupational risk triggers |
| 4 | What are the internal product codes (package IDs) used in the HIS / billing system? | Ruleset Store `item` field values, IQVAI Billed cross-reference |
| 5 | Which packages include a built-in ECG, and which require it as a paid add-on? | Avoiding duplicate charge on Diamond packages |
| 6 | Is the Cortisol / Stress Hormone test an existing standalone program with a product code? | Night-shift occupational trigger |
| 7 | Does the hospital have a Colonoscopy program (not just upper endoscopy)? | Male 50+ screening gap trigger |
| 8 | Are prices in the Ruleset Store updated automatically from a PMS feed, or manually? | Admin panel Master Data Management scope |
| 9 | What are the normal (non-promotional) prices? The Expo prices expire March 31, 2026. | Correct price display in dashboard after Expo ends |
| 10 | Is there a PSA (Prostate-Specific Antigen) standalone test or does it only appear within a package? | Male 50+ prostate screening trigger |

---

## 8. Data Sources

| Source | URL | Date Accessed |
|---|---|---|
| Navavej Official Website — Packages | https://navavej.com/package | 2026-03-12 |
| Navavej 5th Anniversary Wellbeing Expo 2026 — Positioning Magazine | https://positioningmag.com/1563063 | 2026-03-12 |
| Navavej 5th Anniversary Expo — plewseengern.com | https://plewseengern.com/plewseengern/176663 | 2026-03-12 |
| Navavej on HDmall — All Packages Listing | https://hdmall.co.th/health-checkup/โรงพยาบาลนวเวช | 2026-03-12 |
| Diamond Women 47-item Package — HDmall | https://hdmall.co.th/health-checkup/health-general-basic-47-items-premium-check-up-program-diamond-women-aged-40-years-over-navavej-international-hospital | 2026-03-12 |
| Basic Checkup 16 items — Lazada e-Voucher | https://www.lazada.co.th/products/e-voucher-basic-checkup-navavej-international-hospital-i5473320709.html | 2026-03-12 |
| Afternoon Checkup 18 items — HDmall | https://hdmall.co.th/health-checkup/health-check-afternoon-18-items-aged-15-years-over-navavej-international-hospital | 2026-03-12 |
| Full Sleep Test — HDmall | https://hdmall.co.th/health-checkup/health-check-full-sleep-test-1-night-officials-watch-all-night-hdmall-plus-navavej-international-hospital | 2026-03-12 |
| Hepatitis A, B, C Program — HDmall | https://hdmall.co.th/health-checkup/check-hepatitis-a-b-and-c-viruses-hepatitis-abc-program-5-items-navavej-international-hospital | 2026-03-12 |
| Navavej 2nd Anniversary Promotion — ThaiPR.net | https://www.thaipr.net/health/3312325 | 2026-03-12 |
| SaleHere — Navavej Checkup Promotion (2022 pricing reference) | https://salehere.co.th/navavej-international-hospital/promotions/health-check-start-7900-baht-march-2022 | 2026-03-12 |
