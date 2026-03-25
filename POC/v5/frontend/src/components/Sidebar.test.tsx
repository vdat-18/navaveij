import React from "react";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "./Sidebar";

const mockPathname = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
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

  it("marks the active link with aria-current page", () => {
    mockPathname.mockReturnValue("/trend-timeline");

    render(<Sidebar />);

    const link = screen.getByRole("link", { name: "Trend & Timeline" });
    expect(link).toHaveAttribute("aria-current", "page");
  });
});

