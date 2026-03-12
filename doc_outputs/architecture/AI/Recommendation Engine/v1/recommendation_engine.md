graph TB
    subgraph "Recommended Hybrid Engine Detail"
        FHIR_DATA[FHIR Patient Bundle] --> RULE_ENGINE[Rule-Based Engine]
        RULE_ENGINE --> |"1. Risk Level Classification"| PROGRAM_SELECT[Main Program Selection]
        RULE_ENGINE --> |"2. Gap Analysis"| GAP_DETECT[Screening Gap Detection]
        RULE_ENGINE --> |"3. Abnormal Triggers"| ABNORMAL[Abnormal Result Trigger]
        
        PROGRAM_SELECT --> CONTEXT_BUILDER[AI Context Builder]
        GAP_DETECT --> CONTEXT_BUILDER
        ABNORMAL --> CONTEXT_BUILDER
        
        CONTEXT_BUILDER --> |"via MCP Read-Only"| AI_MODEL[AI Model - Reasoning]
        AI_MODEL --> SAFETY_CHECK{Safety Rule Validator}
        SAFETY_CHECK --> |Pass| OUTPUT[Recommendation Output]
        SAFETY_CHECK --> |Fail - Conflict| FALLBACK[Safety Fallback / Revoke]
        FALLBACK --> RULE_ENGINE
    end
