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
}

export interface CommunicationScript {
  opening?: string;
  clinical_conclusion?: string;
  health_summary?: string;
  recommendation_explanation?: string;
  add_on_highlights?: string[];
  next_steps?: string;
}

export interface ResolvedPackage {
  tier?: string;
  package_name?: string;
  package_code?: string;
  name?: string;
  price_thb?: number | null;
  age_band?: string;
  gender?: string;
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
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface RecommendationMetadata {
  generated_at?: string;
  [key: string]: unknown;
}

export interface RecommendationResponse {
  overall_risk_level: string;
  ai_recommended_tier: string;
  tier_deviation_justification: string | null;
  add_ons: RecommendationAddOn[];
  reasoning_trace: string;
  supporting_signals: string[];
  missing_signals: string[];
  communication_script: CommunicationScript;
  rule_preliminary_tier: string;
  resolved_package: ResolvedPackage;
  confidence_score: number;
  confidence_tier: string;
  review_required: boolean;
  recommendation_source: string;
  recommendation_hash: string | null;
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
