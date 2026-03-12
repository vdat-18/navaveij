# Recommendation Engine
``` mermaid
flowchart TD
    A[FHIR Patient Bundle] --> FE[Feature Engineering Layer]

    FE --> RE[Rule-Based Engine]

    RE --> HC[Hard Constraints<br/>Gender eligibility · Age gates<br/>Drug contraindications · Safety rules]
    RE --> SS[Soft Signals]

    SS --> S1[Risk Flags<br/>Elevated BP category · High BMI trend<br/>FBS velocity rising · Low eGFR slope]
    SS --> S2[Screening Gaps<br/>Mammogram overdue 2yr · No colonoscopy ever<br/>HPV vaccine missing]
    SS --> S3[Abnormal Triggers<br/>Fatty liver detected · HbA1c borderline<br/>Microalbumin elevated]
    SS --> S4[Preliminary Program<br/>Low / Moderate / High risk<br/>→ Standard / Advanced / Premium]

    HC --> CB[AI Context Builder]
    S1 --> CB
    S2 --> CB
    S3 --> CB
    S4 --> CB
    FE --> CB

    CB --> AI[AI Reasoning Engine]

    AI --> OUT[AI Output]
    OUT --> O1[Confirmed / adjusted program level]
    OUT --> O2[Ranked add-on recommendations]
    OUT --> O3[Reasoning traces per recommendation]
    OUT --> O4[Confidence scores per item]
    OUT --> O5[Cross-signal insights rules missed]

    OUT --> SRV[Safety Rule Validator<br/>Post-AI hard constraint check]
    HC -.->|Hard constraints<br/>passed through| SRV

    SRV -->|All pass| FINAL[Final Recommendation]
    SRV -->|Violation detected| FB[Fallback: Revoke item<br/>+ log conflict reason]

    style HC fill:#FFEBEE,stroke:#C62828
    style AI fill:#E3F2FD,stroke:#1565C0
    style SRV fill:#FFEBEE,stroke:#C62828
    style FE fill:#F3E5F5,stroke:#7B1FA2
    style CB fill:#FFF8E1,stroke:#F9A825
```
# Feature Engineering Layer
```
---
config:
  theme: forest
---
flowchart TD
    subgraph Inputs
        FHIR[FHIR Patient Bundle<br/>Historical Records]
        QST[Patient Questionnaire<br/>Symptoms · Behavioral · Reproductive]
        CTX[Contextual Data<br/>Seasonal · Occupational]
    end

    FHIR --> UC[Unit Conversion<br/>& Normalization]
    UC --> OD[Outlier Detection<br/>& Exclusion]
    OD --> FE[Feature Engineering Layer]
    QST --> FE
    CTX --> FE

    FE --> MR[Medical Record<br/>Feature Extractor]
    FE --> BIO[Biomarker &<br/>Trend Calculator]
    FE --> GEN[Genetic · Family ·<br/>Reproductive History Parser]
    FE --> BEH[Behavioral &<br/>Environmental Scorer]
    FE --> SCR[Screening Gap<br/>& Compliance Checker]
    FE --> SYM[Symptom Mapper]

    BIO --> BIO1[BMI Trend Vector]
    BIO --> BIO2[BP Category · JNC 8]
    BIO --> BIO3[Lab Value Velocity]
    BIO --> BIO4[eGFR Slope]

    style UC fill:#FFF3E0,stroke:#E65100
    style OD fill:#FFF3E0,stroke:#E65100
    style QST fill:#E8F5E9,stroke:#2E7D32
    style CTX fill:#E8F5E9,stroke:#2E7D32
```

# Trend & Velocity analysis
```
---
config:
  theme: forest
---
flowchart LR
    subgraph Trend & Velocity Service
        direction TB
        H[Historical FHIR<br/>Observations] --> UC[Unit Conversion<br/>& Normalization]
        UC --> OD[Outlier Detection<br/>& Exclusion]
        OD --> TC[Trend Calculations]
        TC --> T1[BMI Trend Vector]
        TC --> T2[Lab Velocity per Analyte]
        TC --> T3[eGFR Slope]
        TC --> T4[BP Category Trajectory]
    end
```

# Rule Repository
```
---
config:
  theme: forest
---
flowchart TD
    subgraph Rule-Based Engine
        direction TB
        RR[Rule Repository<br/>- Managed via Admin UI<br/>- Versioned · Auditable] --> |loads| RC1[Program Selection Rules]
        RR --> |loads| RC2[Screening Gap Rules<br/>+ Overdue Score]
        RR --> |loads| RC3[Abnormal Trigger Rules<br/>+ Comorbidity Cascade]
        RR --> |loads| RC4[Behavioral Trigger Rules]
        RR --> |loads| RC5[Symptom Mapping Rules]
        RR --> |loads| RC6[Vaccination Status Rules]
        RR --> |loads| RC7[Hard Safety Constraints<br/>- Configurable per company policy]
    end

    MDM[Master Data Management<br/>TOR 3.4.6] --> RR

    subgraph "Rule Metadata Schema"
        direction LR
        META["Each rule carries:<br/>• Source Guideline (e.g. JNC 8, ACS 2024)<br/>• Version / Effective Date<br/>• Priority Weight<br/>• Company Policy Override Flag<br/>• Active / Inactive Status"]
    end

    RR -.- META
```

# Context Builder
```
---
config:
  theme: forest
---
flowchart TD
    subgraph "AI Context Builder"
        direction TB
        
        IN1[Rule Engine Outputs<br/>Program level · Gaps · Triggers · Constraints] --> ASM[Context Assembler]
        IN2[Feature Vectors<br/>Trends · Velocities · Scores] --> ASM
        IN3[Hard Constraints<br/>Must-include / Must-exclude] --> ASM
        
        ASM --> PII[PII Guard<br/>Verify no identifiable data<br/>in AI-bound context]
        PII --> TPL[Template Selector<br/>Choose prompt template<br/>based on active AI model]
        TPL --> PROMPT[Assembled Prompt<br/>+ Structured Context]
        
        PROMPT --> LOG[Audit Logger<br/>Log prompt · context · timestamp<br/>before sending to AI]
        LOG --> OUT[To AI Gateway]
    end

    style PII fill:#FFEBEE,stroke:#C62828
    style LOG fill:#E8EAF6,stroke:#283593
    style TPL fill:#FFF8E1,stroke:#F9A825
```

# Reasoning outputs
```
---
config:
  theme: forest
---
flowchart TD
    CTX[Assembled Prompt<br/>+ Structured Context<br/>from AI Context Builder] --> GW[AI Gateway<br/>BAML AI Framework]

    GW --> PARSE[BAML Response Parser<br/>Enforce output schema<br/>Type-safe structured JSON]

    PARSE -->|Parse success| VALID[Validated AI Response]
    PARSE -->|Parse failure| RETRY[Retry with<br/>corrective prompt<br/>max 2 attempts]
    RETRY -->|Still fails| DEGRADE[Graceful Degradation<br/>Use rule-only output<br/>+ flag for review]

    VALID --> LOG[Audit Logger<br/>Log full response<br/>+ model ID + latency]

    LOG --> OUT[AI Output Bundle]

    OUT --> O1[Program Decision<br/>Confirm / Upgrade level<br/>with justification]
    OUT --> O2[Ranked Add-ons<br/>Priority-ordered list<br/>with per-item reasoning]
    OUT --> O3[Confidence Scores<br/>Per-item + overall<br/>with contributing factors]
    OUT --> O4[Cross-signal Insights<br/>Patterns rules may miss<br/>multi-factor correlations]
    OUT --> O5[Communication Script<br/>Patient-facing explanation<br/>per recommendation]
    OUT --> O6[Data Quality Flags<br/>Missing data that would<br/>improve confidence]

    OUT --> SRV[Safety Rule Validator]

    style PARSE fill:#E8F5E9,stroke:#2E7D32
    style RETRY fill:#FFF3E0,stroke:#E65100
    style DEGRADE fill:#FFEBEE,stroke:#C62828
    style LOG fill:#E8EAF6,stroke:#283593
    style OUT fill:#E3F2FD,stroke:#1565C0
```

# Safety Fallback
```
Recommendation AI Model → Safety Rule Validator → Personalized Checkup Plan
                                    ↓ (violation)
                              Fallback: Revoke + Log + Notify
```



| Layer | Description |
|-------|-------------|
| **LAYER 1: HARD RULES (Pre-AI)** | • Cannot be overridden by AI<br>• Gender eligibility (Mammogram → female only)<br>• Age gates (Colonoscopy → 45+)<br>• Contraindications<br>• Regulatory requirements |
| **LAYER 2: AI REASONING** | • CAN upgrade risk level (Moderate → High)<br>• CAN add/prioritize add-on items<br>• CAN adjust confidence based on context<br>• CANNOT remove hard-rule-mandated items<br>• CANNOT violate safety constraints |
| **LAYER 3: SAFETY VALIDATOR (Post-AI)** | • Final check against hard constraints<br>• Catches any AI hallucination/violation<br>• Revokes + logs if conflict found |
