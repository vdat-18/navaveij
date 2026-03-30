export interface PromotionApplied {
  promo_id: string;
  label: string;
  label_short: string;
  badge_color: string;
  type: string;
  discount_description: string;
  savings_thb: number;
  card_cost_thb?: number | null;
  consultant_note?: string | null;
}

export interface PromotionSummary {
  active_promotions: PromotionApplied[];
  total_savings_thb: number;
  urgency_messages: string[];
  consultant_prompts: string[];
}

export interface RecommendationAddOn {
  item_code: string;
  item_id: string;
  priority_level: string;
  priority?: string;
  rationale: string;
  label: string;
  product_code?: string;
  price_thb?: number | null;
  category?: string;
  trigger_signals_matched?: string[];
  original_price_thb?: number;
  promo_price_thb?: number;
  promotions_applied?: PromotionApplied[];
}

export interface ConsultationFinding {
  text: string;
  highlight_terms: string[];
}

export type HighlightSeverity = "critical" | "caution" | "moderate" | "neutral";

export interface AddOnItem {
  label: string;
  severity: HighlightSeverity;
}

export interface CommunicationScript {
  // Primary fields (new shape)
  summary_headline?: string;
  summary_headline_highlights?: string[];
  top_findings?: ConsultationFinding[];
  program_justification?: string;
  program_justification_highlights?: string[];
  priority_add_ons?: AddOnItem[];
  next_actions?: ConsultationFinding[];
  // Legacy aliases (backwards-compat)
  opening?: string;
  clinical_conclusion?: string;
  health_summary?: string;
  recommendation_explanation?: string;
  add_on_highlights?: string[];
  next_steps?: string;
}

export interface AnnotatedReasoningLine {
  text: string;
  scope: "clinical_reasoning" | "policy_reasoning";
  sentiment: "risk" | "reassuring" | "neutral" | "informational";
  highlight_terms: string[];
}

export interface ResolvedPackage {
  tier?: string;
  package_name?: string;
  package_code?: string;
  name?: string;
  price_thb?: number | null;
  age_band?: string;
  gender?: string;
  original_price_thb?: number;
  promotions_applied?: PromotionApplied[];
  savings_thb?: number;
}

export interface CriticalSignal {
  signal_id?: string;
  label?: string;
  severity?: string;
  clinical_note?: string;
}

export interface PatientHighAlert {
  critical_signals?: CriticalSignal[];
  missing_data_alerts?: Array<{
    signal_id: string;
    label: string;
    recommendation_impact: string;
  }>;
}

export interface RecommendationSecurityMetadata {
  rehydration_map?: Record<string, string>;
  masked_ai_output?: {
    reasoning_trace?: string;
    package_name?: string;
    price_thb?: number | string | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface RecommendationMetadata {
  generated_at?: string;
  [key: string]: unknown;
}

export interface RiskSummary {
  source: string;
  is_fallback: boolean;
  description?: string;
  signal_store_pipeline_run_id?: string;
  signals_fired_count?: number;
}

export interface RecommendationResponse {
  overall_risk_level: string;
  ai_recommended_tier: string;
  tier_deviation_justification: string | null;
  add_ons: RecommendationAddOn[];
  reasoning_trace: string;
  reasoning_trace_annotated?: AnnotatedReasoningLine[];
  supporting_signals: string[];
  missing_signals: string[];
  communication_script: CommunicationScript;
  rule_preliminary_tier: string;
  resolved_package: ResolvedPackage;
  resolved_package_status?: string;
  confidence_score: number;
  confidence_tier: string;
  signal_coverage?: number;
  data_completeness?: number;
  rule_agreement?: number;
  review_required: boolean;
  recommendation_source: string;
  recommendation_hash: string | null;
  risk_summary?: RiskSummary;
  promotion_summary?: PromotionSummary;
  patient_high_alert: PatientHighAlert | CriticalSignal[];
  biomarker_trends?: {
    bmi?: { history?: { date: string; value: number }[] };
    blood_pressure?: { history?: { date: string; sbp: number; dbp: number }[] };
    labs?: Array<{
      lab_id: string;
      label: string;
      current_value: number;
      unit: string;
      interpretation: string;
      category: string;
      trend_direction: string;
      reference_range: Record<string, number | undefined>;
    }>;
  };
  security_metadata?: RecommendationSecurityMetadata;
  metadata?: RecommendationMetadata;
}
