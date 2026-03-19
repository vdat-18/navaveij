import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage from "./page";

vi.mock("@/shared/privacy-mode", () => ({
  usePrivacyMode: () => ({
    privacyMode: true,
    togglePrivacyMode: vi.fn(),
  }),
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
        security_metadata: {
          rehydration_map: {
            tok_map_name_001: "Jane Privacy",
            tok_map_id_001: "id_1aa1b504",
          },
        },
        metadata: {
          generated_at: "2026-03-19T00:00:00Z",
        },
      });
    }, [patientToken]);
    return <div>Recommendation Panel Mock</div>;
  },
}));

describe("DashboardPage privacy display", () => {
  it("shows backend tokens and never renders placeholder entity tokens", async () => {
    render(<DashboardPage />);

    expect(screen.getByTestId("patient-directory-column")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Select Patient" }));

    expect(await screen.findByText("tok_map_name_001")).toBeInTheDocument();
    expect(screen.getByText("tok_hmac_1aa1b504")).toBeInTheDocument();
    expect(screen.queryByText("tok_name_entity")).not.toBeInTheDocument();
    expect(screen.queryByText("tok_id_entity")).not.toBeInTheDocument();
    expect(screen.queryByText("tok_mrn_entity")).not.toBeInTheDocument();
    expect(screen.queryByText("tok_phone_entity")).not.toBeInTheDocument();
    expect(screen.queryByText("tok_email_entity")).not.toBeInTheDocument();
  });
});
