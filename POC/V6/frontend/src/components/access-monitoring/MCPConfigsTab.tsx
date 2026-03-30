"use client";

import React from "react";
import { SystemConfig } from "@/services/api";

interface MCPConfigsTabProps {
  config: SystemConfig;
}

const AUTH_MODE_DESCRIPTIONS: Record<string, string> = {
  smart_on_fhir_demo: "Bearer token decoded from mock OIDC payload; role and scopes derived server-side.",
  poc_claims: "X-Auth-* headers read directly (no token validation). For local development only.",
  disabled: "Authentication bypassed; all requests run as default admin. Do not use in production.",
};

export function MCPConfigsTab({ config }: MCPConfigsTabProps) {
  return (
    <div className="space-y-5">

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

      {/* Auth Configuration */}
      <div className="navavej-card bg-white border border-navavej-border rounded-lg p-5">
        <p className="text-[10px] font-black text-navavej-gray-med uppercase tracking-widest mb-3">Auth Configuration</p>
        <div className="flex items-start gap-3">
          <span className="px-3 py-1 rounded-full bg-navavej-gray-light text-navavej-gray-dark text-xs font-mono font-bold border border-navavej-border shrink-0">
            {config.auth_mode}
          </span>
          <p className="text-xs font-medium text-navavej-gray-med leading-relaxed">
            {AUTH_MODE_DESCRIPTIONS[config.auth_mode] ?? "Custom authentication mode."}
          </p>
        </div>
      </div>

    </div>
  );
}
