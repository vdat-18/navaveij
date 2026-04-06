"use client";

import React, { useEffect, useState } from "react";
import { clinicalService, SystemConfig } from "@/services/api";
import { MappingCode, MasterAddOn, MasterProgram, RbacRole } from "@/types/access-monitoring";
import { RoleManagementTab } from "@/components/access-monitoring/RoleManagementTab";
import { MappingToolTab } from "@/components/access-monitoring/MappingToolTab";
import { MasterDataTab } from "@/components/access-monitoring/MasterDataTab";
import { MCPConfigsTab } from "@/components/access-monitoring/MCPConfigsTab";
import { AIConfigsTab } from "@/components/access-monitoring/AIConfigsTab";

interface ConfigurationScreenProps {
  role: "sysadmin";
}

type TabKey = "role" | "mapping" | "master" | "mcp_config" | "ai_config";

export function ConfigurationScreen({ role }: ConfigurationScreenProps) {
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [mappings, setMappings] = useState<MappingCode[]>([]);
  const [programs, setPrograms] = useState<MasterProgram[]>([]);
  const [addOns, setAddOns] = useState<MasterAddOn[]>([]);
  const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
  const [tab, setTab] = useState<TabKey>("role");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setErrorMessage(null);
    Promise.all([
      clinicalService.getRbac(role),
      clinicalService.getMappingCodes(role),
      clinicalService.getMasterPrograms(role),
      clinicalService.getMasterAddOns(role),
      clinicalService.getSystemConfig(role),
    ])
      .then(([rbacData, mappingData, masterData, addOnsData, sysConfigData]) => {
        setRoles(rbacData.roles);
        setMappings(mappingData.mappings);
        setPrograms(masterData.programs);
        setAddOns(addOnsData.add_ons);
        setSysConfig(sysConfigData);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Unable to load configuration data.";
        setErrorMessage(message);
      })
      .finally(() => setIsLoading(false));
  }, [role]);

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="navavej-card bg-white p-4 border border-navavej-border h-[400px] flex items-center justify-center">
          <p className="text-xs font-black text-navavej-gray-med uppercase">
            Loading configuration data...
          </p>
        </div>
      ) : errorMessage ? (
        <div className="navavej-card bg-navavej-red/5 p-4 border border-navavej-red/30 h-[400px] flex flex-col items-center justify-center">
          <p className="text-xs font-black text-navavej-red uppercase">
            Data load warning
          </p>
          <p className="text-xs font-bold text-navavej-gray-dark mt-2">{errorMessage}</p>
        </div>
      ) : (
        <>
          <div className="flex gap-2 border-b border-navavej-border">
            <TabButton label="Role Management" active={tab === "role"}       onClick={() => setTab("role")} />
            <TabButton label="Mapping Tool"    active={tab === "mapping"}    onClick={() => setTab("mapping")} />
            <TabButton label="Master Data"     active={tab === "master"}     onClick={() => setTab("master")} />
            <TabButton label="MCP Configs"     active={tab === "mcp_config"} onClick={() => setTab("mcp_config")} />
            <TabButton label="AI Configs"      active={tab === "ai_config"}  onClick={() => setTab("ai_config")} />
          </div>

          {tab === "role"       && <RoleManagementTab roles={roles} />}
          {tab === "mapping"    && <MappingToolTab mappings={mappings} />}
          {tab === "master"     && <MasterDataTab programs={programs} addOns={addOns} />}
          {tab === "mcp_config" && sysConfig && <MCPConfigsTab config={sysConfig} />}
          {tab === "ai_config"  && sysConfig && (
            <AIConfigsTab
              config={sysConfig}
              role={role}
              onActiveClientChange={() => clinicalService.getSystemConfig(role).then(setSysConfig)}
            />
          )}
        </>
      )}
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-xs font-black uppercase tracking-widest border-b-2 ${
        active ? "text-navavej-teal border-navavej-teal" : "text-navavej-gray-med border-transparent"
      }`}
    >
      {label}
    </button>
  );
}
