import React from "react";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "./Sidebar";

const mockPathname = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

vi.mock("@/shared/auth-context", () => ({
  useAuth: () => ({ user: { name: "System Admin", role: "sysadmin", fhir_scopes: [] }, logout: vi.fn() }),
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
});
