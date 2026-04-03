"use client";

import React, { useState } from "react";
import { Pencil, RotateCcw, X } from "lucide-react";
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

export function AIConfigsTab({ config, onActiveClientChange }: AIConfigsTabProps) {
  const registryClients = config.all_clients.filter(
    (client) => client.name !== "ActiveModel" && client.status !== "fallback-chain"
  );

  const [settingActive, setSettingActive] = useState<string | null>(null);
  const [testingClient, setTestingClient] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, HealthCheckResponse>>({});
  const [inspectData, setInspectData] = useState<ClientPromptsResponse | null>(null);
  const [loadingInspect, setLoadingInspect] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editTemplates, setEditTemplates] = useState<Record<string, string>>({});
  const [editVersion, setEditVersion] = useState("");
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [healthCheckAvailabilityError, setHealthCheckAvailabilityError] = useState<string | null>(null);

  function closeModal() {
    setInspectData(null);
    setEditMode(false);
    setEditTemplates({});
    setEditVersion("");
    setSaving(false);
    setResetting(false);
    setModalError(null);
  }

  function startEdit(data: ClientPromptsResponse) {
    setEditMode(true);
    setEditTemplates(data.templates);
    setEditVersion(data.template_version);
    setModalError(null);
  }

  function cancelEdit() {
    setEditMode(false);
    setModalError(null);
    if (inspectData) {
      setEditTemplates(inspectData.templates);
      setEditVersion(inspectData.template_version);
    }
  }

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

  async function handleInspect(clientName: string) {
    setLoadingInspect(clientName);
    try {
      const data = await clinicalService.getClientPrompts(clientName);
      setInspectData(data);
      setEditMode(false);
      setEditTemplates({});
      setEditVersion("");
      setModalError(null);
    } finally {
      setLoadingInspect(null);
    }
  }

  async function handleSavePrompts() {
    if (!inspectData) return;
    setSaving(true);
    setModalError(null);
    try {
      const data = await clinicalService.updateClientPrompts(inspectData.client_name, {
        version: editVersion,
        templates: editTemplates,
      });
      setInspectData(data);
      setEditMode(false);
      await onActiveClientChange();
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "Unable to save prompt changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPrompts() {
    if (!inspectData || !window.confirm("Reset all prompts to YAML defaults?")) return;
    setResetting(true);
    setModalError(null);
    try {
      const data = await clinicalService.resetClientPrompts(inspectData.client_name);
      setInspectData(data);
      setEditMode(false);
      setEditTemplates({});
      setEditVersion(data.template_version);
      await onActiveClientChange();
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "Unable to reset prompt changes.");
    } finally {
      setResetting(false);
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
                const isInspecting = loadingInspect === client.name;
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
                        {/* Inspect Prompt button */}
                        <button
                          onClick={() => handleInspect(client.name)}
                          disabled={isInspecting || isTesting || isSetting}
                          className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-navavej-border text-navavej-gray-med hover:border-navavej-gray-dark hover:text-navavej-gray-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {isInspecting ? "Loading…" : "Inspect"}
                        </button>
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
                  {editMode ? (
                    <input
                      aria-label="Template Version"
                      value={editVersion}
                      onChange={(event) => setEditVersion(event.target.value)}
                      className="px-2 py-1 rounded-full bg-white text-navavej-gray-dark text-[10px] font-bold border border-navavej-border uppercase tracking-widest min-w-[140px]"
                    />
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-navavej-gray-light text-navavej-gray-dark text-[10px] font-bold border border-navavej-border">
                      {inspectData.template_version}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!editMode && (
                  <button
                    onClick={() => startEdit(inspectData)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border border-navavej-border text-navavej-gray-dark hover:border-navavej-gray-dark transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit Prompts
                  </button>
                )}
                <button
                  onClick={closeModal}
                  className="p-1.5 rounded-full hover:bg-navavej-gray-light text-navavej-gray-med transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto px-8 py-6 space-y-6">
              {modalError && (
                <div className="rounded-lg border border-navavej-red/30 bg-navavej-red/5 px-4 py-3 text-xs font-bold text-navavej-red">
                  {modalError}
                </div>
              )}
              {Object.entries(editMode ? editTemplates : inspectData.templates).map(([key, text]) => (
                <div key={key}>
                  <label className="block">
                    <span className="text-[10px] font-black text-navavej-gray-med uppercase tracking-widest mb-2 font-mono block">
                      {PROMPT_KEY_LABELS[key] ?? key}
                    </span>
                    {editMode ? (
                      <textarea
                        aria-label={PROMPT_KEY_LABELS[key] ?? key}
                        value={text}
                        onChange={(event) => setEditTemplates((current) => ({ ...current, [key]: event.target.value }))}
                        className="w-full min-h-[200px] text-[11px] font-mono text-navavej-gray-dark bg-navavej-gray-light/60 border border-navavej-border rounded-lg p-4 leading-relaxed resize-y"
                        style={{ whiteSpace: "pre" }}
                      />
                    ) : (
                      <pre className="text-[11px] font-mono text-navavej-gray-dark bg-navavej-gray-light/60 border border-navavej-border rounded-lg p-4 whitespace-pre-wrap leading-relaxed">
                        {text}
                      </pre>
                    )}
                  </label>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-8 py-5 border-t border-navavej-border shrink-0">
              {editMode ? (
                <button
                  onClick={handleResetPrompts}
                  disabled={saving || resetting}
                  className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider text-navavej-gray-med hover:text-navavej-gray-dark disabled:opacity-40"
                >
                  <RotateCcw className="w-3 h-3" />
                  {resetting ? "Resetting…" : "Reset to Default"}
                </button>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-3">
                {editMode ? (
                  <>
                    <button
                      onClick={cancelEdit}
                      disabled={saving || resetting}
                      className="px-5 py-2 rounded-full text-xs font-black uppercase tracking-wider bg-navavej-gray-light text-navavej-gray-dark border border-navavej-border hover:bg-navavej-border transition-colors disabled:opacity-40"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSavePrompts}
                      disabled={saving || resetting}
                      className="px-5 py-2 rounded-full text-xs font-black uppercase tracking-wider bg-navavej-teal text-white border border-navavej-teal hover:opacity-90 transition-colors disabled:opacity-40"
                    >
                      {saving ? "Saving…" : "Save Changes"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={closeModal}
                    className="px-5 py-2 rounded-full text-xs font-black uppercase tracking-wider bg-navavej-gray-light text-navavej-gray-dark border border-navavej-border hover:bg-navavej-border transition-colors"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
