# FHIR R4 Discovery Report
## Smart Health Checkup Recommendation Dashboard — Data Engineering Order

**Version:** 1.0
**Date:** 2026-03-12
**Audience:** Data Engineering Team
**Purpose:** Formal data order — defines what FHIR R4 resources and fields must be extracted, transformed, and loaded into the Signal Store to support the AI Recommendation Platform.

---

## 1. Executive Summary

FHIR R4 (Fast Healthcare Interoperability Resources, Release 4) is the HL7 international standard for health data exchange and the target interoperability format for the client's HIS migration. A FHIR R4 datastore organizes patient data into typed **Resources** — discrete, versioned records (Patient, Observation, Condition, Procedure, etc.) — each identified by a canonical URL and coded using standardized terminologies (LOINC for labs and vitals, SNOMED CT for clinical findings, ICD-10 for diagnoses, CPT/SNOMED for procedures, CVX for vaccines).

This report inventories the 13 FHIR R4 resources relevant to preventive care and health checkup recommendation, maps each required health signal to its corresponding FHIR resource and field path, documents verified LOINC codes, and identifies gaps where FHIR R4 does not natively cover required signals. The Data Engineering team should use this document as the authoritative extraction and transformation specification.

The Recommendation Platform's MCP Server will query a pre-computed **Signal Store** — not raw FHIR endpoints — so the DE team's responsibility is to extract, compute derived values (trends, velocities, overdue scores), and persist them in the Signal Store schema defined in the companion `signal-store-contract.md` document.

---

## 2. FHIR Resource Inventory

| # | Resource | Purpose in This System | Key Fields | Coding System |
|---|---|---|---|---|
| 1 | **Patient** | Demographics, eligibility gate | `id`, `gender`, `birthDate`, `identifier[]` | — |
| 2 | **Observation** | Lab results, vitals, lifestyle flags | `status`, `code`, `effectiveDateTime`, `valueQuantity`, `component[]`, `interpretation[]`, `referenceRange[]` | LOINC, SNOMED CT |
| 3 | **Condition** | Diagnoses, active comorbidities | `clinicalStatus`, `verificationStatus`, `code`, `onsetDateTime`, `recordedDate`, `subject` | SNOMED CT, ICD-10 |
| 4 | **Procedure** | Past screenings, surgeries performed | `status`, `code`, `performedDateTime`, `subject` | CPT, SNOMED CT |
| 5 | **DiagnosticReport** | Lab panels, imaging reports | `status`, `code`, `effectiveDateTime`, `result[]` (refs to Observation), `conclusion` | LOINC |
| 6 | **Immunization** | Vaccination records | `status`, `vaccineCode`, `occurrenceDateTime`, `patient` | CVX, SNOMED CT |
| 7 | **ImmunizationRecommendation** | Recommended future vaccinations | `recommendation[].vaccineCode`, `recommendation[].forecastStatus`, `recommendation[].dateCriterion[]` | CVX |
| 8 | **FamilyMemberHistory** | First-degree relative conditions | `relationship`, `condition[].code`, `condition[].onsetAge`, `sex` | SNOMED CT, ICD-10 |
| 9 | **AllergyIntolerance** | Drug/substance allergies | `clinicalStatus`, `code`, `reaction[].substance`, `reaction[].severity` | SNOMED CT, RxNorm |
| 10 | **MedicationStatement** | Patient-reported medications | `status`, `medicationCodeableConcept`, `effectivePeriod` | RxNorm, SNOMED CT |
| 11 | **MedicationRequest** | Prescribed medications | `status`, `medicationCodeableConcept`, `authoredOn`, `dosageInstruction[]` | RxNorm |
| 12 | **ServiceRequest** | Ordered tests / referrals | `status`, `code`, `authoredOn`, `reasonCode[]` | CPT, SNOMED CT, LOINC |
| 13 | **Encounter** | Visit history | `status`, `class`, `type[]`, `period`, `serviceType` | SNOMED CT |

### 2.1 Resource Example Payloads

#### Patient
```json
{
  "resourceType": "Patient",
  "id": "patient-001",
  "identifier": [{ "system": "urn:oid:client-his-mrn", "value": "MRN-12345" }],
  "gender": "female",
  "birthDate": "1975-04-22",
  "name": [{ "use": "official", "family": "Smith", "given": ["Jane"] }]
}
```

#### Observation — Lab Result (HbA1c)
```json
{
  "resourceType": "Observation",
  "status": "final",
  "code": {
    "coding": [{ "system": "http://loinc.org", "code": "4548-4", "display": "Hemoglobin A1c/Hemoglobin.total in Blood" }]
  },
  "subject": { "reference": "Patient/patient-001" },
  "effectiveDateTime": "2025-11-10",
  "valueQuantity": { "value": 6.8, "unit": "%", "system": "http://unitsofmeasure.org", "code": "%" },
  "referenceRange": [{ "high": { "value": 5.7 }, "text": "Normal < 5.7%" }],
  "interpretation": [{ "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation", "code": "H", "display": "High" }] }]
}
```

#### Observation — Blood Pressure (panel with components)
```json
{
  "resourceType": "Observation",
  "status": "final",
  "code": {
    "coding": [{ "system": "http://loinc.org", "code": "85354-9", "display": "Blood pressure panel" }]
  },
  "subject": { "reference": "Patient/patient-001" },
  "effectiveDateTime": "2025-11-10",
  "component": [
    {
      "code": { "coding": [{ "system": "http://loinc.org", "code": "8480-6", "display": "Systolic blood pressure" }] },
      "valueQuantity": { "value": 138, "unit": "mmHg", "system": "http://unitsofmeasure.org", "code": "mm[Hg]" }
    },
    {
      "code": { "coding": [{ "system": "http://loinc.org", "code": "8462-4", "display": "Diastolic blood pressure" }] },
      "valueQuantity": { "value": 88, "unit": "mmHg", "system": "http://unitsofmeasure.org", "code": "mm[Hg]" }
    }
  ]
}
```

#### Condition — Comorbidity
```json
{
  "resourceType": "Condition",
  "clinicalStatus": { "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/condition-clinical", "code": "active" }] },
  "verificationStatus": { "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/condition-ver-status", "code": "confirmed" }] },
  "code": {
    "coding": [
      { "system": "http://snomed.info/sct", "code": "44054006", "display": "Diabetes mellitus type 2" },
      { "system": "http://hl7.org/fhir/sid/icd-10", "code": "E11", "display": "Type 2 diabetes mellitus" }
    ]
  },
  "subject": { "reference": "Patient/patient-001" },
  "onsetDateTime": "2021-03-15",
  "recordedDate": "2021-03-15"
}
```

#### Procedure — Screening
```json
{
  "resourceType": "Procedure",
  "status": "completed",
  "code": {
    "coding": [
      { "system": "http://www.ama-assn.org/go/cpt", "code": "77067", "display": "Screening mammography, bilateral" }
    ]
  },
  "subject": { "reference": "Patient/patient-001" },
  "performedDateTime": "2023-09-14"
}
```

#### FamilyMemberHistory
```json
{
  "resourceType": "FamilyMemberHistory",
  "status": "completed",
  "patient": { "reference": "Patient/patient-001" },
  "relationship": {
    "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/v3-RoleCode", "code": "MTH", "display": "Mother" }]
  },
  "sex": { "coding": [{ "system": "http://hl7.org/fhir/administrative-gender", "code": "female" }] },
  "condition": [
    {
      "code": {
        "coding": [
          { "system": "http://snomed.info/sct", "code": "254837009", "display": "Malignant neoplasm of breast" }
        ]
      },
      "onsetAge": { "value": 52, "unit": "years", "system": "http://unitsofmeasure.org", "code": "a" }
    }
  ]
}
```

#### Immunization
```json
{
  "resourceType": "Immunization",
  "status": "completed",
  "vaccineCode": {
    "coding": [{ "system": "http://hl7.org/fhir/sid/cvx", "code": "141", "display": "Influenza, seasonal, injectable" }]
  },
  "patient": { "reference": "Patient/patient-001" },
  "occurrenceDateTime": "2024-10-05"
}
```

---

## 3. Signal Mapping

Maps every health checkup signal required by the Recommendation Platform to its FHIR source.

| Health Signal | FHIR Resource | FHIR Path | Coding System | Code(s) |
|---|---|---|---|---|
| **Patient gender** | Patient | `Patient.gender` | HL7 AdministrativeGender | `male` / `female` / `other` |
| **Patient date of birth / age** | Patient | `Patient.birthDate` | — | — |
| **BMI (current)** | Observation | `Observation.valueQuantity.value` | LOINC | `39156-5` |
| **Body weight** | Observation | `Observation.valueQuantity.value` | LOINC | `29463-7` |
| **Body height** | Observation | `Observation.valueQuantity.value` | LOINC | `8302-2` |
| **BP systolic** | Observation (panel) | `Observation.component[code=8480-6].valueQuantity.value` | LOINC | `8480-6` |
| **BP diastolic** | Observation (panel) | `Observation.component[code=8462-4].valueQuantity.value` | LOINC | `8462-4` |
| **Fasting blood glucose (FBS)** | Observation | `Observation.valueQuantity.value` | LOINC | `1558-6`, `76629-5` |
| **HbA1c** | Observation | `Observation.valueQuantity.value` | LOINC | `4548-4` |
| **LDL cholesterol** | Observation | `Observation.valueQuantity.value` | LOINC | `13457-7` (calc), `18262-6` (direct) |
| **HDL cholesterol** | Observation | `Observation.valueQuantity.value` | LOINC | `2085-9` |
| **Total cholesterol** | Observation | `Observation.valueQuantity.value` | LOINC | `2093-3` |
| **Triglycerides** | Observation | `Observation.valueQuantity.value` | LOINC | `2571-8` |
| **ALT (SGPT)** | Observation | `Observation.valueQuantity.value` | LOINC | `1742-6` |
| **AST (SGOT)** | Observation | `Observation.valueQuantity.value` | LOINC | `1920-8` |
| **Creatinine (serum)** | Observation | `Observation.valueQuantity.value` | LOINC | `2160-0` |
| **eGFR** | Observation | `Observation.valueQuantity.value` | LOINC | `62238-1` (CKD-EPI), `69405-9` (MDRD) |
| **Uric acid** | Observation | `Observation.valueQuantity.value` | LOINC | `3084-1` |
| **TSH (thyroid)** | Observation | `Observation.valueQuantity.value` | LOINC | `3016-3` |
| **Smoking status** | Observation | `Observation.valueCodeableConcept` | LOINC + SNOMED | `72166-2` (LOINC); values: SNOMED `449868002` (current), `8517006` (former), `266919005` (never) |
| **Smoking pack-years** | Observation | `Observation.valueQuantity.value` | LOINC | `8663-7` |
| **Alcohol use (AUDIT-C score)** | Observation | `Observation.valueQuantity.value` | LOINC | `74013-4` |
| **Mammogram (last date)** | Procedure | `Procedure.performedDateTime` where `code` = CPT `77067` | CPT | `77067`, `77066` |
| **Pap smear / cervical cytology** | Procedure | `Procedure.performedDateTime` where `code` = CPT `88141`/`88175` | CPT / SNOMED | `88141`, `88175`, SNOMED `171149006` |
| **Colonoscopy (last date)** | Procedure | `Procedure.performedDateTime` where `code` = CPT `45378` | CPT | `45378` |
| **Exercise stress test (EST)** | Procedure | `Procedure.performedDateTime` where `code` = CPT `93015` | CPT | `93015` |
| **Echocardiogram** | Procedure | `Procedure.performedDateTime` where `code` = CPT `93306` | CPT | `93306`, `93307` |
| **Chest X-ray** | Procedure | `Procedure.performedDateTime` where `code` = CPT `71046` | CPT | `71046` |
| **Bone density (DEXA scan)** | Procedure | `Procedure.performedDateTime` where `code` = CPT `77080` | CPT | `77080` |
| **Low-dose CT (lung cancer screen)** | Procedure | `Procedure.performedDateTime` where `code` = CPT `71250` | CPT | `71250` |
| **Influenza vaccination** | Immunization | `Immunization.occurrenceDateTime` where `vaccineCode` = CVX `141`/`158` | CVX | `141`, `158` |
| **Hepatitis B vaccination** | Immunization | `Immunization.occurrenceDateTime` where `vaccineCode` = CVX `08` | CVX | `08` |
| **HPV vaccination** | Immunization | `Immunization.occurrenceDateTime` where `vaccineCode` = CVX `137`/`165` | CVX | `137`, `165` |
| **Pneumococcal vaccination** | Immunization | `Immunization.occurrenceDateTime` where `vaccineCode` = CVX `133`/`152` | CVX | `133`, `152` |
| **Diabetes mellitus (comorbidity)** | Condition | `Condition.code` | SNOMED / ICD-10 | SNOMED `44054006`, ICD-10 `E11` |
| **Hypertension (comorbidity)** | Condition | `Condition.code` | SNOMED / ICD-10 | SNOMED `38341003`, ICD-10 `I10` |
| **CKD (comorbidity)** | Condition | `Condition.code` | SNOMED / ICD-10 | SNOMED `709044004`, ICD-10 `N18` |
| **Dyslipidemia (comorbidity)** | Condition | `Condition.code` | SNOMED / ICD-10 | SNOMED `370992007`, ICD-10 `E78` |
| **Family Hx — breast cancer** | FamilyMemberHistory | `FamilyMemberHistory.condition[].code` | SNOMED / ICD-10 | SNOMED `254837009`, ICD-10 `C50` |
| **Family Hx — colon cancer** | FamilyMemberHistory | `FamilyMemberHistory.condition[].code` | SNOMED / ICD-10 | SNOMED `363406005`, ICD-10 `C18` |
| **Family Hx — prostate cancer** | FamilyMemberHistory | `FamilyMemberHistory.condition[].code` | SNOMED / ICD-10 | SNOMED `399068003`, ICD-10 `C61` |
| **Family Hx — premature CAD** | FamilyMemberHistory | `FamilyMemberHistory.condition[].code` + `onsetAge` | SNOMED / ICD-10 | SNOMED `53741008`, ICD-10 `I25`; onset < 55 (male) / < 65 (female) |
| **Statin therapy (active)** | MedicationStatement / MedicationRequest | `medicationCodeableConcept` | RxNorm | RxNorm drug class: `C10AA` |
| **Antihypertensive therapy** | MedicationStatement / MedicationRequest | `medicationCodeableConcept` | RxNorm | RxNorm drug class: `C02`, `C03`, `C07`, `C08`, `C09` |

> **Note:** For trend analysis (BMI trend, lab velocity, eGFR slope), the DE pipeline must retrieve multiple historical Observation records per LOINC code, sorted by `effectiveDateTime`, and compute derived values (slope, velocity, direction) before storing them in the Signal Store.

---

## 4. Key LOINC Codes Reference

All codes verified against the LOINC database (loinc.org).

| Lab / Vital | LOINC Code | Display Name | Unit (UCUM) |
|---|---|---|---|
| Fasting blood glucose (serum) | `1558-6` | Fasting glucose [Mass/volume] in Serum or Plasma | mg/dL |
| Fasting blood glucose (plasma, preferred) | `76629-5` | Fasting glucose [Moles/volume] in Plasma | mmol/L |
| HbA1c (%) | `4548-4` | Hemoglobin A1c/Hemoglobin.total in Blood | % |
| HbA1c (mmol/mol) | `17856-6` | Hemoglobin A1c/Hemoglobin.total in Blood by IFCC protocol | mmol/mol |
| LDL cholesterol (calculated) | `13457-7` | Cholesterol in LDL [Mass/volume] in Serum or Plasma by calculation | mg/dL |
| LDL cholesterol (direct) | `18262-6` | Cholesterol in LDL [Mass/volume] in Serum or Plasma by Direct assay | mg/dL |
| HDL cholesterol | `2085-9` | Cholesterol in HDL [Mass/volume] in Serum or Plasma | mg/dL |
| Total cholesterol | `2093-3` | Cholesterol [Mass/volume] in Serum or Plasma | mg/dL |
| Triglycerides | `2571-8` | Triglyceride [Mass/volume] in Serum or Plasma | mg/dL |
| ALT / SGPT | `1742-6` | Alanine aminotransferase [Enzymatic activity/volume] in Serum or Plasma | U/L |
| AST / SGOT | `1920-8` | Aspartate aminotransferase [Enzymatic activity/volume] in Serum or Plasma | U/L |
| Creatinine (serum) | `2160-0` | Creatinine [Mass/volume] in Serum or Plasma | mg/dL |
| eGFR (CKD-EPI) | `62238-1` | Glomerular filtration rate/1.73 sq M.predicted [Volume Rate/Area] in Serum, Plasma or Blood by Creatinine-based formula (CKD-EPI) | mL/min/{1.73_m2} |
| eGFR (MDRD) | `69405-9` | Glomerular filtration rate/1.73 sq M.predicted [Volume Rate/Area] in Serum or Plasma by Creatinine-based formula (MDRD) | mL/min/{1.73_m2} |
| Uric acid | `3084-1` | Urate [Mass/volume] in Serum or Plasma | mg/dL |
| TSH | `3016-3` | Thyrotropin [Units/volume] in Serum or Plasma | mIU/L |
| PSA (total) | `2857-1` | Prostate specific Ag [Mass/volume] in Serum or Plasma | ng/mL |
| BP systolic | `8480-6` | Systolic blood pressure | mmHg |
| BP diastolic | `8462-4` | Diastolic blood pressure | mmHg |
| BP panel | `85354-9` | Blood pressure panel with all children optional | — |
| BMI | `39156-5` | Body mass index (BMI) [Ratio] | kg/m2 |
| Body weight | `29463-7` | Body weight | kg |
| Body height | `8302-2` | Body height | cm |
| Smoking status | `72166-2` | Tobacco smoking status | coded |
| Smoking pack-years | `8663-7` | Cigarette pack-years [#] Reported | {pack-years} |
| AUDIT-C (alcohol) | `74013-4` | Alcohol Use Disorders Identification Test - Consumption [AUDIT-C] | {score} |
| Waist circumference | `8280-0` | Waist Circumference at umbilicus by Tape measure | cm |

---

## 5. Gaps & Non-Standard Extensions Required

The following signals required by the Recommendation Platform are **not natively or fully representable** in standard FHIR R4 resources. Each gap requires a mitigation strategy documented below.

| Signal | Gap | Mitigation |
|---|---|---|
| **Reproductive history** (menarche age, menopause age, parity, hormonal contraception years) | No dedicated FHIR resource. Partially captured via Condition + Observation, but not structured. | Use `Observation` with custom LOINC codes (LOINC `8655-3` for menarche, `8979-7` for parity) + `QuestionnaireResponse` for items without LOINC. |
| **Occupational risk** (office syndrome, chemical exposure, night shift) | Not a standard FHIR resource. | `Observation` with SNOMED `224362002` (type of work) or `QuestionnaireResponse`. May require custom extension `Observation.extension[occupational-risk-tag]`. |
| **Alcohol pack-equivalent / alcohol risk level** | AUDIT-C covers score, but full AUDIT and units/week require structured questionnaire. | `QuestionnaireResponse` referencing AUDIT instrument (LOINC `75626-2` for full AUDIT). |
| **Symptom / chief complaint tags** (palpitations, fatigue, etc.) | Condition captures diagnoses, not presenting symptoms. | `Observation` (`72166-2` symptom) or `QuestionnaireResponse` at encounter time. |
| **Computed risk scores** (ASCVD 10-year, Framingham, FRAX) | FHIR has no standard resource for clinical risk scores. | Computed by DE pipeline from raw labs/demographics; stored as `Observation` with LOINC `79423-0` (ASCVD risk) or custom extension. |
| **Physical activity level** | No standard FHIR resource. | `Observation` with LOINC `68516-4` (days/week vigorous activity) + `QuestionnaireResponse`. |
| **Dietary habits** | Not in FHIR R4 core. | `QuestionnaireResponse` only. Not required for Phase 1 POC. |
| **Liver fibrosis / FibroScan result** | Non-standard imaging result. | `Observation` with LOINC `47538-0` (liver stiffness by ultrasound elastography). |

### 5.1 Recommended FHIR Profiles

The DE team should implement these FHIR profiles to standardize the extraction:

- **US Core R4** — baseline profile for Patient, Observation (lab, vitals), Condition, Procedure, DiagnosticReport, Immunization, MedicationRequest
- **FHIR Questionnaire / QuestionnaireResponse** — for reproductive history, occupational risk, behavioral signals not covered by Observation LOINC codes
- **FHIR Observation (Social History)** — for smoking, alcohol, occupational exposure using the `http://terminology.hl7.org/CodeSystem/observation-category` code `social-history`

---

## 6. Data Pipeline Implications

This section describes what the DE team must implement to produce the Signal Store from raw FHIR data.

### 6.1 Extraction Queries (FHIR Search API)

The following FHIR search queries extract the raw data needed per patient:

```
# Demographics
GET /Patient?identifier=<MRN>

# All lab observations (last 5 years)
GET /Observation?patient=<id>&category=laboratory&date=ge2021-01-01&_sort=-date

# Vitals (last 5 years)
GET /Observation?patient=<id>&category=vital-signs&date=ge2021-01-01&_sort=-date

# Social history (smoking, alcohol)
GET /Observation?patient=<id>&category=social-history

# Active conditions
GET /Condition?patient=<id>&clinical-status=active&verification-status=confirmed

# Procedures (all time — for screening gap calculation)
GET /Procedure?patient=<id>&status=completed&_sort=-performed

# Immunizations
GET /Immunization?patient=<id>&status=completed&_sort=-occurrence

# Family history
GET /FamilyMemberHistory?patient=<id>&status=completed

# Active medications
GET /MedicationStatement?patient=<id>&status=active
GET /MedicationRequest?patient=<id>&status=active
```

### 6.2 Derived Computations Required from DE

The Signal Store requires pre-computed derived values. The DE pipeline must compute:

| Derived Signal | Source Fields | Computation |
|---|---|---|
| **BMI trend direction** | Observation `39156-5`, ≥3 data points | Linear regression slope; classify: `increasing` (>0.2 kg/m²/yr), `decreasing` (<−0.2), `stable` |
| **BMI slope (kg/m²/year)** | Same as above | Annualized slope from least-squares regression |
| **Lab velocity per key lab** | Each LOINC code, ≥3 data points, sorted by date | (Latest − Earliest) / Years between; store as `{value}/year` |
| **BP JNC 8 category** | Latest systolic + diastolic values | `Normal` (SBP<120 AND DBP<80), `Elevated` (SBP 120–129), `Stage1` (SBP 130–139 OR DBP 80–89), `Stage2` (SBP≥140 OR DBP≥90) |
| **eGFR slope** | Observation `62238-1`, ≥3 data points | Annualized slope; flag if > −5 mL/min/1.73m²/year |
| **Screening overdue score per item** | Latest Procedure date per CPT code + recommended interval | `overdue_days = today − (last_date + interval_days)`; negative = not yet due |
| **Vaccination overdue flag** | Latest Immunization date per CVX code + recommended schedule | Boolean; true if overdue per standard schedule |
| **Smoking pack-year threshold** | Observation `8663-7` value + age | `lung_ct_indicated = pack_years >= 20 AND age >= 50` |
| **Family Hx premature CAD flag** | FamilyMemberHistory condition + relationship + onsetAge | True if first-degree male relative onset < 55 OR first-degree female relative onset < 65 |
| **Comorbidity organ risk tags** | Condition codes (DM, HTN, CKD) | DM → `[dm_eye_risk, dm_kidney_risk, dm_heart_risk, dm_foot_risk]`; HTN → `[cv_risk_elevated]`; etc. |

### 6.3 Data Update Frequency

| Signal Type | Recommended Refresh |
|---|---|
| Lab velocities / trends | On new Observation ingested (event-driven) or nightly batch |
| Screening gap scores | Daily (overdue days increment daily) |
| Active conditions / medications | On new Condition / MedicationRequest ingested |
| Vaccination status | On new Immunization ingested |
| Demographics / hard constraints | On Patient update (rarely changes) |
| Family history | On FamilyMemberHistory update |

### 6.4 Data Quality Considerations

- **Missing LOINC codes:** Many HIS systems use local codes. The DE team must implement a LOINC mapping table (local HIS lab code → LOINC code) as part of the FHIR Transform layer.
- **Free-text fields:** `DiagnosticReport.conclusion` and `Condition.code.text` may contain unstructured text. Do not rely on these for signal computation — use only coded fields.
- **Unit normalization:** Labs may arrive in different units (e.g., glucose in mg/dL vs. mmol/L). The pipeline must normalize to the UCUM units listed in Section 4.
- **Duplicate records:** FHIR allows multiple Observation resources for the same LOINC code on the same date (e.g., repeat labs). Deduplicate using `Observation.status = final` and latest `effectiveDateTime`.
- **Minimum data points for trend:** Velocity and slope computations require ≥3 data points over ≥6 months. If insufficient data exists, set `trend_direction = "insufficient_data"` and `velocity = null`.

### 6.5 Patient Token (De-identification)

The Signal Store uses a `patient_token` (not raw MRN or FHIR Patient ID) as the primary key. The DE team must implement the token mapping:

```
patient_token = HMAC-SHA256(patient_fhir_id, secret_salt)
```

The token is one-way — the Recommendation Platform operates entirely on tokens. The mapping table lives in a separate, access-controlled store maintained by the DE team.

---

## 7. Open Questions for Client

The following must be clarified with the client before the DE pipeline can be finalized:

| # | Question | Impact |
|---|---|---|
| 1 | What HIS system is in use (e.g., Cerner, Epic, custom)? | Determines FHIR export capability and local code mapping complexity |
| 2 | Is the FHIR R4 endpoint already live, or is export to FHIR part of DE scope? | Scope boundary |
| 3 | Are reproductive history and occupational risk currently captured in the HIS, and in what format? | Determines if `QuestionnaireResponse` intake is needed at presentation time |
| 4 | What is the historical depth of lab data available? (1 year / 3 years / 5 years / all-time?) | Determines trend computation reliability |
| 5 | Are LOINC codes already mapped in the HIS, or does the client use local codes only? | Determines LOINC mapping effort |
| 6 | Is the client using ICD-10-CM or ICD-10 (international) for diagnoses? | Affects Condition code matching logic |
| 7 | Is consent management in scope for Phase 1? | Determines if `Consent` resource must be checked before data access |

---

*End of FHIR R4 Discovery Report. Companion document: `signal-store-contract.md`*
