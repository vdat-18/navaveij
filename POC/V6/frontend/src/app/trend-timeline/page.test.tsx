import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TrendTimelinePage from "./page";
import { PatientProvider } from "@/shared/patient-context";

vi.mock("@/shared/privacy-mode", () => ({
  usePrivacyMode: () => ({
    privacyMode: false,
    togglePrivacyMode: vi.fn(),
  }),
}));

vi.mock("@/shared/auth-context", () => ({
  useAuth: () => ({ user: { name: "Dr. Test", role: "admin", fhir_scopes: [] }, logout: vi.fn() }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

const trendScreenMock = vi.fn();

vi.mock("@/components/dashboard/PatientDirectoryColumn", () => ({
  PatientDirectoryColumn: ({ onSelectPatient }: { onSelectPatient: (patient: unknown) => void }) => (
    <button
      data-testid="patient-directory-column"
      onClick={() =>
        onSelectPatient({
          patient_id: "id_2bb2c608",
          patient_name: "Trend Patient",
          patient_token: "tok_hmac_2bb2c608",
        })
      }
    >
      Select Trend Patient
    </button>
  ),
}));

vi.mock("@/components/trend-timeline/TrendTimelineScreen", () => ({
  TrendTimelineScreen: (props: unknown) => {
    trendScreenMock(props);
    return <div data-testid="trend-timeline-screen" />;
  },
}));

describe("TrendTimelinePage", () => {
  it("uses shared patient directory column and renders trend screen after selection", async () => {
    render(<PatientProvider><TrendTimelinePage /></PatientProvider>);

    expect(screen.getByTestId("patient-directory-column")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Select Trend Patient" }));

    expect(await screen.findByTestId("trend-timeline-screen")).toBeInTheDocument();
    expect(trendScreenMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        patientName: "Trend Patient",
        patientId: "id_2bb2c608",
        patientToken: "tok_hmac_2bb2c608",
      })
    );
  });
});
