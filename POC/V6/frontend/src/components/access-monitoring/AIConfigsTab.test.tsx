import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

describe("AIConfigsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedClinicalService.healthCheck.mockResolvedValue(okResult);
    mockedClinicalService.setActiveClient.mockResolvedValue({
      active_client: "OpenAIClient",
      template_version: "openai-v1",
    });
    mockedClinicalService.getClientPrompts.mockResolvedValue({
      client_name: "OpenAIClient",
      template_version: "openai-v1",
      templates: {
        analyze_clinical_risks: "  original prompt  ",
      },
    });
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

  it("opens inspect mode without trimming prompt whitespace", async () => {
    render(<AIConfigsTab config={config} onActiveClientChange={vi.fn()} />);

    await userEvent.click(screen.getAllByRole("button", { name: "Inspect" })[1]);

    expect(mockedClinicalService.getClientPrompts).toHaveBeenCalledWith("OpenAIClient");
    expect(
      await screen.findByText((_, element) => element?.textContent === "  original prompt  ")
    ).toBeInTheDocument();
  });

  it("describes client switching without restart-required copy", () => {
    render(<AIConfigsTab config={config} onActiveClientChange={vi.fn()} />);

    expect(screen.getByText(/initialized at startup/i)).toBeInTheDocument();
    expect(screen.getAllByText(/successful validation check/i)).toHaveLength(2);
    expect(
      screen.getByText(
        (_, element) =>
          element?.textContent ===
          "Models are configured per client in .env. All configured clients initialize at startup; switching active inference still requires a successful validation check."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/remain read-only here/i)).not.toBeInTheDocument();
  });

  it("saves edited prompt templates and refreshes config", async () => {
    const onActiveClientChange = vi.fn().mockResolvedValue(undefined);
    render(<AIConfigsTab config={config} onActiveClientChange={onActiveClientChange} />);

    await userEvent.click(screen.getAllByRole("button", { name: "Inspect" })[1]);
    await userEvent.click(await screen.findByRole("button", { name: "Edit Prompts" }));

    const versionInput = screen.getByLabelText("Template Version");
    await userEvent.clear(versionInput);
    await userEvent.type(versionInput, "demo-v2");

    const promptInput = screen.getByLabelText("Analyze Clinical Risks");
    await userEvent.clear(promptInput);
    await userEvent.type(promptInput, "  updated prompt  ");

    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(mockedClinicalService.updateClientPrompts).toHaveBeenCalledWith("OpenAIClient", {
      version: "demo-v2",
      templates: {
        analyze_clinical_risks: "  updated prompt  ",
      },
    });
    await waitFor(() => expect(onActiveClientChange).toHaveBeenCalled());
    expect(await screen.findByText("demo-v2")).toBeInTheDocument();
  });

  it("resets prompt templates to defaults from edit mode", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<AIConfigsTab config={config} onActiveClientChange={vi.fn()} />);

    await userEvent.click(screen.getAllByRole("button", { name: "Inspect" })[1]);
    await userEvent.click(await screen.findByRole("button", { name: "Edit Prompts" }));
    await userEvent.click(screen.getByRole("button", { name: "Reset to Default" }));

    expect(mockedClinicalService.resetClientPrompts).toHaveBeenCalledWith("OpenAIClient");
    expect(await screen.findByText("openai-v1")).toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it("shows inline save errors and keeps edit mode open", async () => {
    mockedClinicalService.updateClientPrompts.mockRejectedValueOnce(new Error("save failed"));
    render(<AIConfigsTab config={config} onActiveClientChange={vi.fn()} />);

    await userEvent.click(screen.getAllByRole("button", { name: "Inspect" })[1]);
    await userEvent.click(await screen.findByRole("button", { name: "Edit Prompts" }));
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByText("save failed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
  });
});
