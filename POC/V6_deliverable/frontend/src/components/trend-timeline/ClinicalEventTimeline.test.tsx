import React from "react";
import { render, screen } from "@testing-library/react";

import { ClinicalEventTimeline } from "./ClinicalEventTimeline";
import { TimelinePayload } from "@/types/timeline";

describe("ClinicalEventTimeline default collapse", () => {
  it("starts with all date groups collapsed", () => {
    const timeline: TimelinePayload = {
      patient_token: "tok-1",
      timeline_span: {
        earliest_event_date: "2026-03-01",
        latest_event_date: "2026-03-02",
        total_years_covered: 1,
      },
      diagnoses: [],
      hospitalizations: [],
      significant_lab_events: [
        {
          event_id: "lab-001",
          date: "2026-03-01",
          loinc_code: "62238-1",
          label: "eGFR",
          value: 64.3,
          unit: "mL/min/1.73m2",
          interpretation: "A",
          threshold_crossed: "borderline",
        },
        {
          event_id: "lab-002",
          date: "2026-03-02",
          loinc_code: "1558-6",
          label: "Fasting Blood Glucose",
          value: 110,
          unit: "mg/dL",
          interpretation: "H",
          threshold_crossed: "above_high",
        },
      ],
      screening_procedure_history: [],
      medication_changes: [],
      pipeline_run_id: "run-1",
      computed_at: "2026-03-03T00:00:00Z",
    };

    render(<ClinicalEventTimeline timeline={timeline} startYear={2020} />);

    expect(screen.queryByText("eGFR")).not.toBeInTheDocument();
    expect(screen.queryByText("Fasting Blood Glucose")).not.toBeInTheDocument();

    expect(screen.getAllByText(/Point/).length).toBeGreaterThanOrEqual(2);
  });
});
