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
  client NavaveijClient
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

// ── AGENT 2: POLICY MATCHER + COMMUNICATOR (merged) ─────────────────────────

class AddOnItem {
  item_id string
  priority PriorityLevel
  label string
  product_code string
  price_thb float?
  category string
  rationale string
}

class CommunicationScript {
  health_summary string
  recommendation_rationale string
  addon_highlights string[]
  next_steps string
}

class RecommendationWithScript {
  ai_recommended_tier Tier
  tier_deviation_justification string?
  selected_add_ons AddOnItem[]
  policy_reasoning string
  communication_script CommunicationScript
}

function MatchAndCompose(
  risk_profile: ClinicalRiskProfile,
  program_ruleset: string
) -> RecommendationWithScript {
  client NavaveijClient
  prompt #"
    Role: Navavej Program Specialist and Clinical Communicator.
    You have two responsibilities in a single pass:

    ── INPUT DATA ─────────────────────────────────────────────────────────────
    CLINICAL RISK PROFILE: {{ risk_profile }}
    PROGRAM RULESET: {{ program_ruleset }}

    ── PART 1 — POLICY MATCHING ───────────────────────────────────────────────
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

    ── PART 2 — PATIENT COMMUNICATION SCRIPT ──────────────────────────────────
    4. Write a 'health_summary' (concise paragraph) starting directly with the most significant findings.
    5. Write 'recommendation_rationale' explaining the chosen Tier and selected Add-ons.
    6. Provide concise 'addon_highlights' as short phrases.
    7. Provide actionable 'next_steps' (concise paragraph).

    ── CONSTRAINTS (MANDATORY) ───────────────────────────────────────────────
    - NO greetings like "Hello" or "Dear patient".
    - NO conversational filler or small talk.
    - Use Markdown bolding (**text**) ONLY for important clinical terms, medications, and key risk factors.
    - Write health_summary and next_steps as clean prose paragraphs.
    - STRICTLY FORBIDDEN: Do NOT use bullet markers ('-','*') or numbered lists in health_summary or next_steps.
    - Professional, direct, and empathetic medical English. No raw snake_case identifiers.

    {{ ctx.output_format }}
  "#
}
