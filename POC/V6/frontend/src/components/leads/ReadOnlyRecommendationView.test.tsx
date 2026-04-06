import { render, screen } from "@testing-library/react";

import { ReadOnlyRecommendationView } from "./ReadOnlyRecommendationView";
import { PreRunnedRecommendation } from "@/types/leads";

const recommendation: PreRunnedRecommendation = {
  patient_id: "id_lead_001",
  patient_token: "tok_hmac_lead_001",
  patient_name: "Siriporn Chantarak",
  age: 68,
  gender: "Female",
  scenario_label: "Senior Cancer Screening Gap",
  generated_at: "2026-04-03T09:05:00Z",
  ai_lead_summary: "High-priority reach-out candidate for coordinated screening completion.",
  recommendation: {
    overall_risk_level: "High",
    ai_recommended_tier: "Premium",
    tier_deviation_justification: "Multiple overdue screenings justify a premium package.",
    add_ons: [],
    reasoning_trace: "A premium screening bundle improves completion during one visit.",
    reasoning_trace_annotated: [
      {
        text: "Multiple preventive gaps support coordinated outreach.",
        scope: "clinical_reasoning",
        sentiment: "risk",
        highlight_terms: ["preventive gaps", "coordinated outreach"],
      },
    ],
    supporting_signals: ["overdue colon screening"],
    missing_signals: [],
    communication_script: {
      summary_headline: "Overdue screening profile supports premium follow-up",
      summary_headline_highlights: ["premium follow-up"],
      top_findings: [
        {
          text: "Missed screening opportunities can be consolidated into one visit.",
          highlight_terms: ["Missed screening opportunities", "one visit"],
        },
      ],
      program_justification: "A premium package helps close missed screenings efficiently.",
      program_justification_highlights: ["premium package", "missed screenings"],
      priority_add_ons: [
        {
          label: "Colonoscopy",
          severity: "critical",
        },
      ],
      next_actions: [
        {
          text: "Offer a bundled screening visit with fast scheduling.",
          highlight_terms: ["bundled screening visit", "fast scheduling"],
        },
      ],
    },
    rule_preliminary_tier: "Advanced",
    resolved_package: {
      tier: "Premium",
      name: "Navavej Premium Preventive Plus",
      price_thb: 17900,
    },
    resolved_package_status: "matched",
    confidence_score: 0.89,
    confidence_tier: "High",
    signal_coverage: 0.87,
    data_completeness: 0.9,
    rule_agreement: 0.94,
    review_required: false,
    recommendation_source: "precomputed",
    recommendation_hash: "lead-hash-24d93799",
    risk_summary: {
      source: "precomputed-fixture",
      is_fallback: false,
      description: "High preventive risk from accumulated screening gaps. Multiple overdue screenings warrant coordinated follow-up.",
    },
    patient_high_alert: {
      critical_signals: [
        {
          signal_id: "screening_gap_cluster",
          label: "Multiple overdue cancer screenings",
          severity: "high",
          clinical_note: "Preventive closure should not be delayed further.",
        },
      ],
    },
    security_metadata: {},
    metadata: {
      generated_at: "2026-04-03T09:05:00Z",
    },
  },
};

describe("ReadOnlyRecommendationView", () => {
  it("renders core lead recommendation sections from precomputed data", () => {
    render(<ReadOnlyRecommendationView data={recommendation} />);

    expect(screen.getByText("Pre-run recommendation")).toBeInTheDocument();
    expect(screen.getByText("Siriporn Chantarak")).toBeInTheDocument();
    expect(screen.getByText("Navavej Premium Preventive Plus")).toBeInTheDocument();
    expect(screen.getByText("89% confidence")).toBeInTheDocument();
    expect(screen.getByText("Colonoscopy")).toBeInTheDocument();
    expect(screen.getByText("Key Findings")).toBeInTheDocument();
    expect(screen.getByText("Suggested Next Steps")).toBeInTheDocument();
    expect(
      screen.getAllByText((_, node) =>
        (node?.textContent ?? "").includes("Missed screening opportunities can be consolidated into one visit.")
      ).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText((_, node) =>
        (node?.textContent ?? "").includes("Offer a bundled screening visit with fast scheduling.")
      ).length
    ).toBeGreaterThan(0);
    expect(screen.getByText("High preventive risk from accumulated screening gaps. Multiple overdue screenings warrant coordinated follow-up.")).toBeInTheDocument();
    expect(screen.getByText("Multiple overdue cancer screenings")).toBeInTheDocument();
  });
});
