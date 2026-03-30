export interface NumericHistoryPoint {
  date: string;
  value: number;
}

export interface BloodPressureHistoryPoint {
  date: string;
  sbp: number;
  dbp: number;
}

export interface LabReferenceRange {
  low?: number;
  high?: number;
  optimal?: number;
  borderline_high_low?: number;
  borderline_high_high?: number;
  normal_high?: number;
  borderline_high?: number;
  uln?: number;
  uln_male?: number;
  low_male?: number;
  protective?: number;
  desirable_high?: number;
  age_adjusted_uln_50s?: number;
}

export interface LabTrend {
  lab_id: string;
  label: string;
  loinc_code: string;
  current_value: number;
  current_severity?: "normal" | "borderline" | "abnormal" | "unknown";
  unit: string;
  reference_range?: LabReferenceRange;
  interpretation?: string;
  category?: string;
  velocity_per_year?: number | null;
  trend_direction?: string;
  trend_flag?: string;
  history: NumericHistoryPoint[];
  alert?: string;
  trend_data_note?: string;
  sdm_note?: string;
}

export interface BiomarkerTrendsResponse {
  patient_token: string;
  bmi: {
    current: number;
    current_severity?: "normal" | "borderline" | "abnormal" | "unknown";
    unit: string;
    trend_direction: string;
    slope_per_year?: number | null;
    history: NumericHistoryPoint[];
  };
  blood_pressure: {
    latest?: { sbp: number; sbp_severity?: "normal" | "borderline" | "abnormal" | "unknown"; dbp: number; date: string };
    unit: string;
    trend_direction: string;
    sbp_slope_per_year?: number | null;
    history: BloodPressureHistoryPoint[];
  };
  egfr: {
    current: number;
    current_severity?: "normal" | "borderline" | "abnormal" | "unknown";
    unit: string;
    loinc_code: string;
    trend_direction: string;
    annual_slope?: number | null;
    history: NumericHistoryPoint[];
  };
  labs: LabTrend[];
  computed_at: string;
  pipeline_run_id: string;
}

