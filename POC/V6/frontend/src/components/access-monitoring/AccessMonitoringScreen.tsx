"use client";

import React, { useEffect, useState } from "react";
import { clinicalService, SystemConfig } from "@/services/api";
import { AuditLogEntry, AuditLogFilters, AnomalyAlert, MappingCode, MasterAddOn, MasterProgram, MonitoringSnapshot, RbacRole } from "@/types/access-monitoring";
import { LiveMetricsBar } from "./LiveMetricsBar";
import { AnomalyAlertsPanel } from "./AnomalyAlertsPanel";
import { AuditLogSearchPanel } from "./AuditLogSearchPanel";
import { RoleManagementTab } from "./RoleManagementTab";
import { MappingToolTab } from "./MappingToolTab";
import { MasterDataTab } from "./MasterDataTab";
import { MCPConfigsTab } from "./MCPConfigsTab";
import { AIConfigsTab } from "./AIConfigsTab";

interface AccessMonitoringScreenProps {
  role: "admin" | "dpo";
}

type TabKey = "role" | "mapping" | "master" | "mcp_config" | "ai_config";

export function AccessMonitoringScreen({ role }: AccessMonitoringScreenProps) {
  const [snapshot, setSnapshot] = useState<MonitoringSnapshot | null>(null);
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [mappings, setMappings] = useState<MappingCode[]>([]);
  const [programs, setPrograms] = useState<MasterProgram[]>([]);
  const [addOns, setAddOns] = useState<MasterAddOn[]>([]);
  const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [tab, setTab] = useState<TabKey>("role");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadScreen = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [snapshotData, alertData, auditData, rbacData, mappingData, masterData, addOnsData, sysConfigData] = await Promise.all([
        clinicalService.getMonitoringSnapshot(role),
        clinicalService.getAnomalyAlerts(role),
        clinicalService.searchAuditLogs({}, role),
        clinicalService.getRbac(role),
        clinicalService.getMappingCodes(role),
        clinicalService.getMasterPrograms(role),
        clinicalService.getMasterAddOns(role),
        clinicalService.getSystemConfig(role),
      ]);
      setSnapshot(snapshotData);
      setAlerts(alertData.alerts);
      setEntries(auditData.entries);
      setTotal(auditData.total);
      setRoles(rbacData.roles);
      setMappings(mappingData.mappings);
      setPrograms(masterData.programs);
      setAddOns(addOnsData.add_ons);
      setSysConfig(sysConfigData);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load access monitoring data.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    loadScreen();
    const interval = setInterval(() => {
      clinicalService.getMonitoringSnapshot(role).then((data) => {
        if (active) {
          setSnapshot(data);
        }
      }).catch(() => null);
    }, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [role]);

  const runAuditSearch = async () => {
    const auditData = await clinicalService.searchAuditLogs(filters, role);
    setEntries(auditData.entries);
    setTotal(auditData.total);
  };

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="navavej-card bg-white p-4 border border-navavej-border h-[400px] flex items-center justify-center">
          <p className="text-xs font-black text-navavej-gray-med uppercase">
            Loading access monitoring data...
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
          <LiveMetricsBar snapshot={snapshot} />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <AnomalyAlertsPanel alerts={alerts} />
            <AuditLogSearchPanel
              entries={entries}
              total={total}
              filters={filters}
              onFilterChange={setFilters}
              onSearch={runAuditSearch}
            />
          </div>

          <div className="flex gap-2 border-b border-navavej-border">
            <TabButton label="Role Management" active={tab === "role"} onClick={() => setTab("role")} />
            <TabButton label="Mapping Tool" active={tab === "mapping"} onClick={() => setTab("mapping")} />
            <TabButton label="Master Data" active={tab === "master"} onClick={() => setTab("master")} />
            <TabButton label="MCP Configs" active={tab === "mcp_config"} onClick={() => setTab("mcp_config")} />
            <TabButton label="AI Configs" active={tab === "ai_config"} onClick={() => setTab("ai_config")} />
          </div>

          {tab === "role" && <RoleManagementTab roles={roles} />}
          {tab === "mapping" && <MappingToolTab mappings={mappings} />}
          {tab === "master" && <MasterDataTab programs={programs} addOns={addOns} />}
          {tab === "mcp_config" && sysConfig && <MCPConfigsTab config={sysConfig} />}
          {tab === "ai_config" && sysConfig && <AIConfigsTab config={sysConfig} />}
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
