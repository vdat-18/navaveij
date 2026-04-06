import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage from "./page";
import { PatientProvider } from "@/shared/patient-context";

let mockPrivacyMode = true;
let mockUser = { name: "Dr. Test", role: "physician", fhir_scopes: [] as string[] };
const mockLogout = vi.fn();
const mockReplace = vi.fn();

vi.mock("@/shared/privacy-mode", () => ({
  usePrivacyMode: () => ({
    privacyMode: mockPrivacyMode,
    togglePrivacyMode: vi.fn(),
  }),
}));

vi.mock("@/shared/auth-context", () => ({
  useAuth: () => ({ user: mockUser, logout: mockLogout }),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, back: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/dashboard/PatientSearchEntry", () => ({
  PatientSearchEntry: ({ onSelectPatient }: { onSelectPatient: (patient: unknown) => void }) => (
    <button
      type="button"
      onClick={() =>
        onSelectPatient({
          patient_id: "id_privacy_001",
          patient_name: "Jane Privacy",
          patient_token: "tok_hmac_privacy_001",
          age: 52,
          gender: "Female",
          ethnicity: "Thai",
          mrn: "MRN-12345",
          phone: "081-234-5678",
          email: "jane@example.com",
        })
      }
    >
      Load walk-in patient
    </button>
  ),
}));

vi.mock("@/components/dashboard/PatientDirectoryColumn", () => ({
  PatientDirectoryColumn: ({ selectedId }: { selectedId?: string }) => (
    <div data-testid="patient-directory-column">{selectedId ?? "no-selection"}</div>
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
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrivacyMode = true;
    mockUser = { name: "Dr. Test", role: "physician", fhir_scopes: [] };
    window.localStorage.clear();
  });

  it("shows '-' for all PII fields in privacy mode", async () => {
    render(<PatientProvider><DashboardPage /></PatientProvider>);

    await userEvent.click(screen.getByRole("button", { name: "Load walk-in patient" }));

    const dashValues = await screen.findAllByText("-");
    expect(dashValues.length).toBeGreaterThan(0);

    // Medical ID remains visible even in privacy mode
    expect(screen.getAllByText("id_privacy_001")).toHaveLength(2);

    // All other PII fields are hidden; no tokens exposed
    expect(screen.queryByText(/^tok_/)).not.toBeInTheDocument();
    expect(screen.queryByText("Jane Privacy")).not.toBeInTheDocument();
    expect(screen.getByText("Recommendation Panel Mock")).toBeInTheDocument();
  });

  it("lets sales users switch between walk-in and my leads views", async () => {
    mockPrivacyMode = false;
    mockUser = { name: "Somying Srisuk", role: "sales", fhir_scopes: [] };

    render(<PatientProvider><DashboardPage /></PatientProvider>);

    expect(screen.getByRole("button", { name: /Walk-in/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /My Leads/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Load walk-in patient" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /My Leads/ }));

    expect(screen.getByText("Sales Lead Development Panel Mock")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Walk-in/ }));

    expect(screen.getByRole("button", { name: "Load walk-in patient" })).toBeInTheDocument();
  });
});

vi.mock("@/components/leads/SalesLeadDevelopmentPanel", () => ({
  SalesLeadDevelopmentPanel: ({ onLeadCountChange }: { onLeadCountChange?: (count: number) => void }) => {
    React.useEffect(() => {
      onLeadCountChange?.(3);
    }, []);
    return <div>Sales Lead Development Panel Mock</div>;
  },
}));

vi.mock("@/components/trend-timeline/ScreeningGapStatus", () => ({
  ScreeningGapStatus: () => <div>Screening Gap Status Mock</div>,
}));

vi.mock("@/components/ClinicalDrawer", () => ({
  ClinicalDrawer: () => null,
}));
