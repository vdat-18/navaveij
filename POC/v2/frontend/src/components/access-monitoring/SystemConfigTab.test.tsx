import React from "react";
import { render, screen } from "@testing-library/react";
import { SystemConfigTab } from "./SystemConfigTab";
import { SystemConfig } from "@/services/api";

const makeConfig = (): SystemConfig => ({
  active_client: "GPT4o",
  all_clients: [
    { name: "GPT4o", provider: "openai", model: "gpt-4o", status: "active" },
    { name: "Claude35Sonnet", provider: "anthropic", model: "claude-3-5-sonnet-20241022", status: "standby" },
    { name: "LogoProvider", provider: "custom", model: "model-x", status: "standby", provider_logo_url: "https://example.com/logo.png" },
  ],
  mcp_tools: [
    { name: "get_clinical_signals", type: "read-only", description: "Returns patient risk signals" },
  ],
  auth_mode: "smart_on_fhir_demo",
  template_version: "v1.0",
});

describe("SystemConfigTab", () => {
  it("renders AI Gateway label and removes Auth Configuration section", () => {
    render(<SystemConfigTab config={makeConfig()} />);

    expect(screen.getByText("AI Gateway")).toBeInTheDocument();
    expect(screen.queryByText("BAML Client Registry")).not.toBeInTheDocument();
    expect(screen.queryByText("Auth Configuration")).not.toBeInTheDocument();
  });

  it("renders provider logo badge or image for each client row", () => {
    const { container } = render(<SystemConfigTab config={makeConfig()} />);

    expect(screen.getByText("openai")).toBeInTheDocument();
    expect(screen.getByText("anthropic")).toBeInTheDocument();
    expect(screen.getByText("◎")).toBeInTheDocument();
    expect(screen.getByText("◈")).toBeInTheDocument();
    expect(container.querySelector('span[style*="background-image"]')).not.toBeNull();
  });
});
