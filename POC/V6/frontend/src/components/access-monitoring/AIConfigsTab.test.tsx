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
      templates: {},
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

  it("sets the active client and refreshes after a successful test", async () => {
    const onActiveClientChange = vi.fn().mockResolvedValue(undefined);
    render(<AIConfigsTab config={config} onActiveClientChange={onActiveClientChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Test" }));
    await userEvent.click(await screen.findByRole("button", { name: "Set Active" }));

    expect(mockedClinicalService.setActiveClient).toHaveBeenCalledWith("OpenAIClient");
    await waitFor(() => expect(onActiveClientChange).toHaveBeenCalled());
  });
});
