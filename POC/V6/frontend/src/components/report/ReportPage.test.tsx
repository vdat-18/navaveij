import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReportPage } from "./ReportPage";
import type { ReportExportData } from "@/app/report/page";
import type { RecommendationResponse } from "@/types/recommendation";

const makeRecommendation = (overrides?: Partial<RecommendationResponse>): RecommendationResponse => ({
  overall_risk_level: "High",
  ai_recommended_tier: "Premium",
  tier_deviation_justification: null,
  add_ons: [
    {
      item_code: "ECG-01",
      item_id: "ecg",
      priority_level: "Orange",
      priority: "Orange",
      label: "Resting ECG",
      rationale: "Indicated for hypertension monitoring",
      price_thb: 800,
      category: "Cardiology",
    },
  ],
  reasoning_trace: "Patient presents with stage 1 hypertension and elevated BMI.",
  reasoning_trace_annotated: [],
  supporting_signals: ["Active Hypertension", "BMI > 25"],
  missing_signals: [],
  communication_script: {
    summary_headline: "Elevated cardiovascular risk",
    top_findings: [{ text: "Stage 1 Hypertension confirmed.", highlight_terms: [] }],
    program_justification: "Premium tier covers cardiovascular screening.",
    next_actions: [{ text: "Schedule follow-up in 3 months.", highlight_terms: [] }],
  },
  rule_preliminary_tier: "Premium",
  resolved_package: {
    package_name: "Diamond Plus Center",
    price_thb: 15000,
  },
  confidence_score: 0.82,
  confidence_tier: "High",
  review_required: false,
  recommendation_source: "hybrid",
  recommendation_hash: "abc123def456",
  patient_high_alert: { critical_signals: [] },
  ...overrides,
});

const makeReportData = (overrides?: Partial<ReportExportData>): ReportExportData => ({
  patient: {
    patient_id: "p-001",
    patient_name: "John Doe",
    patient_token: "tok-001",
    email: "john@example.com",
    mrn: "MRN-001",
    age: 45,
    gender: "Male",
  },
  recommendation: makeRecommendation(),
  generatedAt: "2026-03-30T10:00:00.000Z",
  ...overrides,
});

describe("ReportPage", () => {
  it("renders patient name and MRN", () => {
    render(<ReportPage data={makeReportData()} />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("MRN-001")).toBeInTheDocument();
  });

  it("renders risk badge with overall risk level", () => {
    render(<ReportPage data={makeReportData()} />);
    // Multiple "High" elements may appear (risk badge + confidence tier badge); assert at least one exists
    expect(screen.getAllByText("High").length).toBeGreaterThan(0);
  });

  it("renders recommended package tier and price", () => {
    render(<ReportPage data={makeReportData()} />);
    expect(screen.getByText("Premium")).toBeInTheDocument();
    expect(screen.getByText("Diamond Plus Center")).toBeInTheDocument();
    expect(screen.getByText("฿15,000")).toBeInTheDocument();
  });

  it("renders add-ons table with item label", () => {
    render(<ReportPage data={makeReportData()} />);
    expect(screen.getByText("Resting ECG")).toBeInTheDocument();
    expect(screen.getByText("Indicated for hypertension monitoring")).toBeInTheDocument();
  });

  it("renders Email to Patient link when patient has email", () => {
    render(<ReportPage data={makeReportData()} />);
    const link = screen.getByRole("link", { name: /email to patient/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", expect.stringContaining("mailto:john@example.com"));
  });

  it("does not render Email to Patient link when patient has no email", () => {
    const data = makeReportData({
      patient: {
        patient_id: "p-002",
        patient_name: "Jane Smith",
        patient_token: "tok-002",
      },
    });
    render(<ReportPage data={data} />);
    expect(screen.queryByRole("link", { name: /email to patient/i })).not.toBeInTheDocument();
  });

  it("hides Critical Alerts section when no Red add-ons present", () => {
    render(<ReportPage data={makeReportData()} />);
    expect(screen.queryByText("Critical Alerts")).not.toBeInTheDocument();
  });

  it("shows Critical Alerts section when Red add-on is present", () => {
    const data = makeReportData({
      recommendation: makeRecommendation({
        add_ons: [
          {
            item_code: "CARD-01",
            item_id: "card",
            priority_level: "Red",
            priority: "Red",
            label: "Urgent Cardiac Review",
            rationale: "Critical signal detected",
          },
        ],
      }),
    });
    render(<ReportPage data={data} />);
    expect(screen.getByText("Critical Alerts")).toBeInTheDocument();
    // Label appears in both Critical Alerts list and Add-ons table
    expect(screen.getAllByText("Urgent Cardiac Review").length).toBeGreaterThan(0);
  });

  it("renders AI reasoning trace content via fallback when no annotated lines", () => {
    render(<ReportPage data={makeReportData()} />);
    expect(screen.getByText(/Patient presents with stage 1 hypertension/)).toBeInTheDocument();
  });

  it("splits reasoning trace into Clinical Evidence and Policy Reasoning panels when annotated lines present", () => {
    const data = makeReportData({
      recommendation: makeRecommendation({
        reasoning_trace_annotated: [
          { text: "Elevated systolic BP detected.", scope: "clinical_reasoning", sentiment: "risk", highlight_terms: [] },
          { text: "Premium tier aligns with coverage policy.", scope: "policy_reasoning", sentiment: "neutral", highlight_terms: [] },
        ],
      }),
    });
    render(<ReportPage data={data} />);
    expect(screen.getByText("Clinical Evidence")).toBeInTheDocument();
    expect(screen.getByText("Policy Reasoning")).toBeInTheDocument();
    expect(screen.getByText("Elevated systolic BP detected.")).toBeInTheDocument();
    expect(screen.getByText("Premium tier aligns with coverage policy.")).toBeInTheDocument();
  });

  it("renders the disclaimer text", () => {
    render(<ReportPage data={makeReportData()} />);
    // Disclaimer text is split across inline elements; match on unique phrase within the paragraph
    expect(
      screen.getByText(/professional clinical judgment/i)
    ).toBeInTheDocument();
  });
});
