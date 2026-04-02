"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { ClientPromptsResponse, SystemConfig } from "@/services/api";
import { clinicalService } from "@/services/api";

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
  const [inspectData, setInspectData] = useState<ClientPromptsResponse | null>(null);
  const [loadingInspect, setLoadingInspect] = useState<string | null>(null);

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

  return (
    <div className="space-y-5">

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
          Set via <span className="font-mono">AI_ACTIVE_CLIENT</span> in <span className="font-mono">.env</span> — no code deployment required to switch models.
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
                const isInspecting = loadingInspect === client.name;
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
                      <div className="flex items-center gap-2">
                        {/* Set Active button */}
                        {isActive ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-navavej-teal bg-navavej-teal/10 border border-navavej-teal/30 cursor-default">
                            Active
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSetActive(client.name)}
                            disabled={isSetting || settingActive !== null}
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
