# Terms of Reference (TOR)

**Project Name:** Smart Health Checkup Recommendation Dashboard (Modular, Secure, MCP & FHIR Architecture)

**Date:** March 3, 2026

**Version:** 7.0 Final

---

## 1. Principle and Rationale

To elevate health check services toward the "Personalized Medicine" approach, reduce inaccuracies or errors in selecting programs and increase the opportunity to identify health risks that may otherwise be overlooked (Screening Gap). This project therefore focuses on developing an Intelligent Dashboard driven by Artificial Intelligence (AI) technology and international data standards (FHIR).

The system will function to systematically analyze the health history of service recipients in order to recommend health check programs that are accurate, safe, and suitable for each individual, while the architecture is designed to be flexible so that the underlying technologies can be continuously adapted or upgraded to support future development.

---

## 2. Objectives

1. To develop a system that recommends health check programs with accuracy in accordance with medical standards (Medical Logic & AI)
2. To establish standardized data infrastructure (FHIR) and a flexible architecture (Pluggable AI) that supports future changes
3. To enhance the security and protection of personal data in compliance with PDPA and HIPAA standards, while strengthening confidence in the organization's data management

---

## 3. Functional Scope

### 3.1 Data Integration and Management

The system must retrieve data from the Hospital Information System (HIS) and convert it into the FHIR standard, covering:

#### Medical Record Data

- Patient Information
- Diagnosis
- CCHPI
- Physical Examination
- Medicine
- Vaccine
- Surgical History
- Observation Record
- Lab
- X-Ray

#### Physical & Biomarker Features

This group of data represents hard data used to assess the risk of Non-Communicable Diseases (NCDs), particularly metabolic syndromes, through in-depth and trend-based analysis. The evaluation does not rely solely on current values but also assesses the long-term dynamics of change. Key Feature examples include:

- **BMI Trend:** Not limited to the current BMI value but evaluates the direction of change, such as continuous increase or decrease, or abnormal variation that may reflect future metabolic risk
- **Blood Pressure Category:** Blood pressure levels are classified according to JNC 8 criteria (Normal, Elevated, Stage 1, Stage 2) rather than relying solely on numerical values, ensuring that risk assessment aligns with standard clinical practice guidelines
- **Lab Value Velocity (rate of change of laboratory values):** This is a critical indicator for the AI system, evaluating the "speed of change" in Lab values rather than relying on a single measurement
  - *Example:* A patient has FBS values over three consecutive years = 85 → 90 → 98 mg/dL. Although all values remain within the normal range, the upward trend is clear. The system should therefore trigger additional HbA1c testing or recommend behavioral adjustments such as reducing sugar consumption at an early stage
- **eGFR Slope:** Evaluates the annual rate of decline in kidney function. If eGFR decreases by more than 5 ml/min/1.73m² per year, it is considered a rapid decline in kidney function, and the system must trigger an alert for prompt further evaluation

#### Genetic & Historical Health Data

This group is used to trigger cancer screening and genetic disease screening. Examples of such data include:

- **First-Degree Relative History:** Medical history of father/mother/siblings/direct family lineage
  - Specific Tags: CA Breast, CA Colon, CA Prostate, Premature CAD (premature coronary artery disease)
- **Personal Disease Comorbidity:** Underlying diseases that affect other organs
  - Logic: DM (diabetes mellitus) → risk to Eye (Retina), Kidney (Microalbumin), Heart, Foot
- **Reproductive History (for women):**
  - Age at menarche / age at menopause / number of children / use of hormonal contraception (affects the risk of breast and ovarian cancer)

#### Behavioral & Environmental Features

This data group is often captured through questionnaires but is highly important for upselling specialized examinations.

- **Smoking Pack-Years:** (number of packs per day × number of years smoked)
  - Threshold: If the value reaches the threshold → recommend Low Dose CT Chest (lung cancer screening)
- **Alcohol Unit/Week:** Alcohol consumption volume
  - Threshold: If heavy drinking → recommend Ultrasound Upper Abdomen / Fibro Scan (cirrhosis)
- **Occupational Risk:**
  - Prolonged computer work → Office Syndrome (X-ray Cervical/Lumbar)
  - Factory/chemical work → Toxicology Screening (heavy metal testing)
  - Night shift work / insufficient sleep → Stress Hormone (Cortisol)

#### Screening Gap & Compliance

This group of data applies checklist-based logic to identify "gaps in care" and determine pain points indicating which examinations or preventive measures the service recipient is still lacking. The analysis emphasizes a systematic approach to prioritize recommendations appropriately. Key components include:

- **Last Examination Date (Recency):** Track the most recent examination dates of key screenings such as Mammogram, Pap Smear, Colonoscopy, EST, or Echo in order to evaluate whether the examinations remain within the appropriate interval according to standard guidelines
- **Overdue Score:** Calculated as the "number of overdue days" to determine priority levels, such as displaying red (urgent) or yellow (approaching due date), helping both physicians and service recipients make faster and clearer decisions
- **Vaccination Status:** Evaluate vaccination history such as Influenza, Hepatitis B, HPV, and Pneumococcal Vaccine. This category is considered a "Quick Win" that can significantly enhance preventive care value, but in practice it is often overlooked if no reminder system exists

#### Presenting Symptoms (Chief Complaint)

If the system allows service recipients to indicate "current symptoms of concern," the accuracy of AI recommendations can improve significantly because recommendations will not rely solely on historical data but will also incorporate current clinical context.

- **Symptom Mapping (linking symptoms to appropriate examinations):**
  - Palpitations → recommend Thyroid Function Test and ECG
  - Chronic back pain → consider Urine Examination (kidney stones diagnosis) and X-ray Spine
  - Unexplained weight loss → consider Tumor Marker and Thyroid Function

#### Other Related Data

- Seasonal factors, etc.

---

### 3.2 Recommendation Engine

The system must operate in hybrid mode (Rule-based + AI) with the following core Logic:

#### 1. Main Program Selection

Select the primary program according to the level of risk:

| Risk Level | Package |
|------------|---------|
| Low | Standard Package |
| Moderate | Advanced Package |
| High | Premium/Personalized Package |

#### 2. Screening Gap Detection

Detect missing screenings based on criteria such as age, gender, occupation, etc.

- *Example:* Female over 40 missing Mammogram, male over 50 missing Colonoscopy

#### 3. Abnormal Result Trigger

Recommend follow-up examinations for previously abnormal lab values

- *Example:* Fatty Liver → Recommend LFT + Fibro Scan

---

### 3.3 User Interface - Dashboard

Supports Responsive Web Design:

#### 1. Individual Summary & Recommendation

Summarizes individual data and system-generated recommendations, consisting of:

- **a. Recommended Program:** Health check program suitable for the service recipient
- **b. Add-on List:** Additional examinations that should be considered
- **c. Reasoning:** Logical explanation and supporting data used for the recommendation (Explainable AI)
- **d. Priority Level:** Level of importance displayed with colors (e.g., Red / Yellow / Green)
- **e. Confidence Score:** The system's confidence level in the recommendation (expressed as a percentage or scoring level)

#### 2. Patient High Alert

A section displaying critical information that requires special consideration, including:

- Abnormal values affecting program selection decisions
- Alarming lab values within Alert levels
- Incomplete or missing records (Dead Record / Missing Critical Data)

#### 3. Trend & Timeline

Displays historical health data over the past 3–5 years in the form of graphs and trend lines (Trend Visualization), together with a timeline of significant events such as abnormal values, hospital admission (Admit), or disease diagnosis, to support context-based decision-making.

#### 4. Screening Gap / Overdue List

Clearly displays examinations that are due or overdue, helping increase adherence to health screening guidelines (Compliance Rate) and reduce gaps in care (Screening Gap).

#### 5. User Script (Standard Communication Guide)

The system provides standardized guidance or scripts for communicating with service recipients to ensure explanations remain consistent with hospital standards, increase confidence, reduce communication discrepancies, and enhance the service recipient experience.

---

### 3.4 Access Monitoring Dashboard

For system administrators (Admin/DPO):

#### 3.4.1 Real-time Monitoring

Displays system usage statistics and patient data access in real-time, such as:

- Number of current users (Active Users)
- Number of times patient records are accessed
- History of patient data access

This enables administrators to immediately view overall system usage and detect potential risks.

#### 3.4.2 Anomaly Detection

The system analyzes usage behavior to detect abnormal patterns (Behavioral Anomaly) and report on them, such as:

- Accessing an unusually large number of records within a short period
- Accessing patient data unrelated to the user's responsibilities
- Usage patterns that deviate from the normal behavior of that specific user

#### 3.4.3 Audit Log Search

The system maintains a comprehensive audit trail of data access and allows searching and filtering by:

- Username
- Patient ID
- Date and time range
- Activity performed (View / Edit / Export)

This supports retrospective investigation for internal audit and compliance with legal requirements.

#### 3.4.4 Role and Permission Management

Manage data access rights based on the principles of Least Privilege and Role-based Access Control (RBAC), enabling:

- Permission assignment by job position or department
- Separation of permissions for viewing, editing, and exporting data
- Dynamic adjustment of permissions according to changing user roles

#### 3.4.5 Mapping Tool UI

The system must provide a UI-based tool for managing code mappings (Mapping Table), such as:

- Mapping Lab / Diagnosis / Procedure / Package codes
- Mapping with central data standards (e.g., FHIR Code, Internal Code)
- Allowing authorized staff to edit, add, or review mappings without requiring support from the development team

#### 3.4.6 Master Data Management

Supports the management of core system data (Master Data), such as:

- Health check program lists
- Threshold criteria for alerts
- Priority assignment logic
- Vaccine lists and standard screening items
- Medical rules applied within the recommendation system

---

## 4. System Architecture and Data Standards (Technical Infrastructure)

### 4.1 Data Standard: HL7 FHIR R4

- The system must use the **HL7 FHIR standard** as the Core Data Model
- The system must include a **Terminology Mapping Service** to convert data codes from the Hospital Information System (HIS), or "Local Code", into international standard codes and correctly embed them into FHIR Resources according to the standard structure. The mapping must cover the following key standards:
  - **LOINC** for laboratory test result codes (Observation)
  - **SNOMED CT** for symptoms, diagnoses, and procedures (Condition / Procedure)
  - **ICD-10** for disease classification codes according to the international disease classification system

### 4.2 Middleware: Model Context Protocol (MCP) Server

- Use an **MCP Server** as an intermediary for connectivity between the AI Model and the Data Source
- MCP Tools must be restricted under the **Least Privilege** principle and configured as read-only for data retrieval

### 4.3 Pluggable AI Architecture (Model-Switching Architecture)

- **AI Gateway:** There must be a central Layer responsible for managing the AI Model, and API Keys must not be hard-coded in the source code
- **Configuration-Based Swapping:** The AI Model (e.g., GPT-4 ⇔ Claude 3.5 ⇔ Local Llama) must be replaceable through a config file without modifying the code. The system must also provide "Prompt Template Management" separated for each model
- **Containerization:** All Services (Frontend, Backend, MCP, DB) must run separately on Docker/Microservices to facilitate convenient Plug/Unplug operations

---

## 5. Security & Privacy

### 5.1 Authentication & Authorization

- Use the **SMART on FHIR** standard to define the scope of data access (Resource-level permission)

### 5.2 Data Protection & Encryption

- **Encryption:** Encryption must always be applied during external data transmission
- **Data Masking:** Remove Personally Identifiable Information (PII) or perform pseudo-anonymization before sending data into external AI processes

### 5.3 Comprehensive Audit Logging (PDPA Compliance)

- **Log 5 Dimensions:** Who, When, Where, What, Why
- **Context Logging:** When AI is used, the system must log the "Prompt / Context / Response" used by the AI to retrieve data in order to maintain transparency (Explainability)
- Logs must be immutable and retained in accordance with the legally required retention period

---

## 6. Quality Assurance and SLA

### 6.1 Data Quality & Cleansing

- The system must include an **Automated Unit Conversion Service** for converting laboratory test result units (Lab Result) into a unified standard unit before processing, analysis, or visualization in the dashboard
- The system must include **Outlier Detection** to alert and exclude impossible values from calculations

### 6.2 Medical Validation & Safety

- **Medical Acceptance Test (MAT):** The results must achieve accuracy comparable to experts > 95% (conduct Blind Tests with at least 100 cases and apply the Expert Consensus principle, where the evaluation result is considered the standard when at least 3 out of 5 experts agree)
- **Safety Rule:** Critical conditions that can be implemented as Rule Base within the system must be configurable according to company policy, for example, the Mammogram Package can be sold to women only
- **Safety Fallback:** If the AI malfunctions or provides recommendations that conflict with the Safety Rule, the system must revoke that recommendation

### 6.3 Performance SLA

#### Latency Requirements

| Customer Type | Retrieve Medical History | Process Recommendations | Total |
|---------------|-------------------------|------------------------|-------|
| New customers | < 3 seconds | < 7 seconds | ≤ 10 seconds |
| Existing customers | < 10 seconds | < 20 seconds | ≤ 30 seconds |

#### UI Requirements

- The interface must be non-blocking (no freezing while waiting for results)

---

## 7. Business Intelligence

### Conversion Tracking

Track items recommended by the system:

- **Recommended vs. Ordered:** Log whether the "Recommended Item" suggested by the system was actually ordered. Cross-check with IQVAI Billed
- **Rejection Reason:** If a recommended item is "removed," the system should provide a simple UI for specifying the reason (e.g., patient refusal, recently examined elsewhere) so that the data can be used to retrain the AI to improve its intelligence

### Business Performance Dashboard

Provide an additional summary screen for executives (Executive View):

- **Uplift Revenue:** The total value of additional examinations (Add-on) generated from the system's recommendations
- **Adoption Rate:** Usage statistics by users (which users trust the system or do not trust the system) in order to support improvements in change management within the organization

---

## 8. Deliverables

### 1. Software System

Running Application and complete source code (Frontend, Backend, MCP, AI Gateway) running on a Docker Environment.

### 2. User Dashboard

### 3. Management Dashboard

At least 4 dashboards.

### 4. Architecture & Manuals

- System Architecture Diagram (Modular View)
- FHIR Implementation Guide & Data Dictionary
- Configuration Guide for AI Model Swapping
- User & Admin Manuals

### 5. Reports

- User Training Report
- Medical Acceptance Test (MAT) Report
- Performance Load Test Report