// TypeScript types mirroring the Stage 2 RecommendationOutput JSON schema
// Source: schema-contracts/recommendation-output-schema.md

export type Tier = 'Standard' | 'Advanced' | 'Premium';
export type PriorityLevel = 'Red' | 'Orange' | 'Yellow' | 'Green';
export type ConfidenceTier = 'High' | 'Medium' | 'Low';
export type RecommendationSource = 'AI' | 'RuleBased';

export interface NavavejProduct {
  product_name: string;
  product_code: string;
  price_thb: number | null;
  note?: string;
}

export interface AddOnItem {
  item_code: string;
  priority_level: PriorityLevel;
  rationale: string;
  // Stage 2 enriched fields
  label?: string;
  category?: string;
  navavej_product?: NavavejProduct;
  trigger_signals_matched?: string[];
}

export interface CommunicationScript {
  opening: string;
  health_summary: string;
  recommendation_explanation: string;
  add_on_highlights: string[];
  next_steps: string;
}

export interface ResolvedPackage {
  tier: Tier;
  gender: string;
  age: number;
  age_band: string;
  package_name: string;
  package_code: string;
  price_thb: number;
}

export interface PatientHighAlert {
  critical_signals: string[];
  missing_data_alerts: string[];
}

export interface RecommendationMetadata {
  request_id: string;
  model_id: string;
  template_version: string;
  ruleset_version: string;
  latency_ms: number;
  computed_at: string;
  pipeline_run_id: string;
}

// Full Stage 2 RecommendationOutput
export interface RecommendationOutput {
  // Stage 1 — AI fields
  ai_recommended_tier: Tier;
  tier_deviation_justification: string | null;
  add_ons: AddOnItem[];
  reasoning_trace: string;
  supporting_signals: string[];
  missing_signals: string[];
  communication_script: CommunicationScript;
  // Stage 2 — system fields
  rule_preliminary_tier: Tier;
  resolved_package: ResolvedPackage;
  confidence_score: number;
  confidence_tier: ConfidenceTier;
  review_required: boolean;
  recommendation_source: RecommendationSource;
  patient_high_alert: PatientHighAlert;
  metadata: RecommendationMetadata;
}

// Event Timeline types (Screen 2)
export interface DiagnosisEvent {
  event_id: string;
  date: string;
  onset_year: number;
  onset_type: 'chronic' | 'acute';
  icd10_code: string;
  snomed_code: string;
  label: string;
  clinical_status: string;
}

export interface LabEvent {
  event_id: string;
  date: string;
  loinc_code: string;
  label: string;
  value: number;
  unit: string;
  interpretation: string;
  interpretation_label: string;
  threshold_crossed: string;
  normal_range: string;
}

export interface ScreeningEvent {
  event_id: string;
  date: string;
  days_ago: number;
  procedure_code: string;
  cpt_code: string;
  label: string;
  status: string;
  result_summary: string;
}

export interface MedicationChange {
  event_id: string;
  date: string;
  drug_name: string;
  rxnorm_code: string;
  change_type: 'started' | 'stopped' | 'dose_change';
  dose: string;
  indication: string;
}

export interface PatientTimeline {
  patient_token: string;
  timeline_span: { earliest_event_date: string; latest_event_date: string; total_years_covered: number };
  diagnoses: DiagnosisEvent[];
  hospitalizations: unknown[];
  significant_lab_events: LabEvent[];
  screening_procedure_history: ScreeningEvent[];
  medication_changes: MedicationChange[];
}

// Monitoring types (Screen 3)
export interface AlertCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface MonitoringSnapshot {
  snapshot_at: string;
  refresh_interval_seconds: number;
  active_users_now: number;
  sessions_today: number;
  patient_records_accessed_today: number;
  ai_recommendations_generated_today: number;
  alert_counts: AlertCounts;
  safety_validator_failures_today: number;
  top_active_departments: Array<{ department: string; active_users: number }>;
}

export interface AnomalyAlert {
  alert_id: string;
  user_id: string;
  user_display_name: string;
  department: string;
  alert_type: 'high_volume' | 'out_of_department' | 'off_hours';
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  triggered_at: string;
  detail: Record<string, unknown>;
  status: 'Open' | 'Acknowledged' | 'Resolved';
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
}

export interface AuditWho {
  user_id: string;
  user_display_name: string;
  user_role: string;
  department: string;
}

export interface AuditWhat {
  action_type: string;
  resource_type: string;
  patient_token: string | null;
  patient_token_masked: string | null;
  model_id: string | null;
  template_version: string | null;
  latency_ms: number | null;
  safety_validator_result: string | null;
  recommendation_source: string | null;
}

export interface AuditLogEntry {
  entry_id: string;
  sha256_hash: string;
  prev_entry_hash: string;
  who: AuditWho;
  when: { iso_timestamp_utc: string; local_timestamp_ict: string };
  where: { service_id: string; source_ip_hash: string; request_id: string; user_agent_class: string };
  what: AuditWhat;
  why: { request_context: string; indication_code: string };
  retention_expiry: string;
}

export interface RbacRole {
  role_id: string;
  label: string;
  permissions: Record<string, string[]>;
}

export interface MappingCode {
  local_code: string;
  local_system: string;
  standard_code: string;
  standard_system: string;
  display: string;
  mapping_type: string;
  status: string;
}
