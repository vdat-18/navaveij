// Clinical Scenarios for targeted synthesis
enum ClinicalScenario {
  HealthyRoutineCheckup
  UncontrolledHypertension
  MetabolicSyndromeRisk
  SeniorCancerScreeningGap
  EarlyOnsetDiabetes
  ChronicKidneyDiseaseProgression
}

class ReferenceRange {
  low float?
  high float?
  text string?
}

class ObservationComponent {
  type string
  loinc_code string
  value float
  unit string
  reference_range ReferenceRange?
}

class Observation {
  id string
  type string
  loinc_code string
  date string
  value float?
  unit string?
  interpretation string?
  reference_range ReferenceRange?
  components ObservationComponent[] @alias("components")
  note string?
}

class Coding {
  code string
  display string
}

class ConditionCode {
  snomed Coding?
  icd10 Coding?
}

class Condition {
  id string
  status string
  verification_status string
  code ConditionCode
  onset_date string
  recorded_date string
}

class Procedure {
  id string
  status string
  type string
  code Coding
  performed_date string
  result_note string?
}

class FamilyHistory {
  id string
  relationship Coding
  relationship_sex string
  condition ConditionCode
  onset_age int
  is_premature_cad bool?
  note string?
}

class Medication {
  id string
  status string
  drug Coding @alias("drug") // Simplification: display + code
  prescribed_date string
  indication string?
}

class QuestionnaireResponseItem {
  question string
  value string? @description("Numeric or string value")
  value_coded string[] @alias("value_coded")
  unit string?
  note string?
}

class QuestionnaireResponse {
  id string
  type string
  date string
  responses QuestionnaireResponseItem[]
}

class PatientProfile {
  id string
  name string
  gender string
  birth_date string
  age int
  ethnicity string
}

class PatientCheckupRecord {
  patient PatientProfile
  observations PatientObservations @alias("observations")
  conditions Condition[]
  procedures Procedure[]
  immunizations ImmunizationRecord[] @alias("immunizations")
  family_history FamilyHistory[] @alias("family_history")
  medications Medication[]
  questionnaire_responses QuestionnaireResponse[] @alias("questionnaire_responses")
}

class PatientObservations {
  vitals Observation[]
  labs Observation[]
  social_history Observation[]
}

class ImmunizationRecord {
  id string
  status string
  vaccine Coding @alias("vaccine")
  administered_date string
  note string?
}
