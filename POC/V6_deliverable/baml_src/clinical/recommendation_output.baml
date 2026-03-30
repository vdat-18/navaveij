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
  system_prompt: string,
  clinical_signals: string,
  biomarker_trends: string,
  hard_constraints: string,
  program_ruleset: string
) -> ClinicalRiskProfile {
  client ActiveModel
  prompt #"
    {{ system_prompt }}

    ── INPUT DATA ─────────────────────────────────────────────────────────────
    HARD CONSTRAINTS: {{ hard_constraints }}
    CLINICAL SIGNALS: {{ clinical_signals }}
    BIOMARKER TRENDS: {{ biomarker_trends }}
    HOSPITAL PROGRAM RULESET: {{ program_ruleset }}

    {{ ctx.output_format }}
  "#
}

function AnnotateReasoningLines(
  system_prompt: string,
  clinical_lines: string[]
) -> ReasoningLineAnnotation[] {
  client AnnotationModel
  prompt #"
    {{ system_prompt }}

    ── INPUT DATA ─────────────────────────────────────────────────────────────
    CLINICAL LINES: {{ clinical_lines }}

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
  system_prompt: string,
  risk_profile: ClinicalRiskProfile,
  program_ruleset: string
) -> PolicyMatchResult {
  client ActiveModel
  prompt #"
    {{ system_prompt }}

    ── INPUT DATA ─────────────────────────────────────────────────────────────
    CLINICAL RISK PROFILE: {{ risk_profile }}
    PROGRAM RULESET: {{ program_ruleset }}

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
  system_prompt: string,
  risk_profile: ClinicalRiskProfile
) -> NarrativeScript {
  client ActiveModel
  prompt #"
    {{ system_prompt }}

    ── INPUT DATA ─────────────────────────────────────────────────────────────
    CLINICAL RISK PROFILE: {{ risk_profile }}

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
