import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuditLogSearchPanel } from "./AuditLogSearchPanel";
import { AuditLogEntry } from "@/types/access-monitoring";

vi.mock("@/shared/privacy-mode", () => ({
  usePrivacyMode: () => ({ privacyMode: false, togglePrivacyMode: vi.fn() }),
}));

const entry: AuditLogEntry = {
  entry_id: "e1",
  prev_entry_hash: "prev",
  sha256_hash: "hash",
  who: { user_id: "u1", user_role: "sysadmin", user_display_name: "System Admin", department: "Ops" },
  when: { iso_timestamp_utc: new Date().toISOString(), local_timestamp_ict: new Date().toISOString() },
  where: { service_id: "svc", source_ip_hash: "10.0.x.x", request_id: "req-1", user_agent_class: "web" },
  what: {
    action_type: "View",
    resource_type: "record",
    patient_token: null,
    patient_token_masked: "tok-***",
    patient_id: null,
    model_id: null,
    template_version: null,
    latency_ms: null,
    safety_validator_result: null,
    recommendation_source: null,
  },
  why: { request_context: "test", indication_code: "care" },
  retention_expiry: "2099-01-01",
};

const llmEntry: AuditLogEntry = {
  ...entry,
  entry_id: "e2",
  what: {
    action_type: "LLMRequest",
    resource_type: "RecommendationOutput",
    patient_token: null,
    patient_token_masked: null,
    patient_id: null,
    active_client: "OpenAIClient",
    model_id: "gpt-5.4-mini",
    model_provider: "openai",
    template_version: "openai-v1",
    latency_ms: 27,
    safety_validator_result: null,
    recommendation_source: "AI",
    function_name: "AnalyzeClinicalRisks",
    prompt_template_key: "analyze_clinical_risks",
    input_trace_masked: {
      system_prompt: "prompt::analyze",
      clinical_signals: { signals_fired: ["bp_elevated"] },
    },
    output_trace_masked: {
      severity_assessment: "Moderate risk requiring monitoring.",
    },
  },
};

describe("AuditLogSearchPanel", () => {
  it("shows HTTPS warning when crypto.subtle is unavailable", async () => {
    Object.defineProperty(globalThis, "crypto", {
      value: {},
      configurable: true,
    });

    render(
      <AuditLogSearchPanel
        entries={[entry]}
        total={1}
        filters={{}}
        onFilterChange={vi.fn()}
        onSearch={vi.fn(async () => undefined)}
      />
    );

    await userEvent.click(screen.getByText(entry.who.user_id));
    await userEvent.click(screen.getByRole("button", { name: "Verify Hash" }));

    expect(await screen.findByText("Hash verification requires a secure (HTTPS) connection")).toBeInTheDocument();
  });

  it("renders resolved runtime identity for LLMRequest entries", async () => {
    render(
      <AuditLogSearchPanel
        entries={[llmEntry]}
        total={1}
        filters={{}}
        onFilterChange={vi.fn()}
        onSearch={vi.fn(async () => undefined)}
      />
    );

    await userEvent.click(screen.getByText("u1"));

    expect(screen.getByText("AnalyzeClinicalRisks")).toBeInTheDocument();
    expect(screen.getByText("OpenAIClient · openai")).toBeInTheDocument();
    expect(screen.getByText("gpt-5.4-mini · openai-v1 · 27ms")).toBeInTheDocument();
    expect(screen.getByText("Template key:")).toBeInTheDocument();
    expect(screen.getByText("analyze_clinical_risks")).toBeInTheDocument();
  });

  it("opens a modal inspector for masked LLM request traces", async () => {
    render(
      <AuditLogSearchPanel
        entries={[llmEntry]}
        total={1}
        filters={{}}
        onFilterChange={vi.fn()}
        onSearch={vi.fn(async () => undefined)}
      />
    );

    await userEvent.click(screen.getByText("u1"));
    await userEvent.click(screen.getByRole("button", { name: "Inspect LLM Request" }));

    const dialog = screen.getByRole("dialog", { name: "LLM Request Trace Inspector" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("request id")).toBeInTheDocument();
    expect(within(dialog).getByText("req-1")).toBeInTheDocument();
    expect(within(dialog).getByText(/masked input trace/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/masked output trace/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/bp_elevated/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Moderate risk requiring monitoring/)).toBeInTheDocument();
  });
});
