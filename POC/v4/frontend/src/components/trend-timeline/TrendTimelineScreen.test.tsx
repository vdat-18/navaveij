import React from "react";
import { render, screen } from "@testing-library/react";
import { TrendTimelineScreen } from "./TrendTimelineScreen";
import { clinicalService } from "@/services/api";

vi.mock("@/services/api", () => ({
  clinicalService: {
    getTimeline: vi.fn(),
    getBiomarkerTrends: vi.fn(),
    getScreeningGaps: vi.fn(),
  },
}));

vi.mock("./BiomarkerTrendGrid", () => ({
  BiomarkerTrendGrid: () => <div />,
}));

vi.mock("./ClinicalEventTimeline", () => ({
  ClinicalEventTimeline: () => <div />,
}));

vi.mock("./ScreeningGapStatus", () => ({
  ScreeningGapStatus: () => <div />,
}));

const mockClinicalService = vi.mocked(clinicalService);

describe("TrendTimelineScreen privacy mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClinicalService.getTimeline.mockResolvedValue({
      patient_token: "tok-1",
      timeline_span: {
        earliest_event_date: "2020-01-01",
        latest_event_date: "2024-01-01",
        total_years_covered: 5,
      },
      diagnoses: [],
      hospitalizations: [],
      significant_lab_events: [],
      screening_procedure_history: [],
      medication_changes: [],
      pipeline_run_id: "run-1",
      computed_at: "2024-01-01T00:00:00Z",
    });
    mockClinicalService.getBiomarkerTrends.mockResolvedValue({
      patient_token: "tok-1",
      bmi: { current: 0, unit: "kg/m²", trend_direction: "unknown", history: [] },
      blood_pressure: { unit: "mmHg", trend_direction: "unknown", history: [] },
      egfr: { current: 0, unit: "mL/min/1.73m2", loinc_code: "62238-1", trend_direction: "unknown", history: [] },
      labs: [],
      computed_at: "2024-01-01T00:00:00Z",
      pipeline_run_id: "run-1",
    });
    mockClinicalService.getScreeningGaps.mockResolvedValue({
      patient_token: "tok-1",
      screening_gaps: [],
      vaccination_gaps: [],
      computed_at: "2024-01-01T00:00:00Z",
      pipeline_run_id: "run-1",
    });
  });

  it("shows de-identified header text when privacy mode is enabled", async () => {
    render(
      <TrendTimelineScreen
        patientName="John Doe"
        patientId="P-001"
        patientToken="tok-1"
        privacyMode={true}
      />
    );

    expect(await screen.findByText("De-identified Patient • —")).toBeInTheDocument();
  });
});

