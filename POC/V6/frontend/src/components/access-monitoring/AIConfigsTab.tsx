"use client";

import React from "react";
import { SystemConfig } from "@/services/api";

interface AIConfigsTabProps {
  config: SystemConfig;
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-navavej-teal/10 text-navavej-teal border border-navavej-teal/30",
  standby: "bg-navavej-gray-light text-navavej-gray-med border border-navavej-border",
  "fallback-chain": "bg-amber-50 text-amber-700 border border-amber-200",
};

export function AIConfigsTab({ config }: AIConfigsTabProps) {
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
                <th className="text-left font-black text-navavej-gray-med uppercase tracking-wider py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navavej-border">
              {config.all_clients.map((client) => (
                <tr key={client.name} className={client.name === config.active_client ? "bg-navavej-teal/5" : ""}>
                  <td className="py-2.5 pr-4 font-mono font-bold text-navavej-gray-dark">
                    {client.name === config.active_client && (
                      <span className="mr-1.5 text-navavej-teal">✓</span>
                    )}
                    {client.name}
                  </td>
                  <td className="py-2.5 pr-4 text-navavej-gray-med">{client.provider}</td>
                  <td className="py-2.5 pr-4 font-mono text-navavej-gray-med truncate max-w-[220px]" title={client.model}>{client.model}</td>
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${STATUS_STYLES[client.status] ?? STATUS_STYLES.standby}`}>
                      {client.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
