import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RecommendationPanel } from "./RecommendationPanel";
import { clinicalService } from "@/services/api";
import { RecommendationResponse } from "@/types/recommendation";

vi.mock("@/services/api", () => ({
  clinicalService: {
    getRecommendation: vi.fn(),
    recordDecision: vi.fn(),
  },
}));

vi.mock("./BiomarkerCharts", () => ({
  BiomarkerCharts: () => <div data-testid="biomarker-charts" />,
}));

vi.mock("./LabResultsGrid", () => ({
  LabResultsGrid: () => <div data-testid="lab-results-grid" />,
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    path: (props: React.SVGProps<SVGPathElement>) => <path {...props} />,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockClinicalService = vi.mocked(clinicalService);

const makeResponse = (overrides?: Partial<RecommendationResponse>): RecommendationResponse => ({
  overall_risk_level: "High",
  ai_recommended_tier: "Premium",
  tier_deviation_justification: null,
  add_ons: [],
  reasoning_trace: "Clinical note",
  supporting_signals: [],
  missing_signals: [],
  communication_script: {
    opening: "Start",
    clinical_conclusion: "Conclusion",
    health_summary: "Summary.",
    recommendation_explanation: "Explain.",
    add_on_highlights: [],
    next_steps: "Next.",
  },
  rule_preliminary_tier: "Premium",
  resolved_package: {
    name: "Diamond Plus Center",
    price_thb: 15000,
  },
  confidence_score: 0.8,
  confidence_tier: "High",
  review_required: false,
  recommendation_source: "hybrid",
  recommendation_hash: "hash-123",
  patient_high_alert: {
    critical_signals: [],
  },
  biomarker_trends: {
    bmi: { history: [] },
    blood_pressure: { history: [] },
    labs: [],
  },
  security_metadata: {},
  metadata: {},
  ...overrides,
});

describe("RecommendationPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows insufficient critical signals instead of fabricated alerts", async () => {
    mockClinicalService.getRecommendation.mockResolvedValue(makeResponse());

    render(
      <RecommendationPanel
        patientId="p-1"
        patientToken="tok-1"
        privacyMode={false}
        isRuleBasedForced={false}
      />
    );

    expect(await screen.findByText("Insufficient data")).toBeInTheDocument();
  });

  it.each(["Critical", "High", "Medium", "Low"])("renders risk gauge label for %s", async (level) => {
    mockClinicalService.getRecommendation.mockResolvedValue(makeResponse({ overall_risk_level: level }));

    render(
      <RecommendationPanel
        patientId="p-1"
        patientToken="tok-1"
        privacyMode={false}
        isRuleBasedForced={false}
      />
    );

    expect(await screen.findByText(level)).toBeInTheDocument();
  });

  it("calls recordDecision with selected patient and recommendation hash", async () => {
    mockClinicalService.getRecommendation.mockResolvedValue(makeResponse({ recommendation_hash: "hash-999" }));
    mockClinicalService.recordDecision.mockResolvedValue({});

    render(
      <RecommendationPanel
        patientId="patient-42"
        patientToken="tok-1"
        privacyMode={false}
        isRuleBasedForced={false}
      />
    );

    const button = await screen.findByRole("button", { name: "Confirm Strategy" });
    await userEvent.click(button);

    await waitFor(() => {
      expect(mockClinicalService.recordDecision).toHaveBeenCalledWith(
        "patient-42",
        "hash-999",
        "Approve",
        ""
      );
    });
  });

  it("shows '-' for package name and price, and masked alert text when privacy mode is on", async () => {
    mockClinicalService.getRecommendation.mockResolvedValue(
      makeResponse({
        patient_high_alert: {
          critical_signals: [
            { label: "Renal Risk", severity: "Critical", clinical_note: "BUN rising rapidly" },
          ],
        },
      })
    );

    render(
      <RecommendationPanel
        patientId="p-1"
        patientToken="tok-1"
        privacyMode={true}
        isRuleBasedForced={false}
      />
    );

    // PII fields show "-" — not tokens
    expect(await screen.findAllByText("-")).not.toHaveLength(0);
    expect(screen.queryByText(/^tok_/)).not.toBeInTheDocument();
    expect(await screen.findByText("Masked Alert")).toBeInTheDocument();
    expect(screen.getByText("Masked Clinical Details")).toBeInTheDocument();
  });

  it("uses left-aligned clinical conclusion text instead of justified spacing", async () => {
    mockClinicalService.getRecommendation.mockResolvedValue(makeResponse());

    const { container } = render(
      <RecommendationPanel
        patientId="p-1"
        patientToken="tok-1"
        privacyMode={false}
        isRuleBasedForced={false}
      />
    );

    await screen.findByText("Clinical Conclusion");
    const clinicalConclusion = container.querySelector("p.text-sm.font-black.text-navavej-teal.leading-relaxed.italic");
    expect(clinicalConclusion).toBeInTheDocument();
    expect(clinicalConclusion).toHaveClass("text-left");
    expect(clinicalConclusion).not.toHaveClass("text-justify");
  });

  it("normalizes core insights tokens and keeps decimal values in one sentence", async () => {
    mockClinicalService.getRecommendation.mockResolvedValue(
      makeResponse({
        communication_script: {
          opening: "Start",
          clinical_conclusion: "Conclusion",
          health_summary:
            "bp_stage2_htn is worsening (SBP 151 mmHg, DBP 93 mmHg) and prediabetes_confirmed is progressing (Fasting glucose 115.8 mg/dL, HbA1c 6.3%). family_hx_premature_cad increases risk. LDL cholesterol has risen to **149.5 mg/dL** with low_hdl.",
          recommendation_explanation: "Explain.",
          add_on_highlights: [],
          next_steps: "Next.",
        },
      })
    );

    const { container } = render(
      <RecommendationPanel
        patientId="p-1"
        patientToken="tok-1"
        privacyMode={false}
        isRuleBasedForced={false}
      />
    );

    expect(await screen.findByText("Stage 2 Hypertension")).toBeInTheDocument();
    expect(screen.getByText("Prediabetes Confirmed")).toBeInTheDocument();
    expect(screen.getByText("Family History of Premature CAD")).toBeInTheDocument();
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
    expect(container.textContent).toContain("115.8 mg/dL");
    expect(container.textContent).toContain("6.3%");
    expect(screen.queryByText(/^3%\)\.$/)).not.toBeInTheDocument();
  });
});
