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

enum LineSentiment {
  Risk @alias("risk")
  Reassuring @alias("reassuring")
  Neutral @alias("neutral")
}

class ReasoningLineAnnotation {
  text string
  sentiment LineSentiment
  highlight_terms string[]
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

    ── FORMATTING (STRICT) ────────────────────────────────────────────────────
    - Use Markdown bolding (**text**) for: Clinical terms, Biomarkers, Values (e.g. **140/90 mmHg**), and key Diagnoses.
    - Write as a natural paragraph for the summary.
    - Be concise and professional.
    - NO greetings or conversational filler.

    {{ ctx.output_format }}
  "#
}

function AnnotateReasoningLines(
  clinical_lines: string[]
) -> ReasoningLineAnnotation[] {
  client ActiveModel
  prompt #"
    Role: Clinical Annotation Specialist.
    Classify each clinical reasoning line and identify only meaningful highlights.

    ── INPUT DATA ─────────────────────────────────────────────────────────────
    CLINICAL LINES: {{ clinical_lines }}

    ── INSTRUCTIONS ───────────────────────────────────────────────────────────
    1. Return one annotation item for each input line, preserving order.
    2. Assign:
       - "risk" for lines that describe active risk, worsening trends, overdue actions, or abnormal findings.
       - "reassuring" for lines that describe controlled, normal, negative, or protective findings.
       - "neutral" for descriptive lines that are important but not clearly risk-heavy or reassuring.
    3. Populate "highlight_terms" with ALL clinically meaningful substrings from the line.
       Include:
       - named diagnoses, stages, or risk states (e.g. "Stage 2 Hypertension", "Prediabetes")
       - clinically decisive measurements with units (e.g. "140/90 mmHg", "92%")
       - screening or program terms that drive a decision (e.g. "Colonoscopy", "Exercise Stress Test")
       - actionability markers (e.g. "Overdue", "Urgent")
    4. DO NOT include generic connectors, punctuation fragments, or internal snake_case identifiers in "highlight_terms".
    5. Be comprehensive — include every meaningful span in the line, not just 1-3 items.

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

class PolicyAddOnSummary {
  label string
  priority PriorityLevel
}

class PolicyScript {
  program_justification string
  priority_add_ons PolicyAddOnSummary[]
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
       - 'program_justification': one short paragraph or two short sentences explaining the chosen Tier and the add-on package logic.
       - 'priority_add_ons': 2-4 structured items summarising only the highest-value add-ons.
         Each item has a 'label' (concise name, under 10 words) and 'priority' (Red/Orange/Yellow/Green).

    ── CONSTRAINTS (MANDATORY) ───────────────────────────────────────────────
    - NO greetings or conversational filler.
    - Professional, direct medical English. No raw snake_case identifiers.
    - Use Markdown bolding (**text**) for: Clinical terms, risk factors, and medication names.
    - Keep 'program_justification' compact and non-repetitive.
    - Keep each item in 'priority_add_ons' under 10 words where possible.

    {{ ctx.output_format }}
  "#
}

// ── AGENT 2b: NARRATIVE WRITER ───────────────────────────────────────────────
// Runs in parallel with MatchPolicy (Agent 2a) after AnalyzeClinicalRisks.
// Responsible for: health_summary and next_steps — derived from risk_profile alone,
// no ruleset or add-on context required.

class NarrativeScript {
  summary_headline string
  top_findings string[]
  next_actions string[]
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
    1. Write 'summary_headline': one short physician-facing sentence that starts directly with the most important clinical picture.
    2. Write 'top_findings': 3-5 concise bullet-style strings, each focused on one clinically meaningful finding.
    3. Write 'next_actions': 3-5 concise action strings describing what the patient should do next.

    ── CONSTRAINTS (MANDATORY) ────────────────────────────────────────────────
    - NO greetings like "Hello" or "Dear patient".
    - NO conversational filler or small talk.
    - Keep 'summary_headline' under 24 words.
    - Keep each item in 'top_findings' and 'next_actions' under 20 words.
    - STRICTLY FORBIDDEN: Do NOT prefix items with bullet markers ('-','*') or numbers.
    - Professional, direct, and empathetic medical English.
    - Use Markdown bolding (**text**) for: Clinical terms, diagnoses, biomarker values, and drugs.
    - Avoid repeating the same concept across fields.

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
