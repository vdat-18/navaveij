# Smart Health Checkup Recommendation Dashboard - POC Document

**Project:** Smart Health Checkup Recommendation Dashboard

**Purpose of conducting the POC:** To assess the vendor's capability in developing an AI system that recommends health check programs in accordance with medical standards (Medical Logic & AI), has a flexible architecture that supports international standards (FHIR), and ensures Security and Privacy in compliance with PDPA / HIPAA standards.

---

## Part 1: Topics the Vendor Must Present (POC Deliverables)

For the POC presentation, the Vendor must prepare and present the following 4 main topics:

### 1. Process Flow Architecture (System Architecture and Data Flow)

- Explain the workflow of the Hybrid Recommendation Engine (Rule-based combined with AI)
- Show the structure for retrieving data from the Hospital Information System (HIS) through Middleware such as the Model Context Protocol (MCP) Server
- It must be demonstrated that MCP Tools are restricted under Least Privilege and operate in read-only mode for data retrieval before sending data to AI

### 2. Mockup Screens (User Interface Design - Minimum 3 Screens)

#### Screen 1: Individual Summary & Recommendation
Must display the recommended health check program, together with the AI's "Logical Reasoning (Explainable AI)" and "Confidence Score" clearly.

#### Screen 2: Trend & Timeline
Must display graphs showing health data trends over the past 3–5 years, together with a timeline of significant events (e.g., abnormal values or disease diagnosis).

#### Screen 3: Access Monitoring Dashboard
A screen for system administrators (Admin/DPO) focusing on alerts for abnormal usage behavior (Anomaly Detection).

### 3. Architecture & Data Standard Strategy

- Present a **Pluggable AI architecture** that can demonstrably switch AI models (e.g., from GPT-4 to Claude 3.5 or Local Llama) through a configuration file or setup screen without modifying the source code
- Explain the **Terminology Mapping strategy** from hospital codes (Local Code) to the HL7 FHIR R4 standard using:
  - **LOINC** (for Lab)
  - **SNOMED CT** (for Condition / Procedure)

### 4. Security, Privacy & Audit Strategy

- Explain the approach for using the **SMART on FHIR** standard to define the scope of data access
- Present the process for performing **Data Masking** or pseudo-anonymization to remove Personally Identifiable Information (PII) before sending data into external AI processes
- Show the format for maintaining comprehensive **Audit Logging** that records all 5 dimensions (Who, When, Where, What, Why), including logging of the AI Prompt / Context, with logs that must be immutable

---

## Part 2: POC Evaluation Criteria

The evaluation of the POC presentation will be based on the following topics, with a total score of 100%.

| Evaluation Area | Details Looked for by the Evaluation Committee (Key Focus) | Score Weight |
|-----------------|------------------------------------------------------------|--------------|
| **1. Recommendation Logic and System Architecture/Flow** | • Clarity of the hybrid mechanism (Rule-based + AI) in selecting the primary program and additional examination items<br>• Understanding of the use of the MCP Server as an intermediary for retrieving data in read-only mode and enforcing Least Privilege access control | **35%** |
| **2. Data Standards and Architectural Flexibility** | • Practical feasibility of the Pluggable AI architecture that allows model switching through a config file or setup screen without modifying the code<br>• Reliability of the terminology mapping strategy to the HL7 FHIR R4 standard (LOINC, SNOMED CT) | **25%** |
| **3. UX/UI Design and Explainability** | • The Individual Summary screen clearly presents Reasoning (Explainable AI) and the Confidence Score in a logical and easily understandable manner<br>• Effective presentation of historical health data trends and a practical anomaly alert window that can be used in real scenarios | **20%** |
| **4. Security, Privacy, and Auditing Capabilities** | • Robustness of the Data Masking / pseudo-anonymization process before sending data to AI<br>• Design of a 5-dimension Audit Log system, including immutable storage of Prompt / Context in accordance with PDPA standards<br>• Application of SMART on FHIR for permission management | **20%** |
| **Total** | | **100%** |