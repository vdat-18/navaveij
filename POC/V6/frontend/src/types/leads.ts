import { RecommendationResponse } from "@/types/recommendation";

export type LeadStatus = "assigned" | "contacted" | "scheduled" | "converted" | "declined";

export interface SalesUser {
  user_id: string;
  name: string;
  role: string;
}

export interface LeadAssignment {
  assignment_id: string;
  patient_id: string;
  patient_token: string;
  patient_name: string;
  scenario_label: string;
  overall_risk_level: string;
  ai_recommended_tier: string;
  generated_at: string;
  ai_lead_summary: string;
  assigned_to_user_id: string;
  assigned_to_name: string;
  assigned_by_user_id: string;
  assigned_at: string;
  status: LeadStatus;
  notes: string;
}

export interface PreRunnedPatient {
  patient_id: string;
  patient_token: string;
  patient_name: string;
  age?: number | null;
  gender?: string | null;
  scenario_label: string;
  generated_at: string;
  ai_lead_summary: string;
  ai_recommended_tier: string;
  overall_risk_level: string;
  is_assigned: boolean;
  assigned_to_name?: string | null;
}

export interface PreRunnedRecommendation {
  patient_id: string;
  patient_token: string;
  patient_name: string;
  age?: number | null;
  gender?: string | null;
  scenario_label: string;
  generated_at: string;
  ai_lead_summary: string;
  recommendation: RecommendationResponse;
}
