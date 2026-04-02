import React from "react";
import { render } from "@testing-library/react";
import TrendTimelinePage from "./page";
import { PatientProvider } from "@/shared/patient-context";

vi.mock("@/shared/privacy-mode", () => ({
  usePrivacyMode: () => ({
    privacyMode: false,
    togglePrivacyMode: vi.fn(),
  }),
}));

const mockReplace = vi.fn();

vi.mock("@/shared/auth-context", () => ({
  useAuth: () => ({ user: { name: "System Admin", role: "sysadmin", fhir_scopes: [] }, logout: vi.fn() }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
}));

vi.mock("@/components/dashboard/PatientDirectoryColumn", () => ({
  PatientDirectoryColumn: () => <div data-testid="patient-directory-column" />,
}));

vi.mock("@/components/trend-timeline/TrendTimelineScreen", () => ({
  TrendTimelineScreen: () => <div data-testid="trend-timeline-screen" />,
}));

describe("TrendTimelinePage", () => {
  it("redirects all authenticated users to their home screen (no role has Trend & Timeline)", () => {
    render(<PatientProvider><TrendTimelinePage /></PatientProvider>);

    expect(mockReplace).toHaveBeenCalledWith("/access-monitoring");
  });
});
