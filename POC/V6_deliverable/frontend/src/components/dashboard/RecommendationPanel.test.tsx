import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecommendationPanel, clearRecommendationCache } from "./RecommendationPanel";
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
  reasoning_trace_annotated: [],
  supporting_signals: [],
  missing_signals: [],
  communication_script: {
    opening: "Start",
    clinical_conclusion: "Conclusion",
    summary_headline_highlights: [],
    top_findings: [],
    program_justification: "Explain.",
    program_justification_highlights: [],
    priority_add_ons: [],
    next_actions: [],
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
    clearRecommendationCache();
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
          priority_add_ons: [
            { label: "Overdue Colonoscopy", severity: "critical" },
            { label: "Influenza Vaccine", severity: "caution" },
            { label: "Exercise Stress Test for ASCVD risk", severity: "moderate" },
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

    expect(await screen.findByText("Medical Screening Add-ons")).toBeInTheDocument();
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

  it("renders highlight chips for named diagnoses supplied via top_findings highlight_terms", async () => {
    mockStreamRecommendation(
      makeResponse({
        communication_script: {
          top_findings: [
            {
              text: "Stage 2 Hypertension is worsening (SBP 151 mmHg) and Prediabetes Confirmed is progressing (Fasting glucose 115.8 mg/dL, HbA1c 6.3%).",
              highlight_terms: ["Stage 2 Hypertension", "Prediabetes Confirmed"],
            },
            {
              text: "Family History of Premature CAD increases cardiovascular risk.",
              highlight_terms: ["Family History of Premature CAD"],
            },
          ],
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
    // Decimal values not in highlight_terms remain as plain text, not split
    expect(container.textContent).toContain("115.8 mg/dL");
    expect(container.textContent).toContain("6.3%");
  });

  it("highlights blood pressure values supplied via top_findings highlight_terms", async () => {
    mockStreamRecommendation(
      makeResponse({
        communication_script: {
          top_findings: [
            {
              text: "Stage 1 Hypertension (BP 135 / 87 mmHg) is present.",
              highlight_terms: ["135 / 87 mmHg"],
            },
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

  it("renders without error when reasoning_trace_annotated is absent", async () => {
    mockStreamRecommendation(
      makeResponse({
        reasoning_trace: "Blood pressure elevated.",
        reasoning_trace_annotated: undefined,
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

    // Panel renders without crashing; reasoning sections are empty
    expect(await screen.findByText("Clinical Conclusion")).toBeInTheDocument();
    expect(screen.queryByText("Policy Reasoning")).not.toBeInTheDocument();
  });

  it("renders new CommunicationScript fields when provided", async () => {
    mockStreamRecommendation(
      makeResponse({
        communication_script: {
          summary_headline: "Elevated cardiovascular risk requiring active management.",
          summary_headline_highlights: ["cardiovascular risk"],
          top_findings: [
            { text: "Stage 1 Hypertension confirmed.", highlight_terms: ["Stage 1 Hypertension"] },
            { text: "Prediabetes trajectory worsening.", highlight_terms: ["Prediabetes"] },
          ],
          program_justification: "Premium tier covers all required cardiovascular and metabolic monitoring.",
          program_justification_highlights: [],
          priority_add_ons: [
            { label: "Exercise Stress Test for ASCVD risk", severity: "caution" },
            { label: "Kidney Disease Screening", severity: "moderate" },
          ],
          next_actions: [
            { text: "Schedule follow-up in 3 months.", highlight_terms: [] },
            { text: "Begin antihypertensive therapy.", highlight_terms: ["antihypertensive therapy"] },
          ],
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
    // "Stage 1 Hypertension" is a chip; "confirmed." is plain text — both in textContent
    expect(container.textContent).toContain("Stage 1 Hypertension confirmed");
    expect(container.textContent).toContain("Prediabetes trajectory worsening");
    expect(container.textContent).toContain("Premium tier covers all required cardiovascular");
    expect(container.textContent).toContain("Schedule follow-up in 3 months");
  });
});
