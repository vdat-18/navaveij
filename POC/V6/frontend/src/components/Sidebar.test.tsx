import React from "react";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "./Sidebar";

const mockPathname = vi.fn();
const mockLogout = vi.fn();
let mockUser = { name: "System Admin", role: "sysadmin", fhir_scopes: [] as string[] };

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

vi.mock("@/shared/auth-context", () => ({
  useAuth: () => ({ user: mockUser, logout: mockLogout }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ alt, ...props }: { alt: string }) => <img alt={alt} {...props} />,
}));

describe("Sidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { name: "System Admin", role: "sysadmin", fhir_scopes: [] };
  });

  it("renders the Configuration nav link for sysadmin users", () => {
    mockPathname.mockReturnValue("/access-monitoring");

    render(<Sidebar />);

    const link = screen.getByRole("link", { name: "Configuration" });
    expect(link).toHaveAttribute("href", "/configuration");
  });

  it("marks the active link with aria-current page", () => {
    mockPathname.mockReturnValue("/access-monitoring");

    render(<Sidebar />);

    const link = screen.getByRole("link", { name: "Access Monitoring" });
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("renders the Lead Assignment nav link for executive users only", () => {
    mockUser = { name: "Wanchai Thongchai", role: "executive", fhir_scopes: [] };
    mockPathname.mockReturnValue("/management");

    const { rerender } = render(<Sidebar />);

    expect(screen.getByRole("link", { name: "Lead Assignment" })).toHaveAttribute("href", "/lead-assignment");
    expect(screen.queryByRole("link", { name: "Configuration" })).not.toBeInTheDocument();

    mockUser = { name: "System Admin", role: "sysadmin", fhir_scopes: [] };
    rerender(<Sidebar />);

    expect(screen.queryByRole("link", { name: "Lead Assignment" })).not.toBeInTheDocument();
  });
});
