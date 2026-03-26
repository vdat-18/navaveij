import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecommendationPanel } from "./RecommendationPanel";
import { clinicalService } from "@/services/api";
import { StageUpdate } from "@/services/api";
import { RecommendationResponse } from "@/types/recommendation";

vi.mock("@/services/api", () => ({
  clinicalService: {
    getRecommendation: vi.fn(),
    streamRecommendation: vi.fn(),
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
    rect: (props: React.SVGProps<SVGRectElement>) => <rect {...props} />,
    circle: (props: React.SVGProps<SVGCircleElement>) => <circle {...props} />,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockClinicalService = vi.mocked(clinicalService);

const mockStreamRecommendation = (response: RecommendationResponse) => {
  mockClinicalService.streamRecommendation.mockImplementation(async (_patientToken: string, onStage: (update: StageUpdate) => void) => {
    onStage({ stage: 1, label: "Loading" });
    return response;
  });
};

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
    mockStreamRecommendation(makeResponse());
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("shows the risk summary popover when clicked", async () => {
    mockStreamRecommendation(
      makeResponse({
        risk_summary: {
          source: "rule-engine",
          is_fallback: false,
          description: "Overall risk is High, primarily driven by Active Hypertension.",
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

    const button = await screen.findByRole("button", { name: "Risk Summary" });
    await userEvent.click(button);

    expect(await screen.findByRole("dialog", { name: "Risk Summary" })).toBeInTheDocument();
    expect(screen.getByText("Overall risk is High, primarily driven by Active Hypertension.")).toBeInTheDocument();
  });

  it("renames the add-on section and renders highlight severity with color-only labels", async () => {
    mockStreamRecommendation(
      makeResponse({
        communication_script: {
          opening: "Start",
          clinical_conclusion: "Conclusion",
          health_summary: "Summary.",
          recommendation_explanation: "Explain.",
          add_on_highlights: [
            "Overdue Colonoscopy (Red)",
            "Influenza Vaccine (Orange)",
            "Exercise Stress Test for ASCVD risk (Yellow)",
          ],
          next_steps: "Next.",
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

    expect(await screen.findByText("Medical Screening Add-ons")).toBeInTheDocument();
    expect(screen.getByText("Safety Reviewed")).toBeInTheDocument();
    expect(screen.getByText("Data Integrity")).toBeInTheDocument();
    expect(screen.getByText("Logic Review")).toBeInTheDocument();
    expect(screen.getByText("Overdue Colonoscopy")).toBeInTheDocument();
    expect(screen.getByText("Influenza Vaccine")).toBeInTheDocument();
    expect(screen.getByText("Exercise Stress Test for ASCVD risk")).toBeInTheDocument();
    expect(screen.queryByText(/\(Red\)|\(Orange\)|\(Yellow\)/)).not.toBeInTheDocument();
  });

  it("shows insufficient critical signals instead of fabricated alerts", async () => {
    mockStreamRecommendation(makeResponse());

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
    mockStreamRecommendation(makeResponse({ overall_risk_level: level }));

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
    mockStreamRecommendation(makeResponse({ recommendation_hash: "hash-999" }));
    mockClinicalService.recordDecision.mockResolvedValue({});

    render(
      <RecommendationPanel
        patientId="patient-42"
        patientToken="tok-1"
        privacyMode={false}
        isRuleBasedForced={false}
      />
    );

    const button = await screen.findByRole("button", { name: "CLOSE CLINICAL GAPS" });
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
    mockStreamRecommendation(
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
    mockStreamRecommendation(makeResponse());

    const { container } = render(
      <RecommendationPanel
        patientId="p-1"
        patientToken="tok-1"
        privacyMode={false}
        isRuleBasedForced={false}
      />
    );

    await screen.findByText("Clinical Conclusion");
    const clinicalConclusion = container.querySelector("p.text-sm.font-medium.text-navavej-gray-dark.leading-relaxed");
    expect(clinicalConclusion).toBeInTheDocument();
    expect(clinicalConclusion).toHaveClass("text-left");
    expect(clinicalConclusion).not.toHaveClass("text-justify");
  });

  it("normalizes core insights tokens and keeps decimal values in one sentence", async () => {
    mockStreamRecommendation(
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

  it("highlights blood pressure values even when spaces exist around the slash", async () => {
    mockStreamRecommendation(
      makeResponse({
        communication_script: {
          opening: "Start",
          clinical_conclusion: "Conclusion",
          health_summary: "Stage 1 Hypertension (BP 135 / 87 mmHg) is present.",
          recommendation_explanation: "Explain.",
          add_on_highlights: [],
          next_steps: "Next.",
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

    const valueChip = await screen.findByText("135 / 87 mmHg");
    expect(valueChip.tagName).toBe("STRONG");
  });

  it("renders clinical and policy reasoning lines from structured annotations", async () => {
    mockStreamRecommendation(
      makeResponse({
        reasoning_trace_annotated: [
          {
            text: "Blood pressure is elevated at 151/93 mmHg.",
            scope: "clinical_reasoning",
            sentiment: "risk",
            highlight_terms: ["151/93 mmHg"],
          },
          {
            text: "eGFR is within normal range.",
            scope: "clinical_reasoning",
            sentiment: "reassuring",
            highlight_terms: ["eGFR"],
          },
          {
            text: "Premium package selected based on hypertension and kidney risk profile.",
            scope: "policy_reasoning",
            sentiment: "informational",
            highlight_terms: ["Premium"],
          },
        ],
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

    // Clinical reasoning lines are visible (text may be split by highlight chips)
    await screen.findByText("Policy Reasoning");
    expect(container.textContent).toContain("Blood pressure is elevated at");
    expect(container.textContent).toContain("eGFR is within normal range");

    // Policy reasoning section is visible and contains the policy line
    expect(container.textContent).toContain("Premium package selected");
  });

  it("renders neutral sentiment lines with gray styling", async () => {
    mockStreamRecommendation(
      makeResponse({
        reasoning_trace_annotated: [
          {
            text: "Kidney function is within acceptable parameters.",
            scope: "clinical_reasoning",
            sentiment: "neutral",
            highlight_terms: [],
          },
        ],
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

    await screen.findByText("Clinical Logic & Rationale");
    // Neutral line is visible in the reasoning section
    expect(container.textContent).toContain("Kidney function is within acceptable parameters");
  });

  it("shows policy reasoning section on fallback path when raw trace contains policy prefix", async () => {
    mockStreamRecommendation(
      makeResponse({
        reasoning_trace: "Blood pressure elevated.\n- Policy reasoning: Premium selected due to hypertension.",
        reasoning_trace_annotated: undefined,
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

    expect(await screen.findByText("Policy Reasoning")).toBeInTheDocument();
    expect(container.textContent).toContain("Premium selected due to hypertension");
  });

  it("renders new CommunicationScript fields when provided", async () => {
    mockStreamRecommendation(
      makeResponse({
        communication_script: {
          summary_headline: "Elevated cardiovascular risk requiring active management.",
          top_findings: ["Stage 1 Hypertension confirmed.", "Prediabetes trajectory worsening."],
          program_justification: "Premium tier covers all required cardiovascular and metabolic monitoring.",
          priority_add_ons: ["Exercise Stress Test for ASCVD risk", "Kidney Disease Screening"],
          next_actions: ["Schedule follow-up in 3 months.", "Begin antihypertensive therapy."],
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

    await screen.findByText("Clinical Conclusion");
    expect(container.textContent).toContain("Elevated cardiovascular risk requiring active management");
    // "Stage 1 Hypertension" is human-readable prose from the LLM — should not be abbreviated
    expect(container.textContent).toContain("Stage 1 Hypertension confirmed");
    expect(container.textContent).toContain("Prediabetes trajectory worsening");
    expect(container.textContent).toContain("Premium tier covers all required cardiovascular");
    expect(container.textContent).toContain("Schedule follow-up in 3 months");
  });
});
