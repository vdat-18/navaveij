# Page 1

Technical Proposal - Smart Health Checkup Recommendation Dashboard
1. Executive Summary1.1 Introduction1.2 Background Information1.3 To-Be Vision & Core Value Proposition2. Project Scope & Assumptions2.1 Scope of Work (In-Scope Deliverables)2.2 Out of Scope2.3 Key Assumptions & Dependencies3. High-Level System Architecture3.1 Data flow3.2 Conceptual Architecture C4 Context DiagramC4 Container Diagram3.3 Core Modules Overview4. Data Platform & Integration ArchitectureHigh-level Data Platform Architecture4.1 Data Ingestion Strategy (Connecting to Navavej HIS)4.2 Data Pipeline at a Glance4.3 Data Conversion & Health Trend Pre-Computing4.3.1 Clinical Code Mapping (LOINC, SNOMED CT, ICD-10)4.3.2 Health Trend Pre-Computing (Velocity, Gaps, eGFR slope)4.4 Dual-Storage Strategy4.4.1 Core FHIR Database (Immutable Clinical Records)4.4.2 Trending Store Database (AI Analytical Feature Store)5. Data Platform Tech Stack6. Security, Privacy & Data Governance6.1 SMART on FHIR Authorization (Access Control Gatekeeper)6.2 Data Masking & Pseudo-Anonymization Pipelines6.3 Comprehensive Audit Logging7. AI & Recommendation Engine Architecture7.1 High-Level AI Workflow7.2 Model Context Protocol (MCP) Middleware (Secure Context Retrieval)7.3 Hybrid Recommendation Logic (Rule-based Safety + AI Inference)7.4 Central AI Gateway7.4.2 Pluggable LLM Configuration Management7.4.1 Explainable AI (XAI) & Confidence Scoring Generation7.5 AI Tech Stack8. Frontend & Dashboards (User Experience)8.1 Responsive Web Application Architecture (Tech Stack)8.2 Healthcare Provider Dashboard (Summaries, Timelines, Action Items)8.3 DPO / System Admin Access Monitoring Dashboard (Anomaly Detection)9. Deployment & Operational Architecture9.1 Target Environment Strategy (SaaS / Private Cloud)9.2 CI/CD Pipeline & Automation9.3 Observability & Monitoring (Grafana, CloudWatch, OpenTelemetry)9.4 Disaster Recovery (DR) & Backup Plan10. Quality Assurance & Non-Functional Requirements (NFRs)10.1 Performance Metrics & SLAs10.2 Scalability & High Availability Matrix10.3 Medical Validation Strategy (Medical Acceptance Test / Expert Consensus)10.4 Safety "Fallback" Rules11. Cost & Investment Plan11.1 Infrastructure Licensing & Cloud Costs11.2 Implementation & Professional Services
1. Executive Summary
1.1 IntroductionThis technical proposal outlines the design, architecture, and implementation strategy for the Smart Health Checkup RecommendationDashboard at Navavej Hospital. The primary objective is to develop an intelligent, AI-driven platform that systematically analyzes a patientʼshistorical medical data to recommend highly accurate, safe, and personalized health checkup programs. By combining internationalhealthcare data standards (HL7 FHIR R4) with an advanced, pluggable Artificial Intelligence architecture (Model-Switching Architecture), theproposed system will elevate Navavej Hospital's services to a true "Personalized Medicine" approach. The solution inherently prioritizes
This document is conﬁdential and restricted to Vietnam Silicon use only; it cannot be shared with third parties without prior written authorization from
Vietnam Silicon
@Copyright 2025 by Vietnam Silicon.

# Page 2

security and privacy, utilizing strict Data Masking, SMART on FHIR authorization, and the Model Context Protocol (MCP) to ensure fullcompliance with PDPA and HIPAA regulations.
1.2 Background InformationTraditionally, health checkup programs are selected based on generic criteria such as age and gender. However, this generalized approachfrequently leads to "Screening Gaps"—missed opportunities to identify hidden health risks or prioritize critical preventative care. Servicerecipients possess rich, longitudinal medical histories stored within the Navavej Hospital Information System (HIS / IQVIA SaaS),encompassing diagnoses, lab value velocities, biomarker trends (e.g., eGFR slope or BMI), and historical screening data.
To bridge the gap between this wealth of raw data and actionable clinical insights, Navavej requires a system capable of interpretingcomplex medical histories efficiently and securely. This entails moving away from manual, ad-hoc program selection toward a HybridRecommendation Engine (Rule-based combined with AI). The core challenge to realizing this vision is not only generating medicallyaccurate recommendations but also standardizing the legacy data using international clinical code mapping (LOINC, SNOMED CT, ICD-10)and strictly safeguarding patient privacy before any data interacts with external AI models. This proposal presents a modular, highly securetechnical blueprint designed specifically to leapfrog these challenges, while supporting seamless future AI upgrades without core systemdisruptions.
1.3 To-Be Vision & Core Value Proposition
The "To-Be" vision is a fully automated, transparent, and standardized workflow where raw clinical data transforms into highly personalizedpatient care without compromising a single data privacy boundary. The core value propositions of this platform are:
1. Precision and Personalization: The system will evaluate dozens of hard clinical markers (e.g., BMI velocity, JNC 8 blood pressurecategories, genetic histories) to generate customized primary and "Add-On" examination recommendations that successfully close vitalScreening Gaps.2. Explainable AI (XAI) for Trust: Both healthcare providers and service recipients will receive clear, logical reasoning behind every AIrecommendation alongside a Confidence Score, completely eliminating "black-box" medical uncertainty.3. Zero-Trust Security by Design: Applying the SMART on FHIR authorization standard and the strict Least Privilege Model ContextProtocol (MCP) ensures that PII is masked before any inference occurs, and every AI prompt is immutably logged for comprehensiveauditing.4. Future-Proof Pluggable Architecture: Exploring a Model-Switching AI Gateway guarantees Navavej Hospital flexibility. Administratorscan effortlessly transition between frontier AI models (e.g., from GPT-4 to Claude 3.5 or an on-premise Local Llama model) via
This document is conﬁdential and restricted to Vietnam Silicon use only; it cannot be shared with third parties without prior written authorization from
Vietnam Silicon
@Copyright 2025 by Vietnam Silicon.

# Page 3

configuration screens, entirely avoiding vendor lock-in as technology advances.
2. Project Scope & Assumptions
2.1 Scope of Work (In-Scope Deliverables)
The implementation of the Smart Health Checkup Recommendation Dashboard encompasses the complete end-to-end delivery of the data,security, AI, and presentation layers.
2.2 Out of Scope
To ensure strict project boundaries and focus, the following items are excluded from this implementation phase:
Data Integration & Storage Secure data extraction from Navavej HIS (IQVIA SaaS) via CDCsync.Automated processing and terminology mapping into internationalclinical codes (LOINC, SNOMED CT, ICD-10).Setup of the dual-storage architecture: Core FHIR Database &analytical Trending Store DB.
AI Recommendation Engine Development of the Hybrid Recommendation Engine combininghard medical rules with AI logic.Delivery of the AI Gateway supporting pluggable, model-switchingarchitecture.Implementation of the Model Context Protocol (MCP) Server forsecure context retrieval.
Security & Compliance SMART on FHIR authorization server acting as the gateway for allFHIR data.Strict Data Masking protocol within the MCP layer to eliminate PIIleakage to the AI.Implementation of the immutable 5-Dimension Audit Log (Who,When, Where, What, Why).
User Interfaces (Web) Healthcare Provider Dashboard: Screens displaying IndividualSummaries, historical Trend Timelines (3-5 years), Screening Gaps,and Explainable AI reasoning.Admin/DPO Dashboard: Screens for Real-Time Access Monitoringand Behavior Anomaly Detection.
Testing & Deployment Complete system containerization (Docker/Microservices).Medical Acceptance Testing (MAT) to ensure the AI hits the >95% threshold of expert consensus.Performance testing to ensure strict SLA compliance (< 10-secondlatency).
Implementation Layer Deliverables & Included Scope
Legacy HIS Replacement The proposed solution acts as an intelligent add-on. It does notreplace, refactor, or migrate the core functionality of the existingNavavej Hospital Information System (IQVIA).
Bi-Directional EMR Writes The AI operates purely in a read-only state via the MCP server todeduce recommendations. It will not autonomously write back to oralter the core medical records in the HIS.
Out-of-Scope Area Description
This document is conﬁdential and restricted to Vietnam Silicon use only; it cannot be shared with third parties without prior written authorization from
Vietnam Silicon
@Copyright 2025 by Vietnam Silicon.

# Page 4

2.3 Key Assumptions & DependenciesThe successful delivery of this architecture relies on the following baseline assumptions:
3. High-Level System Architecture
3.1 Data flow
3.2 Conceptual Architecture 
C4 Context Diagram
This diagram maps out the high-level interactions between the users, the proposed system, and the external legacy systems.
Financial / Billing AI The AI scope is strictly limited to medical health checkuprecommendations. Predictive models for hospital financial forecastingor billing are excluded.
Physical Hardware Procurement, delivery, or maintenance of physical on-premisehardware servers is excluded (presuming standard cloudinfrastructure usage).
Data Availability The existing Navavej HIS (IQVIA SaaS) supports and permits reliable,near-real-time data synchronization (e.g., CDC or robust APIs)necessary to populate the pipeline.
Medical Ruleset Support Clinical experts at Navavej will provide the definitive "Safety Rules"(e.g., age limits, gender-specific checks) required to train andconstrain the rule-based safety engine.
LLM Infrastructure Commercial LLM API accounts (such as OpenAI/Anthropic) orprovisioned local GPU hardware (if utilizing a localized LLM) will befunded or provided by the hospital.
Dependency Domain Assumption Statement
This document is conﬁdential and restricted to Vietnam Silicon use only; it cannot be shared with third parties without prior written authorization from
Vietnam Silicon
@Copyright 2025 by Vietnam Silicon.

# Page 5

C4 Container Diagram
This diagram zooms inside the system boundary to show the high-level technical architecture, demonstrating how the Pluggable AI, dual-databases, and MCP Middleware interact safely.
mermaid
flowchart TD%% NodesUser([" 🧑‍⚕️  Healthcare Provider<br>[Person]"])Admin([" 🛡  DPO / System Admin<br>[Person]"])
1System[" 🟦  Smart Health Checkup System<br>[Software System]"]23HIS[" 🏢  Navavej HIS (IQVIA)<br>[External System]"]4LLM[" 🧠  External AI Providers<br>[External System]"]56%% Relationships7User -->|Views personalized recommendations| System8Admin -->|Monitors audit logs| System9System -->|Extracts raw medical data| HIS10System -->|Sends masked prompts & receives AI insights| LLM
This document is conﬁdential and restricted to Vietnam Silicon use only; it cannot be shared with third parties without prior written authorization from
Vietnam Silicon
@Copyright 2025 by Vietnam Silicon.

# Page 6

3.3 Core Modules OverviewTo realize the "To-Be" architecture, the system is logically divided into 7 specialized, decoupled microservice modules:
mermaid
1flowchart TD2 %% Actors and External Systems3 Provider([" 🧑‍⚕️  Healthcare Provider"])4 HIS[" 🏢  Navavej HIS (IQVIA)"]5 LLM[" 🧠  External AI Models (e.g., GPT-4 / Claude)"]67 %% System Boundary8 subgraph SystemBoundary [Smart Health Checkup System Boundary]9 direction TB1011 WebApp[" 🖥  Web Dashboard<br>[React / Next.js]"]12 Auth[" 🔑  SMART on FHIR Server<br>[OAuth2 Access Control]"]1314 Pipeline[" ⚙  Data Integration Pipeline<br>[Cleansing,SNOMED Mapping, Pre-computing]"]1516 FHIR[(" 🏥  Core FHIR Database<br>[HL7 R4 Standards]")]17 Trend[(" 📈  Trending Store DB<br>[AI Feature Store]")]1819 RecEngine[" 🧠  Hybrid Recommendation Engine<br>[MedicalSafety Rules + AI Logic]"]20 AIGateway[" 🚪  Central AI Gateway<br>[Model Config & 5-DAudit Logging]"]21 MCP[" 🛡  MCP Middleware<br>[Data Fetcher & Strict PIIMasking]"]22 end2324 %% Relationships25 Provider -->|Uses Dashboard| WebApp26 WebApp -->|Authenticates via| Auth27 WebApp -->|Requests recommendations| RecEngine2829 HIS -->|CDC Sync / Stream raw data| Pipeline30 Pipeline -->|Writes standardized R4 data| FHIR31 Pipeline -->|Writes AI features| Trend3233 Auth -.->|Secures Access to DBs| FHIR3435 RecEngine -->|Initiates AI Workflow| AIGateway36 AIGateway -->|Requests Context via Tools| MCP3738 MCP -->|Authenticates as Client| Auth39 MCP -->|Reads raw facts| FHIR40 MCP -->|Reads analytic trends| Trend4142 AIGateway -->|Sends masked prompt & receives inference| LLM
This document is conﬁdential and restricted to Vietnam Silicon use only; it cannot be shared with third parties without prior written authorization from
Vietnam Silicon
@Copyright 2025 by Vietnam Silicon.

# Page 7

1. Web Dashboard (Frontend UI): A responsive application (e.g., React/Next.js) serving 2 primary user groups. It provides:Sales/Doctors: with the Individual Summary and Trend TimelinesDPO: with an Access Monitoring page for anomaly detection.2. Data Integration Pipeline: A robust ETL engine that captures updates from the Navavej HIS via CDC sync. It handles data cleansing,strict clinical code mapping (LOINC, SNOMED CT, ICD-10), and the pre-computation of complex health trends (e.g., eGFR slope or BMIvelocity).3. Dual-Storage Databases: The data storage layer is deliberately split. The Core FHIR DB maintains immutable, standardized clinicalrecords, while the Trending Store DB acts as a flexible AI Feature Store for pre-computed longitudinal data.4. SMART on FHIR Authorization Server: The centralized OAuth 2.0 gatekeeper. It ensures that every request pulling from the databases—whether requested by a doctor's dashboard or the MCP context fetcher—operates under strict, resource-level scopes.5. Hybrid Recommendation Engine: The orchestrator of the system's clinical logic. It applies deterministic "Safety Rules" (e.g., specificage/gender limits) before and after invoking the AI, ensuring medical safety acts as a fail-safe parachute alongside the statistical AImodel.6. Model Context Protocol (MCP) Middleware: A specialized, Read-Only data fetcher. It serves as the ultimate privacy filter, pulling recordsfrom the FHIR and Trending databases and strictly scrubbing all Personally Identifiable Information (PII) before the context is ever sharedwith the AI.7. AI Gateway & Pluggable Models: A model-agnostic API router that bridges the masked context to frontier LLMs (e.g., GPT-4, Claude 3.5,Local Llama). Crucially, this module is also responsible for executing the immutable 5-Dimension Audit Logging (Who, When, Where,What, Why) for every single AI inference execution.
This document is conﬁdential and restricted to Vietnam Silicon use only; it cannot be shared with third parties without prior written authorization from
Vietnam Silicon
@Copyright 2025 by Vietnam Silicon.

# Page 8

4. Data Platform & Integration Architecture
High-level Data Platform Architecture
Application Layer
Storage & Processing Layer
Ingestion Layer
Navavej Source Systems
Authorization
CDC / Sync
auto-trigger
DatasourceIQVIA/EMR
Connectore.g., webhook, ..
Data preprocessinge.g., classify, validate, clean
Raw Data StoreBRONZE layer
Code mapping rulesLOINC, SNOMED CT, ICD-10Convert to FHIR format
FHIR Data StoreSILVER layer
AggregationTrending Calculation
Aggregated dataGOLD layerTrendingGOLD layer
MCP Server
SMART on FHIR Smart Health AIRecommendation Engine
Smart Health Checkup Application
1flowchart TD2 %% Style Definitions3 classDef boundarySource fill:#e1f5fe,stroke:#01579b,stroke-width:2px;4 classDef boundaryIngest fill:#f3e5f5,stroke:#4a148c,stroke-width:2px;5 classDef boundaryApp fill:#fff3e0,stroke:#e65100,stroke-width:2px;
This document is conﬁdential and restricted to Vietnam Silicon use only; it cannot be shared with third parties without prior written authorization from
Vietnam Silicon
@Copyright 2025 by Vietnam Silicon.

# Page 9

4.1 Data Ingestion Strategy (Connecting to Navavej HIS)To ensure near real-time data synchronization without impacting Navavej's busy hospital operations, we implement a Change Data Capture(CDC) strategy.CDC Extraction: Utilizing enterprise-grade CDC tools (e.g., Debezium or AWS DMS), we stream continuous, row-level modificationsdirectly from the IQVIA Operational Store or the HIS backend via transaction logs (log-based extraction), avoiding heavy queries on theoperational databases.Hybrid Ingestion: The platform also supports Real-Time APIs for immediate checkup requests and secure Batch processing (HL7 / sFTP)for legacy data and bulk un-structured document ingestion.Routing & Integrity: The pipeline intelligently tags and routes data (differentiating new vs. existing patients) with guaranteed exactly-onceor at-least-once message delivery and strict chronological ordering.
6 classDef boundaryData fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px;78 classDef box fill:#ffffff,stroke:#333,stroke-width:1px,rx:0,ry:0;9 classDef db fill:#ffffff,stroke:#333,stroke-width:1.5px,rx:0,ry:0;1011 %% Source System12 subgraph BoundaryDS [Navavej Source Systems]13 DS[Datasource<br/><b>IQVIA/EMR</b>]:::box14 end15 class BoundaryDS boundarySource;1617 %% Ingestion Layer18 subgraph BoundaryIngest [Ingestion Layer]19 WH[Connector<br/>e.g., webhook, ..]:::box20 E[Data preprocessing<br/>e.g., classify, validate, clean]:::box21 WH --> E22 end23 class BoundaryIngest boundaryIngest;2425 %% Storage & Processing Layer26 subgraph BoundaryData [Storage & Processing Layer]27 direction TB28 B[(Raw Data Store<br/><b>BRONZE layer</b>)]:::db29 M[Code mapping rules<br/>LOINC, SNOMED CT, ICD-10<br/>Convert to FHIR format]:::box30 S[(FHIR Data Store<br/><b>SILVER layer</b>)]:::db3132 %% Silver r ẽ  nhánh cân đ ố i sang 2 bên33 subgraph ProcessingNodes [ ]34 direction LR35 AG[Aggregation]:::box36 T[Trending Calculation]:::box37 end38 style ProcessingNodes fill:none,stroke:none3940 G1[(Aggregated data<br/><b>GOLD layer</b>)]:::db41 G2[(Trending<br/><b>GOLD layer</b>)]:::db4243 B --> M44 M --> S45 S --> AG46 S --> T47 AG --> G148 T --> G249 end50 class BoundaryData boundaryData;5152 %% Application Layer53 subgraph BoundaryConsumer [Application Layer]54 direction TB55 MCP[MCP Server]:::box56 SF[SMART on FHIR]:::box57 AI[Smart Health AI<br/>Recommendation Engine]:::box58 APP[Smart Health Checkup Application]:::box5960 MCP <-. Authorization .-> SF6162 MCP --> AI63 AI --> APP64 end65 class BoundaryConsumer boundaryApp;6667 DS ---|CDC / Sync| WH68 E -->|auto-trigger| B6970 G1 --> MCP71 G2 --> MCP
This document is conﬁdential and restricted to Vietnam Silicon use only; it cannot be shared with third parties without prior written authorization from
Vietnam Silicon
@Copyright 2025 by Vietnam Silicon.

# Page 10

4.2 Data Pipeline at a Glance
The Data Pipeline employs a modern Medallion Lakehouse Architecture integrated with Event-Driven processing to transform raw hospitaldata into AI-ready insights securely:
1. Ingestion Layer: Captures raw, unmasked data from Navavej HIS via APIs, Batch, and CDC, landing it directly in the Bronze Layer.
2. Standardization & Masking (Bronze to Silver): A highly secure pipeline intercepts the raw data, applies strict PII Tokenization/DynamicMasking to comply with Thailand PDPA and HIPAA, and reformats the clinical elements into HL7 FHIR R4 standards before storing it in theSilver Layer.3. Curation & Aggregation (Silver to Gold): Automated ETL/ELT workflows transform the standardized FHIR data into pre-aggregatedhealth metrics, time-series trends, and ML features within the Gold Layer, optimized for BI and AI consumption.
Multi-Tenant SaaS Data PlatformNavavej Existing Data Lake 4. Consumption, AI & BI3. Storage & Data Lake2. Ingestion & Security1. Data Sources
Mask PII, Map & Standardize Aggregate & CurateUnmasked Data
Unmasked DataNavavej HISReal-time APIs
HL7 / sFTP Batch Bronze LayerRaw Unmasked DataSilver LayerFHIR v5 HL7 StandardizedGold LayerAggregated / Features
BI Dashboard
AI Smart Health Checkup R dimermaid
1flowchart LR2%% Existing Infrastructure3 subgraph NavavejLake [Navavej Existing Data Lake]4 subgraph Sources [1. Data Sources]5 HIS1[Navavej HIS]6 end7 end8%% Multi-Tenant Platform9subgraph VNSPlatform [Multi-Tenant SaaS Data Platform]10 %% Ingestion Layer11 subgraph Ingestion [2. Ingestion & Security]12 API[Real-time APIs]13 Batch[HL7 / sFTP Batch]14 end1516 %% Storage & Standardization Layer (Medallion Architecture)17 subgraph Storage [3. Storage & Data Lake]18 Bronze[(Bronze Layer\nRaw Unmasked Data)]19 Silver[(Silver Layer\nFHIR v5 HL7 Standardized)]20 Gold[(Gold Layer\nAggregated / Features)]2122 Bronze -->|Mask PII, Map & Standardize| Silver23 Silver -->|Aggregate & Curate| Gold24 end2526 %% Unified Consumption & AI Layer27 subgraph Consumption [4. Consumption, AI & BI]28 BI[BI Dashboard]29 AIRec[AI Smart Health Checkup Recommendation]30 end31end3233%% Flow connections34HIS1 --> API35HIS1 --> Batch3637API -->|Unmasked Data| Bronze38Batch -->|Unmasked Data| Bronze3940Gold --> BI41Gold --> AIRec4243%% Styling44classDef lake fill:#e0f7fa,stroke:#00838f,stroke-width:2px,stroke-dasharray: 5 5;45classDef platform fill:#f5f5f5,stroke:#9e9e9e,stroke-width:2px,stroke-dasharray: 5 5;46classDef layer1 fill:#e3f2fd,stroke:#2196f3,stroke-width:2px;47classDef layer2 fill:#f3e5f5,stroke:#9c27b0,stroke-width:2px;48classDef layer3 fill:#e8f5e9,stroke:#4caf50,stroke-width:2px;49classDef layer4 fill:#fff3e0,stroke:#ff9800,stroke-width:2px;5051class NavavejLake lake52class VNSPlatform platform53class Sources layer154class Ingestion layer255class Storage layer356class Consumption layer457
This document is conﬁdential and restricted to Vietnam Silicon use only; it cannot be shared with third parties without prior written authorization from
Vietnam Silicon
@Copyright 2025 by Vietnam Silicon.

# Page 11

4.3 Data Conversion & Health Trend Pre-Computing
4.3.1 Clinical Code Mapping (LOINC, SNOMED CT, ICD-10)
A dedicated service converts "Local Codes" from Navavej's HIS into international standard codes:LOINC: For laboratory test result codes (Observations).SNOMED CT: For symptoms, diagnoses, and procedures (Conditions/Procedures).ICD-10: For disease classification.
Technical Implementation:We deploy a robust FHIR Terminology Server (e.g., HAPI FHIR Terminology, Ontoserver) within the pipeline. This service automaticallyingests FHIR ConceptMap and ValueSet resources to translate Navavej's proprietary HIS codes and Thai national standard codes (TMT,TMLT, TCHI) dynamically into the globally recognized standards during the ingestion phase with sub-second latency.
4.3.2 Health Trend Pre-Computing (Velocity, Gaps, eGFR slope)
To optimize AI performance and ensure reliable medical accuracy, longitudinal calculations (e.g., BMI velocity over 12 months, eGFR slopedecline) are explicitly pre-computed during this pipeline phase. Rather than relying on the AI to deduce complex math on the fly, thesegenerated features are stored in a secondary, specialized Trending Store DB (an AI Feature Store). This enterprise pattern keeps theprimary FHIR Database beautifully pristine for immutable clinical records while the Trending Store securely holds analytical AI features readyfor instant AI context mapping.
Technical Implementation:We construct an automated ETL/ELT pipeline leveraging distributed compute frameworks (e.g., Apache Spark or dbt). This architectureutilizes event-driven triggers; immediately upon the arrival of new clinical data via CDC, micro-batch processes spin up to recalculate criticalhealth metrics and sync the updated features to the Gold Layer.
4.4 Dual-Storage Strategy
4.4.1 Core FHIR Database (Immutable Clinical Records)
The Core FHIR Database represents our Silver Layer, serving as the system of record for standardized, masked clinical data.Design Pattern: Data is strictly modeled as HL7 FHIR R4 JSON resources.Immutability & Compliance: All Personally Identifiable Information (PII) is removed or tokenized prior to insertion. The database istreated as an append-only, immutable ledger ensuring auditability, exact historical clinical states, and uncompromising adherence to PDPAregulations.
4.4.2 Trending Store Database (AI Analytical Feature Store)
The Trending Store acts as the Gold Layer and serves as a high-performance AI Feature Store.Design Pattern: Optimized for heavy read-access, time-series querying, and columnar analytics rather than transactional clinical updates.Purpose: It holds the pre-aggregated metrics, statistical gaps, and engineered features (like health velocity and moving averages). Thisallows the application layer, BI Dashboards, and AI models to retrieve rich patient context with millisecond latency without querying theCore FHIR Database.
5. Data Platform Tech StackOur solution is flexible and can be deployed utilizing either AWS Managed Services or an Open-Source Hybrid approach:
AWS Cloud Strategy:Ingestion & CDC: AWS DMS (Database Migration Service) or Managed Kafka (MSK).Data Storage (Bronze/Silver/Gold): Amazon S3 (Bronze), AWS HealthLake (Native FHIR Silver Layer), and Amazon Redshift / Athena(Gold/Trending Store).Processing & PII Masking: AWS Lambda for dynamic masking, AWS Glue / EMR (Apache Spark) for ETL and trend pre-computation.Serving & Security: Amazon API Gateway, Amazon Cognito (OAuth 2.0 / RBAC), AWS KMS for encryption.
Open Source / Hybrid Strategy:Ingestion & CDC: Debezium and Apache Kafka.
This document is conﬁdential and restricted to Vietnam Silicon use only; it cannot be shared with third parties without prior written authorization from
Vietnam Silicon
@Copyright 2025 by Vietnam Silicon.

# Page 12

Data Storage (Bronze/Silver/Gold): MinIO (S3-compatible Bronze), HAPI FHIR backed by PostgreSQL (Silver Layer), and ClickHouse(High-performance Gold/Trending Store).Processing & Orchestration: Apache Airflow / Temporal for orchestration, Apache Flink for real-time masking, and dbt for metricaggregations.Serving & Security: Kong / KrakenD API Gateway, Keycloak for Identity/OAuth, and HashiCorp Vault for secure vaults and re-identification.
6. Security, Privacy & Data Governance
6.1 SMART on FHIR Authorization (Access Control Gatekeeper)
TBDDiep
6.2 Data Masking & Pseudo-Anonymization Pipelines
TBDDiep + Data
6.3 Comprehensive Audit Logging
TBD Diep + Nguyen
7. AI & Recommendation Engine Architecture
7.1 High-Level AI Workflow
TBD Nguyen
7.2 Model Context Protocol (MCP) Middleware (Secure Context Retrieval)
TBD Nguyen
7.3 Hybrid Recommendation Logic (Rule-based Safety + AI Inference)
TBD Nguyen
7.4 Central AI Gateway
TBD Nguyen
7.4.2 Pluggable LLM Configuration Management
TBD Nguyen
7.4.1 Explainable AI (XAI) & Confidence Scoring Generation
TBD Nguyen
7.5 AI Tech Stack
TBD Nguyen
8. Frontend & Dashboards (User Experience)
8.1 Responsive Web Application Architecture (Tech Stack)
TBDDiep
8.2 Healthcare Provider Dashboard (Summaries, Timelines, Action Items)
TBDDiep
8.3 DPO / System Admin Access Monitoring Dashboard (Anomaly Detection)
TBDDiep
This document is conﬁdential and restricted to Vietnam Silicon use only; it cannot be shared with third parties without prior written authorization from
Vietnam Silicon
@Copyright 2025 by Vietnam Silicon.

# Page 13

9. Deployment & Operational Architecture
TBDDiep
9.1 Target Environment Strategy (SaaS / Private Cloud)
9.2 CI/CD Pipeline & Automation
9.3 Observability & Monitoring (Grafana, CloudWatch, OpenTelemetry)
9.4 Disaster Recovery (DR) & Backup Plan
10. Quality Assurance & Non-Functional Requirements (NFRs)
TBDDiep
10.1 Performance Metrics & SLAs
10.2 Scalability & High Availability Matrix
10.3 Medical Validation Strategy (Medical Acceptance Test / Expert Consensus)
10.4 Safety "Fallback" Rules
11. Cost & Investment Plan
TBDDiep
11.1 Infrastructure Licensing & Cloud Costs
11.2 Implementation & Professional Services
This document is conﬁdential and restricted to Vietnam Silicon use only; it cannot be shared with third parties without prior written authorization from
Vietnam Silicon
@Copyright 2025 by Vietnam Silicon.

