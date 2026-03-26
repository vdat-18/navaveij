// AnnotateReasoningLines Integration Tests
// Validates that the Clinical Annotation Specialist correctly classifies clinical
// reasoning lines by sentiment and extracts meaningful highlight terms.
//
// Test Scenarios:
//   Risk-heavy   | 5 lines from a hypertensive patient     | Expect majority Risk sentiment
//   Reassuring   | 4 lines from a healthy patient           | Expect majority Reassuring, zero Risk
//   Mixed        | 6 lines (risk + reassuring + neutral)    | Expect at least 1 Risk and 1 non-Risk


// ── TEST 1: AnnotateLines — Risk-heavy clinical lines (Uncontrolled Hypertension) ──
//
// Lines drawn from a 57M patient with Stage 2 HTN, high LDL, ASCVD intermediate risk,
// overdue colonoscopy, and former heavy smoker.
// Expected: all 5 lines classified as Risk; all lines have highlight_terms.

test AnnotateLines_RiskHeavy {
  functions [AnnotateReasoningLines]
  args {
    clinical_lines [
      "Stage 2 Hypertension (BP 148/95 mmHg) on dual therapy — worsening BP trend despite amlodipine 10 mg and losartan 50 mg",
      "LDL 158.5 mg/dL significantly above target; rising +11 mg/dL/yr despite statin therapy — inadequate lipid control",
      "Colonoscopy overdue >10 years (last 2014); family history of colon cancer in brother at 52 — red priority screening gap",
      "ASCVD 10-year risk intermediate (12.8%) amplified by former 27 pack-year smoking history and family history of premature CAD (father MI at 52)",
      "Influenza vaccine missed for 2025-2026 season — orange priority vaccination gap"
    ]
  }
  // Must return exactly 5 annotations (one per input line)
  @@assert( {{ this|length == 5 }} )
  // Sentinel risk lines: HTN, high LDL, and overdue colonoscopy must all be Risk
  @@assert( {{ this[0].sentiment == "risk" }} )
  @@assert( {{ this[1].sentiment == "risk" }} )
  @@assert( {{ this[2].sentiment == "risk" }} )
  // Every annotation must have non-empty text
  @@assert( {{ this[0].text|length > 0 }} )
  @@assert( {{ this[1].text|length > 0 }} )
  @@assert( {{ this[2].text|length > 0 }} )
  @@assert( {{ this[3].text|length > 0 }} )
  @@assert( {{ this[4].text|length > 0 }} )
  // Every annotation must have at least 1 highlight term
  @@assert( {{ this[0].highlight_terms|length > 0 }} )
  @@assert( {{ this[1].highlight_terms|length > 0 }} )
  @@assert( {{ this[2].highlight_terms|length > 0 }} )
  @@assert( {{ this[3].highlight_terms|length > 0 }} )
  @@assert( {{ this[4].highlight_terms|length > 0 }} )
}


// ── TEST 2: AnnotateLines — Reassuring clinical lines (Healthy Routine Checkup) ──
//
// Lines from a 35M patient with all biomarkers normal, no signals fired.
// Expected: all lines Reassuring or Neutral; zero Risk.

test AnnotateLines_Reassuring {
  functions [AnnotateReasoningLines]
  args {
    clinical_lines [
      "All biomarkers within normal limits — FBS 91 mg/dL, HbA1c 5.3%, LDL 98 mg/dL, HDL 58 mg/dL",
      "BMI 22.4 kg/m2 — normal for Asian-adjusted thresholds (< 23 kg/m2); stable over 3 years",
      "Non-smoker, moderate physical activity 3 days/week, no alcohol use — protective lifestyle factors",
      "eGFR 99 mL/min/1.73m2 with stable annual slope (-0.2/yr) — normal kidney function, CKD Stage G1"
    ]
  }
  // Must return exactly 4 annotations
  @@assert( {{ this|length == 4 }} )
  // No line should be classified as Risk — this is an entirely healthy patient
  @@assert( {{ this[0].sentiment != "risk" }} )
  @@assert( {{ this[1].sentiment != "risk" }} )
  @@assert( {{ this[2].sentiment != "risk" }} )
  @@assert( {{ this[3].sentiment != "risk" }} )
  // Sentinel reassuring lines: "normal limits" and "normal kidney function" should be Reassuring
  @@assert( {{ this[0].sentiment == "reassuring" }} )
  @@assert( {{ this[3].sentiment == "reassuring" }} )
  // Every annotation must have non-empty text
  @@assert( {{ this[0].text|length > 0 }} )
  @@assert( {{ this[1].text|length > 0 }} )
  @@assert( {{ this[2].text|length > 0 }} )
  @@assert( {{ this[3].text|length > 0 }} )
  // Every annotation must have at least 1 highlight term
  @@assert( {{ this[0].highlight_terms|length > 0 }} )
  @@assert( {{ this[1].highlight_terms|length > 0 }} )
  @@assert( {{ this[2].highlight_terms|length > 0 }} )
  @@assert( {{ this[3].highlight_terms|length > 0 }} )
}


// ── TEST 3: AnnotateLines — Mixed sentiment (metabolic + reassuring + neutral) ──
//
// 6 lines mixing risk findings (prediabetes, screening gap), reassuring findings
// (normal BP, stable eGFR), and neutral/informational lines (medication note, family hx).
// Expected: line 0 (prediabetes) = Risk, line 2 (normal BP) != Risk, highlight_terms on all.

test AnnotateLines_Mixed {
  functions [AnnotateReasoningLines]
  args {
    clinical_lines [
      "Prediabetes confirmed — FBS 111 mg/dL and HbA1c 6.2% both in prediabetic range; FBS rising +4.5 mg/dL/yr",
      "Mammography overdue by 14 days — USPSTF Grade B biennial screening; expedited scheduling recommended",
      "Blood pressure 118/76 mmHg within normal range; stable over 3 consecutive measurements",
      "eGFR 86 mL/min/1.73m2 CKD G2 — mild decline (-1.2/yr) not reaching rapid progression threshold",
      "Currently on Atorvastatin 10 mg daily for dyslipidemia management; medication adherence good",
      "Family history: father with myocardial infarction at age 52 — classified as premature CAD"
    ]
  }
  // Must return exactly 6 annotations
  @@assert( {{ this|length == 6 }} )
  // Prediabetes line must be Risk
  @@assert( {{ this[0].sentiment == "risk" }} )
  // Mammogram overdue should be Risk
  @@assert( {{ this[1].sentiment == "risk" }} )
  // Normal BP line must NOT be Risk
  @@assert( {{ this[2].sentiment != "risk" }} )
  // Every annotation must have at least 1 highlight term
  @@assert( {{ this[0].highlight_terms|length > 0 }} )
  @@assert( {{ this[1].highlight_terms|length > 0 }} )
  @@assert( {{ this[2].highlight_terms|length > 0 }} )
  @@assert( {{ this[3].highlight_terms|length > 0 }} )
  @@assert( {{ this[4].highlight_terms|length > 0 }} )
  @@assert( {{ this[5].highlight_terms|length > 0 }} )
}
