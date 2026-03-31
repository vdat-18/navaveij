import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RecommendationPanel } from "./RecommendationPanel";
import { clinicalService } from "@/services/api";
import { RecommendationResponse } from "@/types/recommendation";

vi.mock("@/services/api", () => ({
  clinicalService: {
    getRecommendation: vi.fn(),
    getRecommendationStream: vi.fn(),
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
  risk_summary: {
    source: "signal_store",
    is_fallback: false,
    description: "Overall at-a-glance health risk level based on clinical signal severity.",
    signal_store_pipeline_run_id: "pipe_001",
    signals_fired_count: 3,
  },
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
    mockClinicalService.getRecommendationStream.mockImplementation(
      async (_patientToken: string, _forceRuleBased: boolean, handlers?: { onStage?: (stage: number, label: string) => void }) => {
        handlers?.onStage?.(1, "Fetching patient data");
        return makeResponse();
      }
    );
  });

  it("renders loading workflow steps while recommendation request is pending", async () => {
    let resolveRecommendation: ((value: RecommendationResponse) => void) | null = null;
    const pendingRecommendation = new Promise<RecommendationResponse>((resolve) => {
      resolveRecommendation = resolve;
    });
    mockClinicalService.getRecommendationStream.mockImplementation(
      async (_patientToken: string, _forceRuleBased: boolean, handlers?: { onStage?: (stage: number, label: string) => void }) => {
        handlers?.onStage?.(1, "Fetching patient data");
        return pendingRecommendation;
      }
    );

    render(
      <RecommendationPanel
        patientId="p-1"
        patientToken="tok-1"
        privacyMode={false}
        isRuleBasedForced={false}
      />
    );

    expect(await screen.findByText("Synthesizing Clinical Intelligence")).toBeInTheDocument();
    expect(screen.getByTestId("hero-loading-bar")).toBeInTheDocument();
    expect(screen.getByTestId("compact-loading-steps")).toBeInTheDocument();
    expect(screen.getByText("Fetching clinical constraints")).toBeInTheDocument();
    expect(screen.getByText("Loading clinical signals")).toBeInTheDocument();
    expect(screen.getByText("Validating safety rules")).toBeInTheDocument();

    resolveRecommendation?.(makeResponse());
    expect(await screen.findByText("Strategy Assignment")).toBeInTheDocument();
  });

  it("shows insufficient critical signals instead of fabricated alerts", async () => {
    mockClinicalService.getRecommendationStream.mockResolvedValue(makeResponse());

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
    mockClinicalService.getRecommendationStream.mockResolvedValue(makeResponse({ overall_risk_level: level }));

    render(
      <RecommendationPanel
        patientId="p-1"
        patientToken="tok-1"
        privacyMode={false}
        isRuleBasedForced={false}
      />
    );

    expect(await screen.findByText(level)).toBeInTheDocument();
    expect(screen.getByText(`${level} Risk Level`)).toBeInTheDocument();
    expect(screen.queryByText("Active Monitoring")).not.toBeInTheDocument();
  });

  it("renders numeric confidence percentage from confidence_score", async () => {
    mockClinicalService.getRecommendationStream.mockResolvedValue(makeResponse({ confidence_score: 0.87, confidence_tier: "High" }));

    render(
      <RecommendationPanel
        patientId="p-1"
        patientToken="tok-1"
        privacyMode={false}
        isRuleBasedForced={false}
      />
    );

    expect(await screen.findByText("87%")).toBeInTheDocument();
    expect(screen.getByText("High Tier")).toBeInTheDocument();
  });

  it("shows fallback risk badge and displays risk summary toast on button click", async () => {
    mockClinicalService.getRecommendationStream.mockResolvedValue(
      makeResponse({
        risk_summary: {
          source: "signal_store_fallback",
          is_fallback: true,
          description: "Risk is currently marked as Low by fallback because complete signal-store context is unavailable.",
          signal_store_pipeline_run_id: "",
          signals_fired_count: 0,
        },
      })
    );

    render(
      <RecommendationPanel
        patientId="p-1"
        patientToken="tok-1"
        privacyMode={false}
        isRuleBasedForced={false}
      />
    );

    expect(await screen.findByText("Fallback Risk Data")).toBeInTheDocument();
    const tooltipTrigger = screen.getByRole("button", { name: "Risk summary information" });
    await userEvent.click(tooltipTrigger);
    const statusToasts = screen.getAllByRole("status");
    const toast = statusToasts.find((candidate) => within(candidate).queryByText("Risk Summary"));
    expect(toast).toBeDefined();
    expect(toast).toHaveTextContent("Risk Summary");
    expect(toast).toHaveTextContent("Risk is currently marked as Low by fallback because complete signal-store context is unavailable.");
    expect(toast).toHaveTextContent("Source: signal_store_fallback.");
    expect(toast?.className).toContain("absolute");
    expect(toast?.className).toContain("top-full");
  });

  it("calls recordDecision with selected patient and recommendation hash", async () => {
    mockClinicalService.getRecommendationStream.mockResolvedValue(makeResponse({ recommendation_hash: "hash-999" }));
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
    mockClinicalService.getRecommendationStream.mockResolvedValue(
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
    mockClinicalService.getRecommendationStream.mockResolvedValue(makeResponse());

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
    mockClinicalService.getRecommendationStream.mockResolvedValue(
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
  it("renders package seals, package detail reveal, and bottom consultation summary", async () => {
    mockClinicalService.getRecommendationStream.mockResolvedValue(makeResponse({ ai_recommended_tier: "Advanced" }));

    render(
      <RecommendationPanel
        patientId="p-1"
        patientToken="tok-1"
        privacyMode={false}
        isRuleBasedForced={false}
      />
    );

    expect((await screen.findAllByText("Advanced")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Platinum Seal")).toHaveLength(2);
    expect(screen.getByText("Consultation Summary")).toBeInTheDocument();

    const detailToggle = screen.getByRole("button", { name: /View Package Detail/i });
    await userEvent.click(detailToggle);

    expect(screen.getAllByText("Selected Tier").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Diamond Plus Center")).not.toHaveLength(0);
    expect(screen.getAllByText("Recommendation Source").length).toBeGreaterThan(0);
  });

  it("renders add-ons in grouped single-column accordions sorted by risk", async () => {
    mockClinicalService.getRecommendationStream.mockResolvedValue(
      makeResponse({
        add_ons: [
          {
            item_code: "ADD-LOW",
            item_id: "addon-low",
            label: "Low Priority Add-on",
            priority_level: "Green",
            rationale: "Routine screening follow-up.",
            category: "Metabolic",
            product_code: "MET-1",
            price_thb: 1200,
            trigger_signals_matched: ["mild_risk"],
          },
          {
            item_code: "ADD-HIGH",
            item_id: "addon-high",
            label: "High Priority Add-on",
            priority_level: "Red",
            rationale: "Escalated due to critical cardiometabolic pattern.",
            category: "Cardiac",
            product_code: "CAR-9",
            price_thb: 4500,
            trigger_signals_matched: ["ldl_high", "bp_stage2_htn"],
          },
        ],
      })
    );

    render(
      <RecommendationPanel
        patientId="p-1"
        patientToken="tok-1"
        privacyMode={false}
        isRuleBasedForced={false}
      />
    );

    expect(await screen.findByText("Cardiac")).toBeInTheDocument();
    expect(screen.getByText("Metabolic")).toBeInTheDocument();
    const screeningCards = screen.getAllByRole("button", { name: /High Priority Add-on|Low Priority Add-on/i });
    expect(screeningCards[0]).toHaveTextContent("High Priority Add-on");

    await userEvent.click(screeningCards[0]);
    expect(screen.getByText("AI Rationale")).toBeInTheDocument();
    expect(screen.getByText("Escalated due to critical cardiometabolic pattern.")).toBeInTheDocument();
    expect(screen.getByText("Product · CAR-9")).toBeInTheDocument();
    expect(screen.getByText("ldl_high")).toBeInTheDocument();
  });

  it("does not show the intrusive critical-signal toast even when critical alerts exist", async () => {
    mockClinicalService.getRecommendationStream.mockResolvedValue(
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
        privacyMode={false}
        isRuleBasedForced={false}
      />
    );

    expect(await screen.findByText("Renal Risk")).toBeInTheDocument();
    expect(screen.queryByText("Critical Context Available")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View Trend & Timeline" })).not.toBeInTheDocument();
  });
});
