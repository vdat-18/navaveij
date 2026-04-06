import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AIConfigsTab } from "./AIConfigsTab";
import { clinicalService, HealthCheckResponse, SystemConfig } from "@/services/api";

vi.mock("@/services/api", async () => {
  const actual = await vi.importActual<typeof import("@/services/api")>("@/services/api");
  return {
    ...actual,
    clinicalService: {
      ...actual.clinicalService,
      healthCheck: vi.fn(),
      setActiveClient: vi.fn(),
      getClientPrompts: vi.fn(),
      updateClientPrompts: vi.fn(),
      resetClientPrompts: vi.fn(),
    },
  };
});

const mockedClinicalService = vi.mocked(clinicalService);

const config: SystemConfig = {
  active_client: "GeminiClient",
  all_clients: [
    { name: "GeminiClient", provider: "google-ai", model: "gemini-3-flash-preview", status: "active" },
    { name: "OpenAIClient", provider: "openai", model: "gpt-5.4-mini", status: "standby" },
  ],
  mcp_tools: [],
  auth_mode: "smart_on_fhir_demo",
  template_version: "gemini-v1",
};

const okResult: HealthCheckResponse = {
  client_name: "OpenAIClient",
  status: "ok",
  provider: "openai",
  model_id: "gpt-5.4-mini",
  template_version: "openai-v1",
  latency_ms: 18,
  error_message: null,
};

function makePromptsResponse(
  clientName: string,
  templateVersion = "openai-v1",
  templates: Record<string, string> = {
    analyze_clinical_risks: "  original prompt  ",
    match_policy: "policy prompt",
    write_narrative: "narrative prompt",
    annotate_reasoning_lines: "annotate prompt",
  }
) {
  return {
    client_name: clientName,
    template_version: templateVersion,
    templates,
  };
}

describe("AIConfigsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedClinicalService.healthCheck.mockResolvedValue(okResult);
    mockedClinicalService.setActiveClient.mockResolvedValue({
      active_client: "OpenAIClient",
      template_version: "openai-v1",
    });
    mockedClinicalService.getClientPrompts.mockResolvedValue(makePromptsResponse("OpenAIClient"));
    mockedClinicalService.updateClientPrompts.mockResolvedValue({
      client_name: "OpenAIClient",
      template_version: "demo-v2",
      templates: {
        analyze_clinical_risks: "  updated prompt  ",
      },
    });
    mockedClinicalService.resetClientPrompts.mockResolvedValue({
      client_name: "OpenAIClient",
      template_version: "openai-v1",
      templates: {
        analyze_clinical_risks: "  original prompt  ",
      },
    });
  });

  it("keeps Set Active disabled until a health check passes", () => {
    render(<AIConfigsTab config={config} onActiveClientChange={vi.fn()} />);

    const setActiveButton = screen.getByRole("button", { name: "Set Active" });
    expect(setActiveButton).toBeDisabled();
  });

  it("runs health check and enables Set Active on success", async () => {
    render(<AIConfigsTab config={config} onActiveClientChange={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Test" }));

    expect(mockedClinicalService.healthCheck).toHaveBeenCalledWith("OpenAIClient");
    expect(await screen.findByRole("button", { name: "Set Active" })).toBeEnabled();
    expect(screen.getByText(/18ms/i)).toBeInTheDocument();
  });

  it("shows retry state and keeps Set Active disabled after a failed health check", async () => {
    mockedClinicalService.healthCheck.mockResolvedValue({
      client_name: "OpenAIClient",
      status: "error",
      provider: null,
      model_id: null,
      template_version: null,
      latency_ms: null,
      error_message: "provider down",
    });

    render(<AIConfigsTab config={config} onActiveClientChange={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Test" }));

    expect(await screen.findByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Set Active" })).toBeDisabled();
    expect(screen.getByText("provider down")).toBeInTheDocument();
  });

  it("shows a blocking message when the health-check service is unavailable", async () => {
    mockedClinicalService.healthCheck.mockRejectedValueOnce(
      new Error("Health check service unavailable. Backend may be outdated or needs restart.")
    );

    render(<AIConfigsTab config={config} onActiveClientChange={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Test" }));

    expect(
      await screen.findByText("Health check service unavailable. Backend may be outdated or needs restart.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Set Active" })).toBeDisabled();
    expect(
      screen.getByText(/switching still requires a successful validation check/i)
    ).toBeInTheDocument();
  });

  it("sets the active client and refreshes after a successful test", async () => {
    const onActiveClientChange = vi.fn().mockResolvedValue(undefined);
    render(<AIConfigsTab config={config} onActiveClientChange={onActiveClientChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Test" }));
    await userEvent.click(await screen.findByRole("button", { name: "Set Active" }));

    expect(mockedClinicalService.setActiveClient).toHaveBeenCalledWith("OpenAIClient");
    await waitFor(() => expect(onActiveClientChange).toHaveBeenCalled());
  });

  it("shows the prompt management section and fetches active-client prompts on mount", async () => {
    mockedClinicalService.getClientPrompts.mockResolvedValueOnce(
      makePromptsResponse("GeminiClient", "gemini-v1", {
        analyze_clinical_risks: "gemini analyze",
      })
    );

    render(<AIConfigsTab config={config} onActiveClientChange={vi.fn()} />);

    expect(screen.getByText("Prompts Mgnt")).toBeInTheDocument();
    await waitFor(() => expect(mockedClinicalService.getClientPrompts).toHaveBeenCalledWith("GeminiClient"));
    expect(await screen.findByText("gemini-v1")).toBeInTheDocument();
  });

  it("switches prompt clients from the inline dropdown and refetches prompts", async () => {
    mockedClinicalService.getClientPrompts
      .mockResolvedValueOnce(makePromptsResponse("GeminiClient", "gemini-v1"))
      .mockResolvedValueOnce(makePromptsResponse("OpenAIClient", "openai-v1"));

    render(<AIConfigsTab config={config} onActiveClientChange={vi.fn()} />);

    const selects = await screen.findAllByRole("combobox");
    await userEvent.selectOptions(selects[0], "OpenAIClient");

    await waitFor(() => expect(mockedClinicalService.getClientPrompts).toHaveBeenLastCalledWith("OpenAIClient"));
    expect(await screen.findByText("openai-v1")).toBeInTheDocument();
  });

  it("supports single-expand accordion behavior in the inline prompt section", async () => {
    mockedClinicalService.getClientPrompts.mockResolvedValueOnce(
      makePromptsResponse("GeminiClient", "gemini-v1", {
        analyze_clinical_risks: "gemini analyze",
        match_policy: "gemini policy",
      })
    );

    render(<AIConfigsTab config={config} onActiveClientChange={vi.fn()} />);

    const analyzeButton = await screen.findByRole("button", { name: "Analyze Clinical Risks" });
    const matchButton = screen.getByRole("button", { name: "Match Policy" });

    expect(screen.queryByText("gemini analyze")).not.toBeInTheDocument();
    await userEvent.click(analyzeButton);
    expect(screen.getByText("gemini analyze")).toBeInTheDocument();

    await userEvent.click(matchButton);
    expect(screen.getByText("gemini policy")).toBeInTheDocument();
    expect(screen.queryByText("gemini analyze")).not.toBeInTheDocument();
  });

  it("resets expanded prompt state when the inline dropdown changes clients", async () => {
    mockedClinicalService.getClientPrompts
      .mockResolvedValueOnce(makePromptsResponse("GeminiClient", "gemini-v1", { analyze_clinical_risks: "gemini analyze" }))
      .mockResolvedValueOnce(makePromptsResponse("OpenAIClient", "openai-v1", { analyze_clinical_risks: "openai analyze" }));

    render(<AIConfigsTab config={config} onActiveClientChange={vi.fn()} />);

    const selects = await screen.findAllByRole("combobox");
    await userEvent.click(screen.getByRole("button", { name: "Analyze Clinical Risks" }));
    expect(screen.getByText("gemini analyze")).toBeInTheDocument();

    await userEvent.selectOptions(selects[0], "OpenAIClient");

    await waitFor(() => expect(mockedClinicalService.getClientPrompts).toHaveBeenLastCalledWith("OpenAIClient"));
    expect(screen.queryByText("gemini analyze")).not.toBeInTheDocument();
  });

  it("shows inline prompt loading errors", async () => {
    mockedClinicalService.getClientPrompts.mockRejectedValueOnce(new Error("Prompt fetch failed"));

    render(<AIConfigsTab config={config} onActiveClientChange={vi.fn()} />);

    expect(await screen.findByText("Prompt fetch failed")).toBeInTheDocument();
  });

  it("shows an empty message when no inline prompt templates are available", async () => {
    mockedClinicalService.getClientPrompts.mockResolvedValueOnce(
      makePromptsResponse("GeminiClient", "gemini-v1", {})
    );

    render(<AIConfigsTab config={config} onActiveClientChange={vi.fn()} />);

    expect(await screen.findByText("No prompt templates available for this client.")).toBeInTheDocument();
  });

  it("orders known prompt keys before unknown keys in the inline accordion", async () => {
    mockedClinicalService.getClientPrompts.mockResolvedValueOnce(
      makePromptsResponse("GeminiClient", "gemini-v1", {
        custom_summary: "custom summary",
        write_narrative: "narrative prompt",
        match_policy: "policy prompt",
        analyze_clinical_risks: "analyze prompt",
      })
    );

    render(<AIConfigsTab config={config} onActiveClientChange={vi.fn()} />);

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

  it("enters inline edit mode and saves prompt changes from the accordion section", async () => {
    const onActiveClientChange = vi.fn().mockResolvedValue(undefined);
    mockedClinicalService.getClientPrompts.mockResolvedValueOnce(
      makePromptsResponse("GeminiClient", "gemini-v1", {
        analyze_clinical_risks: "gemini analyze",
        match_policy: "gemini policy",
      })
    );
    mockedClinicalService.updateClientPrompts.mockResolvedValueOnce(
      makePromptsResponse("GeminiClient", "gemini-v2", {
        analyze_clinical_risks: "gemini analyze updated",
        match_policy: "gemini policy",
      })
    );

    render(<AIConfigsTab config={config} onActiveClientChange={onActiveClientChange} />);

    await screen.findByText("gemini-v1");
    await userEvent.click(screen.getByRole("button", { name: "Edit Prompts" }));
    await userEvent.click(screen.getByRole("button", { name: "Analyze Clinical Risks" }));

    const versionInput = screen.getByLabelText("Inline Template Version");
    await userEvent.clear(versionInput);
    await userEvent.type(versionInput, "gemini-v2");

    const promptInput = screen.getByRole("textbox", { name: "Analyze Clinical Risks" });
    await userEvent.clear(promptInput);
    await userEvent.type(promptInput, "gemini analyze updated");

    await userEvent.click(screen.getByRole("button", { name: "Save Inline Prompt Changes" }));

    expect(mockedClinicalService.updateClientPrompts).toHaveBeenCalledWith("GeminiClient", {
      version: "gemini-v2",
      templates: {
        analyze_clinical_risks: "gemini analyze updated",
        match_policy: "gemini policy",
      },
    });
    await waitFor(() => expect(onActiveClientChange).toHaveBeenCalled());
    expect(await screen.findByText("gemini-v2")).toBeInTheDocument();
    expect(screen.getByText("gemini analyze updated")).toBeInTheDocument();
  });

  it("cancels inline edits and restores the fetched prompt content", async () => {
    mockedClinicalService.getClientPrompts.mockResolvedValueOnce(
      makePromptsResponse("GeminiClient", "gemini-v1", {
        analyze_clinical_risks: "gemini analyze",
      })
    );

    render(<AIConfigsTab config={config} onActiveClientChange={vi.fn()} />);

    await screen.findByText("gemini-v1");
    await userEvent.click(screen.getByRole("button", { name: "Edit Prompts" }));
    await userEvent.click(screen.getByRole("button", { name: "Analyze Clinical Risks" }));

    const promptInput = screen.getByRole("textbox", { name: "Analyze Clinical Risks" });
    await userEvent.clear(promptInput);
    await userEvent.type(promptInput, "temporary inline draft");

    await userEvent.click(screen.getByRole("button", { name: "Cancel Inline Prompt Changes" }));

    expect(screen.queryByDisplayValue("temporary inline draft")).not.toBeInTheDocument();
    expect(screen.getByText("gemini analyze")).toBeInTheDocument();
  });

  it("resets inline prompt edits to defaults for the selected prompt client", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    mockedClinicalService.getClientPrompts.mockResolvedValueOnce(
      makePromptsResponse("GeminiClient", "gemini-v1", {
        analyze_clinical_risks: "gemini analyze",
      })
    );
    mockedClinicalService.resetClientPrompts.mockResolvedValueOnce(
      makePromptsResponse("GeminiClient", "gemini-default", {
        analyze_clinical_risks: "gemini default",
      })
    );

    render(<AIConfigsTab config={config} onActiveClientChange={vi.fn()} />);

    await screen.findByText("gemini-v1");
    await userEvent.click(screen.getByRole("button", { name: "Edit Prompts" }));
    await userEvent.click(screen.getByRole("button", { name: "Reset Inline Prompts to Default" }));

    expect(mockedClinicalService.resetClientPrompts).toHaveBeenCalledWith("GeminiClient");
    expect(await screen.findByText("gemini-default")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Analyze Clinical Risks" }));
    expect(screen.getByText("gemini default")).toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it("describes client switching without restart-required copy", () => {
    render(<AIConfigsTab config={config} onActiveClientChange={vi.fn()} />);

    expect(screen.getByText(/initialized at startup/i)).toBeInTheDocument();
    expect(screen.getAllByText(/successful validation check/i)).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Inspect" })).not.toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.textContent ===
          "Models are configured per client in .env. All configured clients initialize at startup; switching active inference still requires a successful validation check."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/remain read-only here/i)).not.toBeInTheDocument();
  });

  it("saves inline edited prompt templates and refreshes config", async () => {
    const onActiveClientChange = vi.fn().mockResolvedValue(undefined);
    mockedClinicalService.getClientPrompts.mockResolvedValueOnce(
      makePromptsResponse("GeminiClient", "gemini-v1", {
        analyze_clinical_risks: "gemini analyze",
        match_policy: "policy prompt",
        write_narrative: "narrative prompt",
        annotate_reasoning_lines: "annotate prompt",
      })
    );
    mockedClinicalService.updateClientPrompts.mockResolvedValueOnce(
      makePromptsResponse("GeminiClient", "demo-v2", {
        analyze_clinical_risks: "updated inline prompt",
        match_policy: "policy prompt",
        write_narrative: "narrative prompt",
        annotate_reasoning_lines: "annotate prompt",
      })
    );

    render(<AIConfigsTab config={config} onActiveClientChange={onActiveClientChange} />);

    await screen.findByText("gemini-v1");
    await userEvent.click(screen.getByRole("button", { name: "Edit Prompts" }));
    await userEvent.click(screen.getByRole("button", { name: "Analyze Clinical Risks" }));

    const versionInput = screen.getByLabelText("Inline Template Version");
    await userEvent.clear(versionInput);
    await userEvent.type(versionInput, "demo-v2");

    const promptInput = screen.getByRole("textbox", { name: "Analyze Clinical Risks" });
    await userEvent.clear(promptInput);
    await userEvent.type(promptInput, "updated inline prompt");

    await userEvent.click(screen.getByRole("button", { name: "Save Inline Prompt Changes" }));

    expect(mockedClinicalService.updateClientPrompts).toHaveBeenCalledWith("GeminiClient", {
      version: "demo-v2",
      templates: {
        analyze_clinical_risks: "updated inline prompt",
        match_policy: "policy prompt",
        write_narrative: "narrative prompt",
        annotate_reasoning_lines: "annotate prompt",
      },
    });
    await waitFor(() => expect(onActiveClientChange).toHaveBeenCalled());
    expect(await screen.findAllByText("demo-v2")).toHaveLength(1);
  });

  it("resets inline prompt templates to defaults", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    mockedClinicalService.getClientPrompts.mockResolvedValueOnce(
      makePromptsResponse("GeminiClient", "gemini-v1", {
        analyze_clinical_risks: "gemini analyze",
      })
    );
    mockedClinicalService.resetClientPrompts.mockResolvedValueOnce(
      makePromptsResponse("GeminiClient", "gemini-reset", {
        analyze_clinical_risks: "gemini reset prompt",
      })
    );

    render(<AIConfigsTab config={config} onActiveClientChange={vi.fn()} />);

    await screen.findByText("gemini-v1");
    await userEvent.click(screen.getByRole("button", { name: "Edit Prompts" }));
    await userEvent.click(screen.getByRole("button", { name: "Reset Inline Prompts to Default" }));

    expect(mockedClinicalService.resetClientPrompts).toHaveBeenCalledWith("GeminiClient");
    expect(await screen.findAllByText("gemini-reset")).toHaveLength(1);
    confirmSpy.mockRestore();
  });

  it("shows inline save errors and keeps edit mode open", async () => {
    mockedClinicalService.updateClientPrompts.mockRejectedValueOnce(new Error("save failed"));
    render(<AIConfigsTab config={config} onActiveClientChange={vi.fn()} />);

    await screen.findByText("openai-v1");
    await userEvent.click(screen.getByRole("button", { name: "Edit Prompts" }));
    await userEvent.click(screen.getByRole("button", { name: "Save Inline Prompt Changes" }));

    expect(await screen.findByText("save failed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Inline Prompt Changes" })).toBeInTheDocument();
  });
});
