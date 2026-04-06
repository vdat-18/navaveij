"use client";

import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { ClientPromptsResponse, SystemConfig } from "@/services/api";
import { clinicalService } from "@/services/api";

interface AIConfigsTabProps {
  config: SystemConfig;
  role?: "sysadmin" | "executive";
  onActiveClientChange: () => void;
}

type ValidationState = "pending" | "running" | "ok" | "error" | "service-unavailable";

interface ClientValidation {
  status: ValidationState;
  latency_ms?: number;
  error?: string;
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

export function AIConfigsTab({ config, role = "sysadmin", onActiveClientChange }: AIConfigsTabProps) {
  const registryClients = config.all_clients.filter(
    (client) => client.name !== "ActiveModel" && client.status !== "fallback-chain"
  );

  const [settingActive, setSettingActive] = useState<string | null>(null);
  const [inspectData, setInspectData] = useState<ClientPromptsResponse | null>(null);
  const [loadingInspect, setLoadingInspect] = useState<string | null>(null);
  const [serviceAvailable, setServiceAvailable] = useState<boolean | null>(null);
  const [clientValidation, setClientValidation] = useState<Record<string, ClientValidation>>({});
  const [promptsClient, setPromptsClient] = useState<string>(config.active_client);
  const [promptsData, setPromptsData] = useState<ClientPromptsResponse | null>(null);
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [promptsError, setPromptsError] = useState<string | null>(null);

  const standbyClients = registryClients.filter((c) => c.name !== config.active_client);
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

  async function runValidation(clientName: string) {
    setClientValidation((prev) => ({ ...prev, [clientName]: { status: "running" } }));
    try {
      const result = await clinicalService.validateClient(clientName, role);
      setServiceAvailable(true);
      setClientValidation((prev) => ({
        ...prev,
        [clientName]: result.valid
          ? { status: "ok", latency_ms: result.latency_ms ?? undefined }
          : { status: "error", error: result.error ?? "Validation failed" },
      }));
    } catch {
      setServiceAvailable(false);
      setClientValidation((prev) => ({ ...prev, [clientName]: { status: "service-unavailable" } }));
    }
  }

  useEffect(() => {
    if (standbyClients.length === 0) return;
    const initial: Record<string, ClientValidation> = {};
    for (const c of standbyClients) initial[c.name] = { status: "pending" };
    setClientValidation(initial);
    Promise.allSettled(standbyClients.map((c) => runValidation(c.name)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.active_client]);

  useEffect(() => {
    setPromptsClient(config.active_client);
    setExpandedPrompt(null);
    setPromptsData(null);
    setPromptsError(null);
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
      })
      .catch((error) => {
        if (isCancelled) return;
        const message = error instanceof Error ? error.message : "Unable to load prompt templates.";
        setPromptsError(message);
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
      onActiveClientChange();
    } finally {
      setSettingActive(null);
    }
  }

  async function handleInspect(clientName: string) {
    setLoadingInspect(clientName);
    try {
      const data = await clinicalService.getClientPrompts(clientName);
      setInspectData(data);
    } finally {
      setLoadingInspect(null);
    }
  }

  function handlePromptsClientChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setExpandedPrompt(null);
    setPromptsClient(event.target.value);
  }

  return (
    <div className="space-y-5">

      {/* Validation check unavailable banner */}
      {serviceAvailable === false && (
        <div className="navavej-card bg-navavej-red/5 p-4 border border-navavej-red/30 rounded-lg">
          <p className="text-[10px] font-black text-navavej-red uppercase tracking-widest">Validation Check Unavailable</p>
          <p className="text-xs font-medium text-navavej-red/80 mt-1">
            Health check service unavailable. Backend may be outdated or needs restart.
            Switching still requires a successful validation check before{" "}
            <span className="font-mono">Set Active</span> can be used.
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
          <span className="font-mono">AI_ACTIVE_CLIENT</span> in <span className="font-mono">.env</span> sets the initial active client on boot. All configured clients are initialized at startup, and switching active inference here still requires a successful validation check.{" "}
          Valid values:{" "}
          <span className="font-mono">GeminiClient | OpenAIClient | AnthropicClient | OpenRouterClient | LocalHostedClient</span>
        </p>
      </div>

      {/* BAML Client Registry */}
      <div className="navavej-card bg-white border border-navavej-teal/30 rounded-lg p-5">
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
                const isInspecting = loadingInspect === client.name;
                const validation = clientValidation[client.name];
                const isRunning = validation?.status === "running";
                const canSetActive = validation?.status === "ok";
                const showError =
                  !isActive &&
                  (validation?.status === "service-unavailable" || validation?.status === "error");

                return (
                  <tr key={client.name} className={isActive ? "bg-navavej-teal/5" : ""}>
                    <td className="py-2.5 pr-4 font-mono font-bold text-navavej-gray-dark">
                      {isActive && <span className="mr-1.5 text-navavej-teal">✓</span>}
                      {client.name}
                    </td>
                    <td className="py-2.5 pr-4 text-navavej-gray-med">{client.provider}</td>
                    <td className="py-2.5 pr-4 font-mono text-navavej-gray-med truncate max-w-[220px]" title={client.model}>{client.model}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${STATUS_STYLES[client.status] ?? STATUS_STYLES.standby}`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          {/* Retry button (standby only) */}
                          {!isActive && (
                            <button
                              onClick={() => runValidation(client.name)}
                              disabled={isRunning}
                              className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-navavej-red text-navavej-red hover:bg-navavej-red hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {isRunning ? "Checking…" : "Retry"}
                            </button>
                          )}
                          {/* Set Active / Active badge */}
                          {isActive ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-navavej-teal bg-navavej-teal/10 border border-navavej-teal/30 cursor-default">
                              Active
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSetActive(client.name)}
                              disabled={isSetting || settingActive !== null || !canSetActive}
                              className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-navavej-teal text-navavej-teal hover:bg-navavej-teal hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {isSetting ? "Setting…" : "Set Active"}
                            </button>
                          )}
                          {/* Inspect Prompt button */}
                          <button
                            onClick={() => handleInspect(client.name)}
                            disabled={isInspecting}
                            className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-navavej-border text-navavej-gray-med hover:border-navavej-gray-dark hover:text-navavej-gray-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {isInspecting ? "Loading…" : "Inspect"}
                          </button>
                        </div>
                        {/* Per-client validation error */}
                        {showError && (
                          <p className="text-[10px] font-bold text-navavej-red">
                            {validation?.status === "service-unavailable"
                              ? "Health check service unavailable. Backend may be outdated or needs restart."
                              : validation?.error}
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-[10px] font-medium text-navavej-gray-med">
          Models are configured per client in <span className="font-mono">.env</span>. All configured clients initialize at startup; switching active inference still requires a successful validation check.
        </p>
      </div>

      {/* Prompts Management */}
      <div className="navavej-card bg-white border border-navavej-teal/30 rounded-lg p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="space-y-2">
            <p className="text-[10px] font-black text-navavej-gray-med uppercase tracking-widest">Prompts Mgnt</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-navavej-gray-med uppercase tracking-widest">Client</span>
              <select
                value={promptsClient}
                onChange={handlePromptsClientChange}
                className="px-3 py-2 border border-navavej-border rounded-lg text-xs font-bold outline-none bg-white focus:border-navavej-teal/50 cursor-pointer"
                aria-label="Prompt client"
              >
                {registryClients.map((client) => (
                  <option key={client.name} value={client.name}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-navavej-gray-light text-navavej-gray-dark text-xs font-bold border border-navavej-border">
            {promptsData?.template_version ?? `Template ${config.template_version}`}
          </span>
        </div>

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
                      <pre className="text-[11px] font-mono text-navavej-gray-dark bg-navavej-gray-light/60 border border-navavej-border rounded-lg p-4 whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto">
                        {text.trim()}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Inspect Prompt Modal */}
      {inspectData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] shadow-2xl border border-navavej-border w-full max-w-2xl mx-4 flex flex-col max-h-[85vh]">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-navavej-border shrink-0">
              <div>
                <h3 className="text-sm font-black text-navavej-gray-dark uppercase tracking-tight font-mono">
                  {inspectData.client_name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold text-navavej-gray-med uppercase tracking-widest">Prompt Templates</span>
                  <span className="px-2 py-0.5 rounded-full bg-navavej-gray-light text-navavej-gray-dark text-[10px] font-bold border border-navavej-border">
                    {inspectData.template_version}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setInspectData(null)}
                className="p-1.5 rounded-full hover:bg-navavej-gray-light text-navavej-gray-med transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto px-8 py-6 space-y-6">
              {Object.entries(inspectData.templates).map(([key, text]) => (
                <div key={key}>
                  <p className="text-[10px] font-black text-navavej-gray-med uppercase tracking-widest mb-2 font-mono">
                    {PROMPT_KEY_LABELS[key] ?? key}
                  </p>
                  <pre className="text-[11px] font-mono text-navavej-gray-dark bg-navavej-gray-light/60 border border-navavej-border rounded-lg p-4 whitespace-pre-wrap leading-relaxed">
                    {text.trim()}
                  </pre>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end px-8 py-5 border-t border-navavej-border shrink-0">
              <button
                onClick={() => setInspectData(null)}
                className="px-5 py-2 rounded-full text-xs font-black uppercase tracking-wider bg-navavej-gray-light text-navavej-gray-dark border border-navavej-border hover:bg-navavej-border transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
