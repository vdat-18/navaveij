// =============================================================================
// recommendation-output.baml
// Smart Health Checkup Recommendation Dashboard — v3 (Multi-Agent Architecture)
// =============================================================================
//
// Scope: Multi-Agent Clinical Reasoning Pipeline.
//   This schema defines the interaction between three specialized AI Agents:
//   1. AnalyzeClinicalRisks  — Extracts medical risks and trends.
//   2. MatchProgramRules      — Maps risks to hospital tiers and packages.
//   3. ComposeRecommendation  — Synthesizes patient-facing communication.
//
// =============================================================================

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

// -----------------------------------------------------------------------------
// AGENT 1: CLINICAL RISK ANALYZER
// -----------------------------------------------------------------------------

class ClinicalRiskProfile {
  /// Top 3-5 primary clinical risks identified from the signals.
  primary_risks string[]
  
  /// Medical severity assessment (Low/Moderate/High) with clinical justification.
  severity_assessment string
  
  /// Interpretation of longitudinal biomarker trends and velocities.
  biomarker_interpretation string
  
  /// Physician-facing summary bullets (Max 5-6).
  clinical_summary_bullets string[]
  
  /// AI-led preliminary tiering based purely on medical risk.
  suggested_tier Tier?
  
  /// Signal IDs that directly support the identified risks.
  supporting_signal_ids string[]
  
  /// Signal IDs that were expected but missing from the patient record.
  missing_signal_ids string[]
}

function AnalyzeClinicalRisks(
  clinical_signals: string,
  biomarker_trends: string,
  hard_constraints: string
) -> ClinicalRiskProfile {
  client ActiveModel
  prompt #"
    {{ baml.AnalyzeClinicalRisksPrompt }}
  "#
}

// -----------------------------------------------------------------------------
// AGENT 2: POLICY & PACKAGE RESOLVER
// -----------------------------------------------------------------------------

class AddOnItem {
  item_code string
  priority_level PriorityLevel
  rationale string
}

class RecommendationPlan {
  /// The finalized program tier after hospital policy matching.
  ai_recommended_tier Tier
  
  /// Clinical justification for deviating from rule_preliminary_tier (if applicable).
  tier_deviation_justification string?
  
  /// List of selected add-ons from the hospital library.
  selected_add_ons AddOnItem[]
  
  /// Administrative reasoning for the selected package strategy.
  policy_reasoning string
}

function MatchProgramRules(
  risk_profile: ClinicalRiskProfile,
  program_ruleset: string
) -> RecommendationPlan {
  client ActiveModel
  prompt #"
    {{ baml.MatchProgramRulesPrompt }}
  "#
}

// -----------------------------------------------------------------------------
// AGENT 3: CLINICAL COMMUNICATOR
// -----------------------------------------------------------------------------

class CommunicationScript {
  clinical_conclusion string
  health_summary string
  recommendation_explanation string
  add_on_highlights string[]
  next_steps string
}

class FinalRecommendation {
  plan RecommendationPlan
  script CommunicationScript
}

function ComposeRecommendation(
  risk_profile: ClinicalRiskProfile,
  recommendation_plan: RecommendationPlan
) -> FinalRecommendation {
  client ActiveModel
  prompt #"
    {{ baml.ComposeRecommendationPrompt }}
  "#
}
