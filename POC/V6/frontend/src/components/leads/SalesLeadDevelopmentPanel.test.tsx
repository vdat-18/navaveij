import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockLeadService } = vi.hoisted(() => ({
  mockLeadService: {
    getLeads: vi.fn(),
    getPreRunnedRecommendation: vi.fn(),
    updateLeadStatus: vi.fn(),
  },
}));

vi.mock("@/services/api", () => ({
  leadService: mockLeadService,
}));

import { SalesLeadDevelopmentPanel } from "./SalesLeadDevelopmentPanel";

describe("SalesLeadDevelopmentPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockLeadService.getLeads.mockResolvedValue([
      {
        assignment_id: "lead_001",
        patient_id: "id_24d93799",
        patient_token: "tok_hmac_24d93799",
        patient_name: "Siriporn Chantarak",
        scenario_label: "Senior Cancer Screening Gap",
        overall_risk_level: "High",
        ai_recommended_tier: "Premium",
        generated_at: "2026-04-03T09:05:00Z",
        ai_lead_summary: "High-priority reach-out candidate for coordinated screening completion.",
        assigned_to_user_id: "usr-sales-00001",
        assigned_to_name: "Somying Srisuk",
        assigned_by_user_id: "usr-executive-00001",
        assigned_at: "2026-04-03T10:00:00Z",
        status: "assigned",
        notes: "Initial executive note.",
      },
    ]);

    mockLeadService.getPreRunnedRecommendation.mockResolvedValue({
      patient_id: "id_24d93799",
      patient_token: "tok_hmac_24d93799",
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
        reasoning_trace_annotated: [],
        supporting_signals: ["overdue colon screening"],
        missing_signals: [],
        communication_script: {
          summary_headline: "Overdue screening profile supports premium follow-up",
          summary_headline_highlights: ["premium follow-up"],
          top_findings: [],
          program_justification: "A premium package helps close missed screenings efficiently.",
          program_justification_highlights: ["premium package"],
          priority_add_ons: [],
          next_actions: [],
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
          critical_signals: [],
        },
        security_metadata: {},
        metadata: {
          generated_at: "2026-04-03T09:05:00Z",
        },
      },
    });

    mockLeadService.updateLeadStatus.mockImplementation(async (_assignmentId, status, notes) => ({
      assignment_id: "lead_001",
      patient_id: "id_24d93799",
      patient_token: "tok_hmac_24d93799",
      patient_name: "Siriporn Chantarak",
      scenario_label: "Senior Cancer Screening Gap",
      overall_risk_level: "High",
      ai_recommended_tier: "Premium",
      generated_at: "2026-04-03T09:05:00Z",
      ai_lead_summary: "High-priority reach-out candidate for coordinated screening completion.",
      assigned_to_user_id: "usr-sales-00001",
      assigned_to_name: "Somying Srisuk",
      assigned_by_user_id: "usr-executive-00001",
      assigned_at: "2026-04-03T10:00:00Z",
      status,
      notes,
    }));
  });

  it("renders assigned lead data and submits updates through the lead service", async () => {
    render(<SalesLeadDevelopmentPanel />);

    expect(await screen.findByText("Siriporn Chantarak")).toBeInTheDocument();
    expect(screen.getByText("Assigned")).toBeInTheDocument();
    expect(await screen.findByText("Navavej Premium Preventive Plus")).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByRole("combobox"), "scheduled");
    await userEvent.clear(screen.getByRole("textbox"));
    await userEvent.type(screen.getByRole("textbox"), "Consult booked for Friday.");
    await userEvent.click(screen.getByRole("button", { name: "Update lead" }));

    await waitFor(() => {
      expect(mockLeadService.updateLeadStatus).toHaveBeenCalledWith("lead_001", "scheduled", "Consult booked for Friday.");
    });
  });
});
