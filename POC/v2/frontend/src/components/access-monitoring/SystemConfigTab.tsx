"use client";

import React from "react";
import { SystemConfig } from "@/services/api";

interface SystemConfigTabProps {
  config: SystemConfig;
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-navavej-teal/10 text-navavej-teal border border-navavej-teal/30",
  standby: "bg-navavej-gray-light text-navavej-gray-med border border-navavej-border",
  "fallback-chain": "bg-amber-50 text-amber-700 border border-amber-200",
};

const PROVIDER_LOGO_BADGES: Array<{
  match: (value: string) => boolean;
  glyph: string;
  className: string;
}> = [
  {
    match: (value) => value.includes("openai"),
    glyph: "◎",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    match: (value) => value.includes("anthropic") || value.includes("claude"),
    glyph: "◈",
    className: "bg-orange-50 text-orange-700 border-orange-200",
  },
  {
    match: (value) => value.includes("llama") || value.includes("meta"),
    glyph: "▲",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    match: (value) => value.includes("fallback"),
    glyph: "↺",
    className: "bg-violet-50 text-violet-700 border-violet-200",
  },
  {
    match: () => true,
    glyph: "●",
    className: "bg-navavej-gray-light text-navavej-gray-dark border-navavej-border",
  },
];

const resolveProviderBadge = (provider: string, name: string) => {
  const normalized = `${provider} ${name}`.toLowerCase();
  const matched = PROVIDER_LOGO_BADGES.find((item) => item.match(normalized)) ?? PROVIDER_LOGO_BADGES[PROVIDER_LOGO_BADGES.length - 1];
  return matched;
};

export function SystemConfigTab({ config }: SystemConfigTabProps) {
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
        </p>
      </div>

      <div className="navavej-card bg-white border border-navavej-border rounded-lg p-5">
        <p className="text-[10px] font-black text-navavej-gray-med uppercase tracking-widest mb-3">AI Gateway</p>
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
              {config.all_clients.map((client) => {
                const providerBadge = resolveProviderBadge(client.provider, client.name);
                return (
                  <tr key={client.name} className={client.name === config.active_client ? "bg-navavej-teal/5" : ""}>
                    <td className="py-2.5 pr-4 font-mono font-bold text-navavej-gray-dark">
                      {client.name === config.active_client && (
                        <span className="mr-1.5 text-navavej-teal">✓</span>
                      )}
                      {client.name}
                    </td>
                    <td className="py-2.5 pr-4 text-navavej-gray-med">
                      <div className="flex items-center gap-2">
                        {client.provider_logo_url ? (
                          <span
                            className="h-5 w-5 rounded-full border border-navavej-border bg-white bg-cover bg-center"
                            style={{ backgroundImage: `url(${client.provider_logo_url})` }}
                          />
                        ) : (
                          <span className={`h-5 w-5 rounded-full border text-[10px] font-black flex items-center justify-center ${providerBadge.className}`}>
                            {providerBadge.glyph}
                          </span>
                        )}
                        <span>{client.provider}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-navavej-gray-med truncate max-w-[220px]" title={client.model}>{client.model}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${STATUS_STYLES[client.status] ?? STATUS_STYLES.standby}`}>
                        {client.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MCP Tool Inventory */}
      <div className="navavej-card bg-white border border-navavej-border rounded-lg p-5">
        <p className="text-[10px] font-black text-navavej-gray-med uppercase tracking-widest mb-3">MCP Tool Inventory</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-navavej-border">
                <th className="text-left font-black text-navavej-gray-med uppercase tracking-wider py-2 pr-4">Tool</th>
                <th className="text-left font-black text-navavej-gray-med uppercase tracking-wider py-2 pr-4">Access Type</th>
                <th className="text-left font-black text-navavej-gray-med uppercase tracking-wider py-2">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navavej-border">
              {config.mcp_tools.map((tool) => (
                <tr key={tool.name}>
                  <td className="py-2.5 pr-4 font-mono font-bold text-navavej-gray-dark">{tool.name}</td>
                  <td className="py-2.5 pr-4">
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase tracking-wider">
                      {tool.type}
                    </span>
                  </td>
                  <td className="py-2.5 text-navavej-gray-med">{tool.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
