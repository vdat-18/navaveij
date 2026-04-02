"use client";

import React, { useEffect, useState } from "react";
import { clinicalService } from "@/services/api";
import { AuditLogEntry, AuditLogFilters, AnomalyAlert, MonitoringSnapshot } from "@/types/access-monitoring";
import { LiveMetricsBar } from "./LiveMetricsBar";
import { AnomalyAlertsPanel } from "./AnomalyAlertsPanel";
import { AuditLogSearchPanel } from "./AuditLogSearchPanel";

interface AccessMonitoringScreenProps {
  role: "executive" | "sysadmin";
}

export function AccessMonitoringScreen({ role }: AccessMonitoringScreenProps) {
  const [snapshot, setSnapshot] = useState<MonitoringSnapshot | null>(null);
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadScreen = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [snapshotData, alertData, auditData] = await Promise.all([
        clinicalService.getMonitoringSnapshot(role),
        clinicalService.getAnomalyAlerts(role),
        clinicalService.searchAuditLogs({}, role),
      ]);
      setSnapshot(snapshotData);
      setAlerts(alertData.alerts);
      setEntries(auditData.entries);
      setTotal(auditData.total);
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
        </>
      )}
    </div>
  );
}
