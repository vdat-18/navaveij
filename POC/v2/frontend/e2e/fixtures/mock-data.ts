import type { RecommendationResponse } from "../../src/types/recommendation";

export const PATIENT_LIST = [
  {
    patient_id: "pt-001",
    patient_token: "tok_test_patient_001",
    patient_name: "Test Patient Alpha",
    age: 45,
    gender: "M",
    mrn: "MRN-001",
    phone: "0800000001",
    email: "alpha@test.com",
    ethnicity: "Thai",
  },
];

export function makeRecommendation(
  overrides: Partial<RecommendationResponse> = {}
): RecommendationResponse {
  return {
    overall_risk_level: "Medium",
    ai_recommended_tier: "Standard",
    tier_deviation_justification: null,
    add_ons: [],
    reasoning_trace: "Baseline reasoning trace.",
    supporting_signals: ["BMI in range"],
    missing_signals: [],
    communication_script: {
      clinical_conclusion: "Patient shows moderate risk. Standard package recommended.",
    },
    rule_preliminary_tier: "Standard",
    resolved_package: {
      tier: "Standard",
      package_name: "Standard Health Screen",
      package_code: "STD-001",
      price_thb: 3500,
    },
    confidence_score: 0.87,
    confidence_tier: "High",
    review_required: false,
    recommendation_source: "ai",
    recommendation_hash: "hash-test-001",
    patient_high_alert: { critical_signals: [], missing_data_alerts: [] },
    ...overrides,
  };
}

export const SYSTEM_CONFIG = {
  active_client: "Claude35Sonnet",
  all_clients: [
    {
      name: "GPT4o",
      provider: "openai",
      model: "gpt-4o",
      status: "standby",
    },
    {
      name: "Claude35Sonnet",
      provider: "anthropic",
      model: "claude-3-5-sonnet-20241022",
      status: "active",
    },
  ],
  mcp_tools: [
    { name: "search", type: "retrieval", description: "Search clinical DB" },
  ],
  auth_mode: "smart",
  template_version: "1.0",
};
