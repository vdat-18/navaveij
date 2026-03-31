import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage from "./page";
import { PatientProvider } from "@/shared/patient-context";

vi.mock("@/shared/privacy-mode", () => ({
  usePrivacyMode: () => ({
    privacyMode: true,
    togglePrivacyMode: vi.fn(),
  }),
}));

vi.mock("@/shared/auth-context", () => ({
  useAuth: () => ({ user: { name: "Dr. Test", role: "physician", fhir_scopes: [] }, logout: vi.fn() }),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/dashboard/PatientDirectoryColumn", () => ({
  PatientDirectoryColumn: ({ onSelectPatient }: { onSelectPatient: (patient: unknown) => void }) => (
    <button
      data-testid="patient-directory-column"
      onClick={() =>
        onSelectPatient({
          patient_id: "id_1aa1b504",
          patient_name: "Jane Privacy",
          patient_token: "tok_hmac_1aa1b504",
        })
      }
    >
      Select Patient
    </button>
  ),
}));

vi.mock("@/components/dashboard/RecommendationPanel", () => ({
  RecommendationPanel: ({
    patientToken,
    onRecommendationLoad,
  }: {
    patientToken?: string | null;
    onRecommendationLoad?: (data: unknown) => void;
  }) => {
    React.useEffect(() => {
      if (!patientToken) return;
      onRecommendationLoad?.({
        security_metadata: { is_poc_demo: true },
        metadata: { generated_at: "2026-03-19T00:00:00Z" },
      });
    }, [patientToken]);
    return <div>Recommendation Panel Mock</div>;
  },
}));

describe("DashboardPage privacy display", () => {
  it("shows '-' for all PII fields in privacy mode", async () => {
    render(<PatientProvider><DashboardPage /></PatientProvider>);

    expect(screen.getByTestId("patient-directory-column")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Select Patient" }));

    const dashValues = await screen.findAllByText("-");
    expect(dashValues.length).toBeGreaterThan(0);

    // Medical ID remains visible even in privacy mode
    expect(screen.getByText("id_1aa1b504")).toBeInTheDocument();

    // All other PII fields are hidden; no tokens exposed
    expect(screen.queryByText(/^tok_/)).not.toBeInTheDocument();
    expect(screen.queryByText("Jane Privacy")).not.toBeInTheDocument();
  });
});
