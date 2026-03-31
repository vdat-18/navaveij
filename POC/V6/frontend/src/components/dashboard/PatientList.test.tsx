import React from "react";
import { render, screen } from "@testing-library/react";
import { PatientList } from "./PatientList";
import { patientService } from "@/services/api";

vi.mock("@/services/api", () => ({
  patientService: {
    getAll: vi.fn(),
  },
}));

vi.mock("@/shared/patient-context", () => ({
  usePatient: () => ({ selectedPatient: null, setSelectedPatient: vi.fn() }),
}));

const mockPatientService = vi.mocked(patientService);

describe("PatientList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows error state when patient API fails", async () => {
    mockPatientService.getAll.mockRejectedValue(new Error("Failed to load patients"));

    render(<PatientList onSelectPatient={vi.fn()} />);

    expect(await screen.findByText("Failed to load patients")).toBeInTheDocument();
    expect(screen.queryByText("No patients found")).not.toBeInTheDocument();
  });
});

