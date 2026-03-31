import React from "react";
import { render, screen } from "@testing-library/react";
import { PatientDirectoryColumn } from "./PatientDirectoryColumn";

vi.mock("./PatientList", () => ({
  PatientList: () => <div data-testid="patient-list" />,
}));

describe("PatientDirectoryColumn", () => {
  it("renders canonical wrapper classes and patient list", () => {
    render(
      <PatientDirectoryColumn
        onSelectPatient={vi.fn()}
        selectedId="id_1"
        privacyMode={true}
      />
    );

    const patientList = screen.getByTestId("patient-list");
    expect(patientList).toBeInTheDocument();
    expect(patientList.parentElement).toHaveClass(
      "bg-[#fcfdfe]",
      "p-4",
      "rounded-[20px]",
      "border",
      "border-navavej-border",
      "min-h-[600px]",
      "shadow-inner"
    );
    expect(patientList.parentElement?.parentElement).toHaveClass("xl:col-span-2");
  });
});
