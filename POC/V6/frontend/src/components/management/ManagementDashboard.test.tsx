import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ManagementDashboard } from "./ManagementDashboard";

vi.mock("@/shared/auth-context", () => ({
  useAuth: () => ({
    user: { name: "Wanchai Thongchai", role: "executive", fhir_scopes: [] },
    logout: vi.fn(),
  }),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

describe("ManagementDashboard", () => {
  it("shows the executive badge in the header", () => {
    render(<ManagementDashboard />);

    expect(screen.getByText("executive")).toBeInTheDocument();
  });

  it("renders the conversion funnel and updates its summary when the range changes", async () => {
    render(<ManagementDashboard />);

    expect(screen.getByText("AI-to-Purchase Conversion Pipeline")).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.textContent === "2,156 / 3,847")).toBeInTheDocument();
    expect(screen.getByText("All Time")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "1W" }));

    expect(screen.getByText((_, element) => element?.textContent === "98 / 245")).toBeInTheDocument();
    expect(screen.getByText("1 Week")).toBeInTheDocument();
  });
});
