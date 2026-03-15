function SynthesizeClinicalRecord(scenario: ClinicalScenario) -> PatientCheckupRecord {
  client NavaveijClient

  prompt #"
    Generate a medically realistic and consistent synthetic patient record for the following clinical scenario: {{ scenario }}.

    CONTEXT:
    The record represents a patient at Navavej International Hospital. The data is used to test an AI Recommendation Engine.

    REQUIREMENTS:
    1. MEDICAL CONSISTENCY:
       - If scenario is UncontrolledHypertension, the 'vitals' must show rising SBP/DBP over time.
       - If scenario is SeniorCancerScreeningGap, the 'procedures' must show that colonoscopy or mammogram is overdue (last done 5-10 years ago).
       - Ensure Lab interpretations (H, L, N) match the reference ranges and values.
    
    2. HISTORICAL DEPTH:
       - Provide exactly 3 entries for 'vitals' (BMI, BP) and key 'labs' (Glucose, Lipids, etc.) spanning the last 3 years.
       - Use realistic dates in ISO 8601 format (YYYY-MM-DD).

    3. LOCALIZATION:
       - Use Thai names (e.g., Somchai, Arisa, Boonmee) but formatted in English.
       - Ethnicity should be 'asian'.
       - Units should follow Thai hospital standards (mg/dL, kg/m2, U/L).

    4. IDS:
       - Use prefixes like 'pt-', 'obs-', 'cond-', 'proc-'.

    5. JSON STRUCTURE:
       - Ensure every field required by the schema is populated with realistic dummy data.

    {{ ctx.output_format }}
  "#
}
