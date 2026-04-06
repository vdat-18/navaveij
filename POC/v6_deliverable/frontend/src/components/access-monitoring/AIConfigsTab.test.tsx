import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AIConfigsTab } from "./AIConfigsTab";
import { clinicalService, ClientPromptsResponse, SystemConfig } from "@/services/api";

vi.mock("@/services/api", async () => {
  const actual = await vi.importActual<typeof import("@/services/api")>("@/services/api");
  return {
    ...actual,
    clinicalService: {
      ...actual.clinicalService,
      validateClient: vi.fn(),
      setActiveClient: vi.fn(),
      getClientPrompts: vi.fn(),
    },
  };
});

const mockedClinicalService = vi.mocked(clinicalService);

const baseConfig: SystemConfig = {
  active_client: "OpenAIClient",
  template_version: "v1",
  auth_mode: "rbac",
  mcp_tools: [],
  all_clients: [
    { name: "OpenAIClient", provider: "openai", model: "gpt-5.4-mini", status: "active" },
    { name: "AnthropicClient", provider: "anthropic", model: "claude-sonnet", status: "standby" },
    { name: "OpenRouterClient", provider: "openrouter", model: "deepseek", status: "standby" },
  ],
};

function makePromptsResponse(
  clientName: string,
  templates: Record<string, string> = {
    analyze_clinical_risks: "Analyze prompt text",
    match_policy: "Match policy prompt text",
    write_narrative: "Narrative prompt text",
    annotate_reasoning_lines: "Annotate prompt text",
  }
): ClientPromptsResponse {
  return {
    client_name: clientName,
    template_version: `${clientName}-v1`,
    templates,
  };
}

describe("AIConfigsTab", () => {
  beforeEach(() => {
    mockedClinicalService.validateClient.mockResolvedValue({
      client_name: "AnthropicClient",
      valid: true,
      latency_ms: 25,
      error: null,
    });
    mockedClinicalService.setActiveClient.mockResolvedValue({
      active_client: "AnthropicClient",
      template_version: "v2",
    });
    mockedClinicalService.getClientPrompts.mockResolvedValue(makePromptsResponse("OpenAIClient"));
  });

  it("fetches prompts for the active client on mount and renders the section", async () => {
    render(<AIConfigsTab config={baseConfig} onActiveClientChange={vi.fn()} />);

    expect(screen.getByText("Prompts Mgnt")).toBeInTheDocument();
    await waitFor(() => {
      expect(mockedClinicalService.getClientPrompts).toHaveBeenCalledWith("OpenAIClient");
    });

    expect(await screen.findByText("OpenAIClient-v1")).toBeInTheDocument();
  });

  it("switches clients from the dropdown and refetches prompts", async () => {
    mockedClinicalService.getClientPrompts
      .mockResolvedValueOnce(makePromptsResponse("OpenAIClient"))
      .mockResolvedValueOnce(makePromptsResponse("AnthropicClient"));

    render(<AIConfigsTab config={baseConfig} onActiveClientChange={vi.fn()} />);

    const select = await screen.findByRole("combobox");
    await userEvent.selectOptions(select, "AnthropicClient");

    await waitFor(() => {
      expect(mockedClinicalService.getClientPrompts).toHaveBeenLastCalledWith("AnthropicClient");
    });
    expect(await screen.findByText("AnthropicClient-v1")).toBeInTheDocument();
  });

  it("supports single-expand accordion behavior", async () => {
    render(<AIConfigsTab config={baseConfig} onActiveClientChange={vi.fn()} />);

    const analyzeButton = await screen.findByRole("button", { name: /analyze clinical risks/i });
    const matchButton = screen.getByRole("button", { name: /match policy/i });

    expect(screen.queryByText("Analyze prompt text")).not.toBeInTheDocument();
    await userEvent.click(analyzeButton);
    expect(screen.getByText("Analyze prompt text")).toBeInTheDocument();

    await userEvent.click(matchButton);
    expect(screen.getByText("Match policy prompt text")).toBeInTheDocument();
    expect(screen.queryByText("Analyze prompt text")).not.toBeInTheDocument();

    await userEvent.click(matchButton);
    expect(screen.queryByText("Match policy prompt text")).not.toBeInTheDocument();
  });

  it("resets the expanded item and selected client when active client changes", async () => {
    const { rerender } = render(<AIConfigsTab config={baseConfig} onActiveClientChange={vi.fn()} />);

    const select = await screen.findByRole("combobox");
    await userEvent.click(screen.getByRole("button", { name: /analyze clinical risks/i }));
    expect(screen.getByText("Analyze prompt text")).toBeInTheDocument();

    mockedClinicalService.getClientPrompts.mockResolvedValueOnce(makePromptsResponse("AnthropicClient"));

    rerender(
      <AIConfigsTab
        config={{ ...baseConfig, active_client: "AnthropicClient", template_version: "v2" }}
        onActiveClientChange={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(mockedClinicalService.getClientPrompts).toHaveBeenLastCalledWith("AnthropicClient");
    });
    expect(select).toHaveValue("AnthropicClient");
    expect(screen.queryByText("Analyze prompt text")).not.toBeInTheDocument();
  });

  it("renders an error state when prompt loading fails", async () => {
    mockedClinicalService.getClientPrompts.mockRejectedValueOnce(new Error("Prompt fetch failed"));

    render(<AIConfigsTab config={baseConfig} onActiveClientChange={vi.fn()} />);

    expect(await screen.findByText("Prompt fetch failed")).toBeInTheDocument();
  });

  it("renders an empty state when the selected client has no templates", async () => {
    mockedClinicalService.getClientPrompts.mockResolvedValueOnce(makePromptsResponse("OpenAIClient", {}));

    render(<AIConfigsTab config={baseConfig} onActiveClientChange={vi.fn()} />);

    expect(await screen.findByText("No prompt templates available for this client.")).toBeInTheDocument();
  });

  it("keeps the existing inspect modal working independently", async () => {
    render(<AIConfigsTab config={baseConfig} onActiveClientChange={vi.fn()} />);

    const inspectButtons = await screen.findAllByRole("button", { name: "Inspect" });
    await userEvent.click(inspectButtons[0]);

    const dialogText = await screen.findByText("Prompt Templates");
    const modal = dialogText.closest("div");
    expect(modal).toBeInTheDocument();
    expect(screen.getByText("Analyze prompt text")).toBeInTheDocument();

    const closeButton = screen.getByRole("button", { name: "Close" });
    await userEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText("Prompt Templates")).not.toBeInTheDocument();
    });
  });

  it("orders known prompt keys before unknown keys", async () => {
    mockedClinicalService.getClientPrompts.mockResolvedValueOnce(
      makePromptsResponse("OpenAIClient", {
        custom_summary: "Custom summary prompt",
        write_narrative: "Narrative prompt text",
        match_policy: "Match policy prompt text",
        analyze_clinical_risks: "Analyze prompt text",
      })
    );

    render(<AIConfigsTab config={baseConfig} onActiveClientChange={vi.fn()} />);

    await screen.findByRole("button", { name: "Analyze Clinical Risks" });

    const accordionLabels = screen
      .getAllByRole("button")
      .map((button) => button.getAttribute("aria-label") ?? button.textContent?.trim() ?? "")
      .filter((label) =>
        ["Analyze Clinical Risks", "Match Policy", "Write Narrative", "custom_summary"].includes(label)
      );

    expect(accordionLabels).toEqual([
      "Analyze Clinical Risks",
      "Match Policy",
      "Write Narrative",
      "custom_summary",
    ]);
  });
});
