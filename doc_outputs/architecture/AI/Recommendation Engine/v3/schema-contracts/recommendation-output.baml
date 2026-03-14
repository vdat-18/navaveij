// =============================================================================
// recommendation-output.baml
// Smart Health Checkup Recommendation Dashboard — v3
// =============================================================================
//
// Scope: Stage 1 AI output ONLY.
//   This schema defines exactly what the AI model must emit.
//   Stage 2 system fields (rule_preliminary_tier, resolved_package,
//   confidence_score, patient_high_alert, metadata, etc.) are injected
//   by the backend AFTER this schema is validated — they do not appear here.
//
// Companion documents:
//   recommendation-output-schema.md  — full 2-stage output contract
//   signal-store-contract.md         — signal IDs used in supporting_signals / missing_signals
//   ruleset-store-contract.md        — item_codes used in AddOnItem.item_code
//   component-inventory-solution-approach.md §2.4 — Pluggable AI / BAML enforcement rationale
//
// =============================================================================

// -----------------------------------------------------------------------------
// CLIENTS — Pluggable AI: swap model via config, no code change required.
//
// The active client is selected by the AI Gateway at inference time from the
// Model Config Store. Only one client is "active" per deployment environment.
// All clients share this same BAML schema — model-specific behavior is handled
// by the Prompt Template Selector (separate per-model prompt templates).
// -----------------------------------------------------------------------------

client<llm> GPT4o {
  provider openai
  options {
    model                "gpt-4o"
    temperature          0.2
    max_tokens           4096
    api_key              env("OPENAI_API_KEY")
  }
}

client<llm> Claude35Sonnet {
  provider anthropic
  options {
    model                "claude-3-5-sonnet-20241022"
    temperature          0.2
    max_tokens           4096
    api_key              env("ANTHROPIC_API_KEY")
  }
}

client<llm> Claude3Opus {
  provider anthropic
  options {
    model                "claude-opus-4-6"
    temperature          0.2
    max_tokens           4096
    api_key              env("ANTHROPIC_API_KEY")
  }
}

// Local Llama — routed through an OpenAI-compatible local endpoint.
// No API key required; endpoint is set via environment variable.
client<llm> LocalLlama {
  provider openai
  options {
    model                env("LOCAL_MODEL_ID")
    base_url             env("LOCAL_MODEL_BASE_URL")
    temperature          0.2
    max_tokens           4096
    api_key              "not-required"
  }
}

// Active client alias — the AI Gateway writes this env var from Model Config Store
// at service startup. Changing AI_ACTIVE_CLIENT in the config file and restarting
// the service is the only action required to swap models.
client<llm> ActiveModel {
  provider fallback
  // The strategy resolves to the first healthy client in order.
  // For production single-model deployments, only one entry is populated.
  options {
    strategy [
      env("AI_ACTIVE_CLIENT")  // resolves to one of: GPT4o | Claude35Sonnet | Claude3Opus | LocalLlama
    ]
  }
}

// -----------------------------------------------------------------------------
// ENUMS
// -----------------------------------------------------------------------------

/// Program tier: maps to a specific Navavej package name + price via the
/// Ruleset Store package_resolution_map (conditioned on patient gender + age).
/// Standard → Gold | Advanced → Platinum (M/F) | Premium → Diamond (M/F)
enum Tier {
  Standard
  Advanced
  Premium
}

/// Four-level urgency scale for add-on items.
/// Red    — urgent; significantly overdue or high-severity clinical trigger
/// Orange — approaching due / moderate-priority gap (e.g. overdue vaccination)
/// Yellow — clinically indicated, routine timeline
/// Green  — consider / shared decision-making; low urgency
enum PriorityLevel {
  Red
  Orange
  Yellow
  Green
}

// -----------------------------------------------------------------------------
// SUB-TYPES
// -----------------------------------------------------------------------------

/// A single recommended add-on examination, vaccine, or specialist referral.
///
/// The AI selects item_code values ONLY from the pre-filtered add_on_library[]
/// returned by get_program_ruleset. Items the patient is ineligible for (gender
/// or age exclusions) are absent from that list and must never appear here.
///
/// The system enriches each AddOnItem with label, category, navavej_product,
/// and trigger_signals_matched AFTER schema validation (Stage 2).
class AddOnItem {
  /// Stable identifier from Ruleset Store add_on_library[].item_code.
  /// Examples: "colonoscopy", "ldct_lung", "exercise_stress_test", "influenza_vaccine"
  item_code string

  /// AI-assigned urgency. May differ from Ruleset Store priority_level_default
  /// when clinical context justifies escalation. The Safety Rule Validator may
  /// revoke (not downgrade) items that violate hard constraints.
  priority_level PriorityLevel

  /// Patient-specific clinical justification. Must reference actual signal values,
  /// trend data, overdue durations, and guideline names.
  /// Generic rationales ("This test is recommended for patients like this") are
  /// not acceptable and will fail output review.
  /// Minimum: 2 sentences. No PII — only pseudonymized tokens.
  /// @assert {{ this|length > 40 }}
  rationale string
}

/// Structured patient-facing communication guide (TOR §3.3.5 — User Script).
/// Each field is a complete natural-language paragraph or list, not a template
/// placeholder. All fields must be non-empty.
///
/// Language requirements:
///   - Non-technical, suitable for a patient with no medical background
///   - Positive and action-oriented tone
///   - No PII — real patient names are rehydrated by the system after this field
///     is generated; the AI operates on pseudonymized tokens only
class CommunicationScript {
  /// Greeting introducing the purpose of today's consultation.
  opening string

  /// 2–4 sentence plain-language summary of the patient's key health findings.
  /// Should convey the overall risk picture without alarm.
  health_summary string

  /// Explains the recommended program tier and why it suits this patient.
  /// May mention Yellow/Green add-ons in aggregate.
  recommendation_explanation string

  /// One entry per Red or Orange priority add-on only.
  /// Each entry is a complete, plain-language explanation a staff member can
  /// read directly to the patient. Yellow/Green items are covered in aggregate
  /// by recommendation_explanation.
  add_on_highlights string[]

  /// What the patient should do next: how to book, what to bring, what to expect.
  next_steps string
}

// -----------------------------------------------------------------------------
// MAIN OUTPUT TYPE — Stage 1 (AI-generated)
// -----------------------------------------------------------------------------

/// The structured output the AI model must emit for every recommendation request.
///
/// Stage 2 system fields are injected by the backend AFTER this schema is
/// validated by the Output Schema Validator (BAML parse). Those fields include:
///   rule_preliminary_tier, resolved_package, confidence_score, confidence_tier,
///   review_required, recommendation_source, patient_high_alert, metadata,
///   add_ons[].label, add_ons[].category, add_ons[].navavej_product,
///   add_ons[].trigger_signals_matched
///
/// The AI must NOT emit any Stage 2 fields. The Output Schema Validator will
/// reject extra fields to prevent hallucinated system data from reaching the UI.
class RecommendationOutput {
  /// The program tier the AI recommends based on its clinical reasoning.
  /// May agree with or deviate from rule_preliminary_tier (provided as context).
  /// When deviating, tier_deviation_justification MUST be non-null.
  ai_recommended_tier Tier

  /// Required (non-null, non-empty) ONLY when ai_recommended_tier differs from
  /// rule_preliminary_tier. Must explicitly cite which signals and clinical
  /// reasoning justify the deviation.
  /// null when both tiers agree.
  tier_deviation_justification string?

  /// Ordered list of recommended add-ons. The AI selects from the pre-filtered
  /// add_on_library[] provided in context (get_program_ruleset response).
  /// Items should be ordered by priority_level (Red first, then Orange, Yellow, Green).
  /// An empty list is valid only when no add-on triggers are active.
  add_ons AddOnItem[]

  /// Full chain-of-thought reasoning displayed on the ROC Dashboard (Explainable AI).
  /// Must:
  ///   - Reference the specific tier rule applied (e.g. "ADVANCED_METABOLIC_OR_CVD")
  ///   - Address each major signal cluster (metabolic, cardiovascular, cancer screening,
  ///     vaccination, occupational, missing signals)
  ///   - Cite actual signal values and trend data (e.g. "FBS velocity +6 mg/dL/year")
  ///   - Name guideline sources (e.g. "USPSTF 2021", "ADA 2024")
  ///   - Explain any tier deviation or Premium/Advanced boundary decision
  ///   - Be ≥ 150 words
  ///   - Contain no PII (pseudonymized tokens only)
  /// @assert {{ this|length > 150 }}
  reasoning_trace string

  /// Signal IDs from the Signal Store that drove the tier and add-on decisions.
  /// Must be a non-empty subset of signals_fired[] from get_clinical_signals.
  /// Example: ["prediabetes_confirmed", "colonoscopy_overdue_2557d", "lung_ct_threshold_met"]
  supporting_signals string[]

  /// Signal IDs that were applicable for this patient but had no source data.
  /// Must be a subset of missing_signals[] from get_clinical_signals.
  /// These feed patient_high_alert.missing_data_alerts[] in Stage 2.
  /// An empty list is valid when all applicable signals had data.
  missing_signals string[]

  /// Structured patient-facing communication guide.
  communication_script CommunicationScript
}

// -----------------------------------------------------------------------------
// FUNCTION — Hybrid Recommendation Inference
// -----------------------------------------------------------------------------

/// Primary inference function called by the Inference Orchestrator.
///
/// Inputs are assembled by the Orchestrator from the four MCP baseline calls:
///   hard_constraints    ← get_hard_constraints(patient_token)
///   clinical_signals    ← get_clinical_signals(patient_token)
///   biomarker_trends    ← get_biomarker_trends(patient_token)
///   program_ruleset     ← get_program_ruleset(patient_token)
///
/// All inputs have been PII-masked before reaching this function.
/// Real patient identifiers (name, DOB, HN) are replaced with UUID tokens.
/// The AI reasons over pseudonymized data only.
function GenerateRecommendation(
  hard_constraints: string,
  clinical_signals: string,
  biomarker_trends: string,
  program_ruleset: string
) -> RecommendationOutput {
  client ActiveModel

  prompt #"
    You are a clinical decision-support AI integrated into a health checkup recommendation
    platform at a Thai international hospital. Your role is to reason over pre-computed
    patient health signals and produce a structured, evidence-based health checkup
    recommendation.

    You operate under a Hybrid Rule + AI model:
    - A rule-based Clinical Signal Engine has already produced a rule_preliminary_tier
      from the patient's signals. This is your baseline.
    - You may confirm or deviate from this baseline, but if you deviate you MUST
      provide an explicit clinical justification in tier_deviation_justification.
    - Hard constraints (gender/age eligibility, active safety flags) are
      NON-NEGOTIABLE and must never be overridden. They appear in hard_constraints.

    ── PATIENT DATA (PII-MASKED) ──────────────────────────────────────────────

    HARD CONSTRAINTS (eligibility exclusions + active safety flags):
    {{ hard_constraints }}

    CLINICAL SIGNALS (risk flags, screening gaps, vaccination gaps, comorbidities,
    family history, behavioral flags, symptom tags):
    {{ clinical_signals }}

    BIOMARKER TRENDS (current lab values, trend directions, velocities, eGFR slope,
    BMI trend, BP history, ASCVD 10-year risk):
    {{ biomarker_trends }}

    PROGRAM RULESET (tier selection rules, resolved package, add-on library):
    {{ program_ruleset }}

    ── INSTRUCTIONS ───────────────────────────────────────────────────────────

    Step 1 — Tier determination
      Read the rule_preliminary_tier and the tier_selection_rules from program_ruleset.
      Evaluate whether the rule-assigned tier is clinically appropriate given the full
      signal picture. Confirm or provide a justified deviation.
      The resolved_package in program_ruleset shows the specific Navavej package
      (name + price) for the preliminary tier — reference this in your reasoning.

    Step 2 — Add-on selection
      From the add_on_library in program_ruleset, select add-ons where the patient's
      signals_fired intersect with trigger_signals. Only select items present in the
      pre-filtered add_on_library — items excluded by gender or age are already absent.
      Assign priority_level based on clinical urgency:
        Red    — significantly overdue, first-time never-done, or high-severity trigger
        Orange — moderately overdue or approaching due date
        Yellow — clinically indicated, routine scheduling
        Green  — shared decision-making, low urgency
      Write a patient-specific rationale for each add-on that cites the actual signal
      values, trend data, overdue duration, and relevant guideline(s).
      Order add-ons: Red first, then Orange, Yellow, Green.

    Step 3 — Reasoning trace
      Write a structured chain-of-thought covering:
        a) Tier determination (which rule matched, why you agree or deviate)
        b) Each major signal cluster (metabolic, cardiovascular, cancer screening,
           vaccination, kidney/liver, occupational, missing signals)
        c) Any clinical nuance (e.g. borderline Premium vs Advanced; ASCVD
           intermediate risk; pre-diabetes trajectory; safety flag impacts)
      Reference specific values: FBS velocity, eGFR slope, overdue_days, pack-years.
      Name guidelines by source and year (e.g. "USPSTF Lung Cancer Screening 2021").
      Minimum 150 words. No real PII — use only the pseudonymized tokens as given.

    Step 4 — Supporting and missing signals
      List the signal IDs that directly drove your tier and add-on decisions in
      supporting_signals. These must be a subset of signals_fired from clinical_signals.
      List signal IDs with no source data (from clinical_signals.missing_signals) in
      missing_signals. Briefly explain the most clinically significant gap in the
      reasoning_trace.

    Step 5 — Communication script
      Write a patient-facing communication guide in friendly, non-technical Thai
      hospital style (in English for this POC). Cover:
        opening                  — greeting + purpose of today's consultation
        health_summary           — 2–4 sentences on key findings, plain language
        recommendation_explanation — explain the recommended program + why it fits
        add_on_highlights        — one entry per Red/Orange add-on only, plain language
        next_steps               — how to book, what to do before leaving today

    ── OUTPUT FORMAT ──────────────────────────────────────────────────────────

    {{ ctx.output_format }}

    IMPORTANT CONSTRAINTS ON YOUR OUTPUT:
    - Only output the fields defined in RecommendationOutput.
    - Do NOT output rule_preliminary_tier, resolved_package, confidence_score,
      confidence_tier, patient_high_alert, or metadata — these are system fields.
    - item_code values in add_ons[] must match exactly the item_code values in
      the add_on_library from program_ruleset. Do not invent new item codes.
    - supporting_signals values must be from signals_fired in clinical_signals.
    - missing_signals values must be from missing_signals in clinical_signals.
    - tier_deviation_justification must be null when ai_recommended_tier matches
      rule_preliminary_tier, and non-null with clinical justification when it differs.
    - Every add-on rationale must be patient-specific (cite actual values),
      not generic.
  "#
}

// -----------------------------------------------------------------------------
// TEST CASES
// -----------------------------------------------------------------------------
// Reference patient: Somchai W., 54yo male
// Expected output summary:
//   ai_recommended_tier: Advanced
//   tier_deviation_justification: null (agrees with rule_preliminary_tier)
//   add_ons: 13 items — 2 Red (colonoscopy, ldct_lung),
//            2 Orange (influenza_vaccine, shingrix_vaccine),
//            7 Yellow (diabetes_screening_pro, exercise_stress_test,
//                      ct_coronary_calcium, carotid_ultrasound, kidney_screening,
//                      multi_cancer_spotmas, hepatitis_abc_screen),
//            2 Green (psa_sdm, spine_mri)
//   confidence_score (computed by system): 0.823 → High
//
// Full worked example in recommendation-output-schema.md §Stage 1.
// Full signal input in signal-store-contract.md §Somchai W. examples.
// Full ruleset input in ruleset-store-contract.md §Somchai W. example.
