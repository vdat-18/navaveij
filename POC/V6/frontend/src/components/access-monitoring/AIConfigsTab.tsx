"use client";

import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Pencil, RotateCcw } from "lucide-react";
import { ClientPromptsResponse, HealthCheckResponse, SystemConfig } from "@/services/api";
import { clinicalService, HEALTH_CHECK_UNAVAILABLE_MESSAGE } from "@/services/api";

interface AIConfigsTabProps {
  config: SystemConfig;
  onActiveClientChange: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-navavej-teal/10 text-navavej-teal border border-navavej-teal/30",
  standby: "bg-navavej-gray-light text-navavej-gray-med border border-navavej-border",
  "fallback-chain": "bg-amber-50 text-amber-700 border border-amber-200",
};

const PROMPT_KEY_LABELS: Record<string, string> = {
  analyze_clinical_risks: "Analyze Clinical Risks",
  match_policy: "Match Policy",
  write_narrative: "Write Narrative",
  annotate_reasoning_lines: "Annotate Reasoning Lines",
};

const PROMPT_KEY_ORDER = [
  "analyze_clinical_risks",
  "match_policy",
  "write_narrative",
  "annotate_reasoning_lines",
];

export function AIConfigsTab({ config, onActiveClientChange }: AIConfigsTabProps) {
  const registryClients = config.all_clients.filter(
    (client) => client.name !== "ActiveModel" && client.status !== "fallback-chain"
  );

  const [settingActive, setSettingActive] = useState<string | null>(null);
  const [testingClient, setTestingClient] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, HealthCheckResponse>>({});
  const [healthCheckAvailabilityError, setHealthCheckAvailabilityError] = useState<string | null>(null);
  const [promptsClient, setPromptsClient] = useState(config.active_client);
  const [promptsData, setPromptsData] = useState<ClientPromptsResponse | null>(null);
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [promptsError, setPromptsError] = useState<string | null>(null);
  const [inlineEditMode, setInlineEditMode] = useState(false);
  const [inlineEditTemplates, setInlineEditTemplates] = useState<Record<string, string>>({});
  const [inlineEditVersion, setInlineEditVersion] = useState("");
  const [inlineSaving, setInlineSaving] = useState(false);
  const [inlineResetting, setInlineResetting] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const orderedPromptEntries = promptsData
    ? Object.entries(promptsData.templates).sort(([leftKey], [rightKey]) => {
        const leftIndex = PROMPT_KEY_ORDER.indexOf(leftKey);
        const rightIndex = PROMPT_KEY_ORDER.indexOf(rightKey);
        const normalizedLeft = leftIndex === -1 ? Number.POSITIVE_INFINITY : leftIndex;
        const normalizedRight = rightIndex === -1 ? Number.POSITIVE_INFINITY : rightIndex;
        if (normalizedLeft !== normalizedRight) return normalizedLeft - normalizedRight;
        return leftKey.localeCompare(rightKey);
      })
    : [];

  useEffect(() => {
    setPromptsClient(config.active_client);
    setPromptsData(null);
    setExpandedPrompt(null);
    setPromptsError(null);
    setInlineEditMode(false);
    setInlineEditTemplates({});
    setInlineEditVersion("");
    setInlineError(null);
  }, [config.active_client]);

  useEffect(() => {
    let isCancelled = false;

    setLoadingPrompts(true);
    setPromptsData(null);
    setPromptsError(null);

    clinicalService
      .getClientPrompts(promptsClient)
      .then((data) => {
        if (isCancelled) return;
        setPromptsData(data);
        setInlineEditTemplates(data.templates);
        setInlineEditVersion(data.template_version);
      })
      .catch((error) => {
        if (isCancelled) return;
        setPromptsError(error instanceof Error ? error.message : "Unable to load prompt templates.");
      })
      .finally(() => {
        if (isCancelled) return;
        setLoadingPrompts(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [promptsClient]);

  async function handleSetActive(clientName: string) {
    setSettingActive(clientName);
    try {
      await clinicalService.setActiveClient(clientName);
      setTestResults((current) => {
        const next = { ...current };
        delete next[clientName];
        return next;
      });
      onActiveClientChange();
    } finally {
      setSettingActive(null);
    }
  }

  async function handleTest(clientName: string) {
    setTestingClient(clientName);
    try {
      const result = await clinicalService.healthCheck(clientName);
      setHealthCheckAvailabilityError(null);
      setTestResults((current) => ({ ...current, [clientName]: result }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to validate client health.";
      if (message === HEALTH_CHECK_UNAVAILABLE_MESSAGE) {
        setHealthCheckAvailabilityError(message);
      }
      setTestResults((current) => ({
        ...current,
        [clientName]: {
          client_name: clientName,
          status: "error",
          provider: null,
          model_id: null,
          template_version: null,
          latency_ms: null,
          error_message: message,
        },
      }));
    } finally {
      setTestingClient(null);
    }
  }

  function handlePromptsClientChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setExpandedPrompt(null);
    setInlineEditMode(false);
    setInlineEditTemplates({});
    setInlineEditVersion("");
    setInlineError(null);
    setPromptsClient(event.target.value);
  }

  function handleStartInlineEdit() {
    if (!promptsData) return;
    setInlineEditMode(true);
    setInlineEditTemplates(promptsData.templates);
    setInlineEditVersion(promptsData.template_version);
    setInlineError(null);
  }

  function handleCancelInlineEdit() {
    setInlineEditMode(false);
    setInlineError(null);
    if (promptsData) {
      setInlineEditTemplates(promptsData.templates);
      setInlineEditVersion(promptsData.template_version);
    }
  }

  async function handleSaveInlinePrompts() {
    if (!promptsData) return;
    setInlineSaving(true);
    setInlineError(null);
    try {
      const data = await clinicalService.updateClientPrompts(promptsData.client_name, {
        version: inlineEditVersion,
        templates: inlineEditTemplates,
      });
      setPromptsData(data);
      setInlineEditTemplates(data.templates);
      setInlineEditVersion(data.template_version);
      setInlineEditMode(false);
      await onActiveClientChange();
    } catch (error) {
      setInlineError(error instanceof Error ? error.message : "Unable to save prompt changes.");
    } finally {
      setInlineSaving(false);
    }
  }

  async function handleResetInlinePrompts() {
    if (!promptsData || !window.confirm("Reset all prompts to YAML defaults?")) return;
    setInlineResetting(true);
    setInlineError(null);
    try {
      const data = await clinicalService.resetClientPrompts(promptsData.client_name);
      setPromptsData(data);
      setInlineEditTemplates(data.templates);
      setInlineEditVersion(data.template_version);
      setInlineEditMode(false);
      await onActiveClientChange();
    } catch (error) {
      setInlineError(error instanceof Error ? error.message : "Unable to reset prompt changes.");
    } finally {
      setInlineResetting(false);
    }
  }

  return (
    <div className="space-y-5">
      {healthCheckAvailabilityError && (
        <div className="navavej-card bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-[11px] font-black uppercase tracking-widest text-amber-800">Validation Check Unavailable</p>
          <p className="mt-2 text-xs font-medium text-amber-900">
            {healthCheckAvailabilityError} Switching still requires a successful validation check before <span className="font-mono">Set Active</span> can be used.
          </p>
        </div>
      )}

      {/* Active AI Model */}
      <div className="navavej-card bg-white border border-navavej-border rounded-lg p-5">
        <p className="text-[10px] font-black text-navavej-gray-med uppercase tracking-widest mb-3">Active AI Model</p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="px-4 py-1.5 rounded-full bg-navavej-teal text-white text-sm font-black uppercase tracking-widest">
            {config.active_client}
          </span>
          <span className="px-3 py-1 rounded-full bg-navavej-gray-light text-navavej-gray-dark text-xs font-bold border border-navavej-border">
            Template {config.template_version}
          </span>
        </div>
        <p className="mt-2 text-[10px] font-medium text-navavej-gray-med">
          <span className="font-mono">AI_ACTIVE_CLIENT</span> in <span className="font-mono">.env</span> sets the initial active client on boot. All configured clients are initialized at startup, and switching active inference here still requires a successful validation check.
          Valid values: <span className="font-mono">GeminiClient | OpenAIClient | AnthropicClient | OpenRouterClient | LocalHostedClient</span>
        </p>
      </div>

      {/* BAML Client Registry */}
      <div className="navavej-card bg-white border border-navavej-border rounded-lg p-5">
        <p className="text-[10px] font-black text-navavej-gray-med uppercase tracking-widest mb-3">BAML Client Registry</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-navavej-border">
                <th className="text-left font-black text-navavej-gray-med uppercase tracking-wider py-2 pr-4">Client</th>
                <th className="text-left font-black text-navavej-gray-med uppercase tracking-wider py-2 pr-4">Provider</th>
                <th className="text-left font-black text-navavej-gray-med uppercase tracking-wider py-2 pr-4">Model</th>
                <th className="text-left font-black text-navavej-gray-med uppercase tracking-wider py-2 pr-4">Status</th>
                <th className="text-left font-black text-navavej-gray-med uppercase tracking-wider py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navavej-border">
              {registryClients.map((client) => {
                const isActive = client.name === config.active_client;
                const isSetting = settingActive === client.name;
                const isTesting = testingClient === client.name;
                const testResult = testResults[client.name];
                const hasPassingTest = testResult?.status === "ok";
                const hasFailedTest = testResult?.status === "error";
                return (
                  <tr key={client.name} className={isActive ? "bg-navavej-teal/5" : ""}>
                    <td className="py-2.5 pr-4 font-mono font-bold text-navavej-gray-dark">
                      {isActive && <span className="mr-1.5 text-navavej-teal">✓</span>}
                      {client.name}
                    </td>
                    <td className="py-2.5 pr-4 text-navavej-gray-med">{client.provider}</td>
                    <td className="py-2.5 pr-4 font-mono text-navavej-gray-med truncate max-w-[220px]" title={`${client.model} — configured per client in .env; all configured clients initialize at startup`}>
                      {client.model}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${STATUS_STYLES[client.status] ?? STATUS_STYLES.standby}`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Set Active button */}
                        {isActive ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-navavej-teal bg-navavej-teal/10 border border-navavej-teal/30 cursor-default">
                            Active
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleTest(client.name)}
                              disabled={isTesting || isSetting || settingActive !== null}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                hasPassingTest
                                  ? "border-emerald-300 text-emerald-700 bg-emerald-50"
                                  : hasFailedTest
                                    ? "border-navavej-red/30 text-navavej-red hover:bg-navavej-red/5"
                                    : "border-amber-300 text-amber-700 hover:bg-amber-50"
                              }`}
                            >
                              {isTesting ? "Validating…" : hasPassingTest ? "Tested" : hasFailedTest ? "Retry" : "Test"}
                            </button>
                            <button
                              onClick={() => handleSetActive(client.name)}
                              disabled={!hasPassingTest || isTesting || isSetting || settingActive !== null}
                              className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-navavej-teal text-navavej-teal hover:bg-navavej-teal hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {isSetting ? "Setting…" : "Set Active"}
                            </button>
                          </>
                        )}
                        {hasPassingTest && testResult?.latency_ms !== null && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {testResult.latency_ms}ms
                          </span>
                        )}
                        {hasFailedTest && testResult?.error_message && (
                          <span className="text-[10px] font-bold text-navavej-red">
                            {testResult.error_message}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[10px] font-medium text-navavej-gray-med">
          Models are configured per client in <span className="font-mono">.env</span>. All configured clients initialize at startup; switching active inference still requires a successful validation check.
        </p>
      </div>

      {/* Prompt Management */}
      <div className="navavej-card bg-white border border-navavej-border rounded-lg p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="space-y-2">
            <p className="text-[10px] font-black text-navavej-gray-med uppercase tracking-widest">Prompts Mgnt</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-navavej-gray-med uppercase tracking-widest">Client</span>
              <select
                aria-label="Prompt client"
                value={promptsClient}
                onChange={handlePromptsClientChange}
                className="px-3 py-2 border border-navavej-border rounded-lg text-xs font-bold outline-none bg-white focus:border-navavej-teal/50 cursor-pointer"
              >
                {registryClients.map((client) => (
                  <option key={client.name} value={client.name}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {inlineEditMode ? (
              <>
                <input
                  aria-label="Inline Template Version"
                  value={inlineEditVersion}
                  onChange={(event) => setInlineEditVersion(event.target.value)}
                  className="px-3 py-1 rounded-full bg-white text-navavej-gray-dark text-xs font-bold border border-navavej-border min-w-[140px]"
                />
                <button
                  type="button"
                  onClick={handleCancelInlineEdit}
                  disabled={inlineSaving || inlineResetting}
                  className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-navavej-gray-light text-navavej-gray-dark border border-navavej-border hover:bg-navavej-border transition-colors disabled:opacity-40"
                >
                  Cancel Inline Prompt Changes
                </button>
                <button
                  type="button"
                  onClick={handleSaveInlinePrompts}
                  disabled={inlineSaving || inlineResetting}
                  className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-navavej-teal text-white border border-navavej-teal hover:opacity-90 transition-colors disabled:opacity-40"
                >
                  {inlineSaving ? "Saving…" : "Save Inline Prompt Changes"}
                </button>
                <button
                  type="button"
                  onClick={handleResetInlinePrompts}
                  disabled={inlineSaving || inlineResetting}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border border-navavej-border text-navavej-gray-dark hover:border-navavej-gray-dark transition-colors disabled:opacity-40"
                >
                  <RotateCcw className="w-3 h-3" />
                  {inlineResetting ? "Resetting…" : "Reset Inline Prompts to Default"}
                </button>
              </>
            ) : (
              <>
                <span className="px-3 py-1 rounded-full bg-navavej-gray-light text-navavej-gray-dark text-xs font-bold border border-navavej-border">
                  {promptsData?.template_version ?? config.template_version}
                </span>
                <button
                  type="button"
                  onClick={handleStartInlineEdit}
                  disabled={!promptsData || loadingPrompts}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border border-navavej-border text-navavej-gray-dark hover:border-navavej-gray-dark transition-colors disabled:opacity-40"
                >
                  <Pencil className="w-3 h-3" />
                  Edit Prompts
                </button>
              </>
            )}
          </div>
        </div>

        {inlineError && (
          <div className="rounded-lg border border-navavej-red/30 bg-navavej-red/5 px-4 py-3 mb-4">
            <p className="text-xs font-bold text-navavej-red">{inlineError}</p>
          </div>
        )}

        {loadingPrompts ? (
          <div className="rounded-lg border border-navavej-border bg-navavej-gray-light/30 px-4 py-6">
            <p className="text-xs font-bold text-navavej-gray-med">Loading prompt templates...</p>
          </div>
        ) : promptsError ? (
          <div className="rounded-lg border border-navavej-red/30 bg-navavej-red/5 px-4 py-6">
            <p className="text-xs font-bold text-navavej-red">{promptsError}</p>
          </div>
        ) : orderedPromptEntries.length === 0 ? (
          <div className="rounded-lg border border-navavej-border bg-navavej-gray-light/30 px-4 py-6">
            <p className="text-xs font-bold text-navavej-gray-med">No prompt templates available for this client.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-navavej-border divide-y divide-navavej-border overflow-hidden">
            {orderedPromptEntries.map(([key, text]) => {
              const isExpanded = expandedPrompt === key;
              return (
                <div key={key} className="bg-white">
                  <button
                    type="button"
                    aria-label={PROMPT_KEY_LABELS[key] ?? key}
                    onClick={() => setExpandedPrompt(isExpanded ? null : key)}
                    className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-navavej-gray-light/30 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-navavej-teal flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-navavej-gray-med flex-shrink-0" />
                    )}
                    <span className="text-xs font-black text-navavej-gray-dark">
                      {PROMPT_KEY_LABELS[key] ?? key}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4">
                      {inlineEditMode ? (
                        <textarea
                          aria-label={PROMPT_KEY_LABELS[key] ?? key}
                          value={inlineEditTemplates[key] ?? ""}
                          onChange={(event) =>
                            setInlineEditTemplates((current) => ({ ...current, [key]: event.target.value }))
                          }
                          className="w-full min-h-[220px] text-[11px] font-mono text-navavej-gray-dark bg-navavej-gray-light/60 border border-navavej-border rounded-lg p-4 leading-relaxed resize-y"
                          style={{ whiteSpace: "pre" }}
                        />
                      ) : (
                        <pre className="text-[11px] font-mono text-navavej-gray-dark bg-navavej-gray-light/60 border border-navavej-border rounded-lg p-4 whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto">
                          {text}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
