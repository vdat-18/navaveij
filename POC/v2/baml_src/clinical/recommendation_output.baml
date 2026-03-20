// Multi-Agent Clinical Recommendation System
// Architecture: Agent 1 (Risk Analysis) -> Agent 2 (MatchAndCompose: Policy Matching + Communication)

enum Tier {
  Standard
  Advanced
  Premium
}

enum PriorityLevel {
  Red
  Orange
  Yellow
  Green
}

// ── AGENT 1: CLINICAL RISK ANALYZER ────────────────────────────────────────

class ClinicalRiskProfile {
  primary_risks string[]
  severity_assessment string
  biomarker_interpretation string
  clinical_summary_bullets string[]
  suggested_tier Tier // AI-led preliminary tiering based on medical risk
  supporting_signal_ids string[]
  missing_signal_ids string[]
}

function AnalyzeClinicalRisks(
  clinical_signals: string,
  biomarker_trends: string,
  hard_constraints: string,
  program_ruleset: string
) -> ClinicalRiskProfile {
  client ActiveModel
  prompt #"
    You are a Senior Medical Consultant AI. Your task is to analyze raw patient data 
    and produce a high-level clinical risk profile. Do NOT consider hospital prices or 
    package names yet. FOCUS ONLY ON MEDICAL RISK.

    ── INPUT DATA ─────────────────────────────────────────────────────────────
    HARD CONSTRAINTS: {{ hard_constraints }}
    CLINICAL SIGNALS: {{ clinical_signals }}
    BIOMARKER TRENDS: {{ biomarker_trends }}
    HOSPITAL PROGRAM RULESET: {{ program_ruleset }}

    ── INSTRUCTIONS ───────────────────────────────────────────────────────────
    1. Identify the top 3-5 primary clinical risks (e.g., "**Active Hypertension**", "**Obesity**").
    2. Provide a severity assessment (Low/Moderate/High) and justify it medically.
    3. Determine a 'suggested_tier' (Standard, Advanced, or Premium) by evaluating
       the clinical findings against the 'tier_selection_rules' in the hospital ruleset.
       Use these rules as a baseline for clinical severity at Navavej hospital.
    4. Interpret biomarker trends (e.g., "**eGFR is declining** at a rate of 5.5 mL/min/year").
    5. Create a concise list of clinical findings for a physician.
    6. List relevant signal IDs that support your findings in supporting_signal_ids.

    ── FORMATTING ─────────────────────────────────────────────────────────────
    - Use Markdown bolding (**text**) ONLY for important clinical terms, biomarkers, and key diagnoses.
    - Write as a natural paragraph for the summary.
    - Be concise and professional.
    - NO greetings or conversational filler.

    {{ ctx.output_format }}
  "#
}

// ── AGENT 2a: POLICY MATCHER ─────────────────────────────────────────────────
// Runs in parallel with WriteNarrative (Agent 2b) after AnalyzeClinicalRisks.
// Responsible for: tier selection, add-on selection, and add-on-dependent communication text.

class AddOnItem {
  item_id string
  priority PriorityLevel
  label string
  product_code string
  price_thb float?
  category string
  rationale string
}

class PolicyScript {
  recommendation_rationale string
  addon_highlights string[]
}

class PolicyMatchResult {
  ai_recommended_tier Tier
  tier_deviation_justification string?
  selected_add_ons AddOnItem[]
  policy_reasoning string
  policy_script PolicyScript
}

function MatchPolicy(
  risk_profile: ClinicalRiskProfile,
  program_ruleset: string
) -> PolicyMatchResult {
  client ActiveModel
  prompt #"
    Role: Navavej Program Specialist.
    Given a clinical risk profile and the hospital program ruleset, determine the optimal
    care package, select appropriate add-ons, and write the policy communication.

    ── INPUT DATA ─────────────────────────────────────────────────────────────
    CLINICAL RISK PROFILE: {{ risk_profile }}
    PROGRAM RULESET: {{ program_ruleset }}

    ── INSTRUCTIONS ───────────────────────────────────────────────────────────
    1. Determine the optimal Final Tier (Standard, Advanced, or Premium).
       - Evaluate the 'suggested_tier' from the Risk Profile.
       - Compare it against the 'tier_selection_rules' and 'rule_preliminary_tier' in the ruleset.
       - You have the authority to OVERRIDE the rule-based preliminary tier if the
         Clinical Risk Profile shows medical complexity that the rules missed.
         Record your justification in 'tier_deviation_justification'.
    2. Select Add-on Items from the 'add_on_library' in the ruleset.
       - Trigger an add-on ONLY if the patient's supporting_signal_ids intersect with the trigger_signals in the library.
       - Assign Priority: Red (Urgent/Overdue), Orange (Moderate), Yellow (Indicated), Green (Optional).
       - For each selected add-on, populate:
         item_id (from ruleset item_code), label, product_code, price_thb, category, priority, rationale.
    3. Write 'policy_reasoning' explaining why this specific package combination was chosen.
    4. In 'policy_script', write:
       - 'recommendation_rationale': explain the chosen Tier and selected Add-ons.
       - 'addon_highlights': concise short phrases summarising each selected add-on.

    ── CONSTRAINTS (MANDATORY) ───────────────────────────────────────────────
    - NO greetings or conversational filler.
    - Professional, direct medical English. No raw snake_case identifiers.
    - Use Markdown bolding (**text**) ONLY for important clinical terms and key risk factors.

    {{ ctx.output_format }}
  "#
}

// ── AGENT 2b: NARRATIVE WRITER ───────────────────────────────────────────────
// Runs in parallel with MatchPolicy (Agent 2a) after AnalyzeClinicalRisks.
// Responsible for: health_summary and next_steps — derived from risk_profile alone,
// no ruleset or add-on context required.

class NarrativeScript {
  health_summary string
  next_steps string
}

function WriteNarrative(
  risk_profile: ClinicalRiskProfile
) -> NarrativeScript {
  client ActiveModel
  prompt #"
    Role: Clinical Communicator.
    Write a patient-facing clinical narrative based on the provided risk profile.

    ── INPUT DATA ─────────────────────────────────────────────────────────────
    CLINICAL RISK PROFILE: {{ risk_profile }}

    ── INSTRUCTIONS ───────────────────────────────────────────────────────────
    1. Write 'health_summary': a concise paragraph starting directly with the most significant
       clinical findings. Summarise the patient's current health status and key risks.
    2. Write 'next_steps': an actionable paragraph describing what the patient should do
       based on the identified risks and clinical findings.

    ── CONSTRAINTS (MANDATORY) ────────────────────────────────────────────────
    - NO greetings like "Hello" or "Dear patient".
    - NO conversational filler or small talk.
    - Write BOTH fields as clean prose paragraphs.
    - STRICTLY FORBIDDEN: Do NOT use bullet markers ('-','*') or numbered lists in either field.
    - Professional, direct, and empathetic medical English.
    - Use Markdown bolding (**text**) ONLY for important clinical terms and diagnoses.

    {{ ctx.output_format }}
  "#
}

// ── DEPRECATED: MatchAndCompose ───────────────────────────────────────────────
// Replaced by MatchPolicy (Agent 2a) + WriteNarrative (Agent 2b) running in parallel.
// Kept for reference only — not called by any production code.
//
// class CommunicationScript { ... }
// class RecommendationWithScript { ... }
// function MatchAndCompose(...) -> RecommendationWithScript { ... }
