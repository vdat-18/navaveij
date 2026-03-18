import type { MonitoringSnapshot, AnomalyAlert, AuditLogEntry, RbacRole, MappingCode } from '../types';

const BASE = '/api';

export async function fetchMonitoringSnapshot(): Promise<MonitoringSnapshot> {
  const res = await fetch(`${BASE}/monitoring-snapshot`);
  if (!res.ok) throw new Error(`GET /api/monitoring-snapshot failed (${res.status})`);
  return res.json();
}

export interface AuditLogFilters {
  user_id?: string;
  patient_token_prefix?: string;
  action_type?: string;
  resource_type?: string;
  start_date?: string;
  end_date?: string;
}

export async function fetchAuditLogs(
  filters: AuditLogFilters = {}
): Promise<{ total: number; entries: AuditLogEntry[] }> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v) params.set(k, v);
  }
  const res = await fetch(`${BASE}/audit-logs?${params.toString()}`);
  if (!res.ok) throw new Error(`GET /api/audit-logs failed (${res.status})`);
  return res.json();
}

export async function fetchAnomalyAlerts(): Promise<{ alerts: AnomalyAlert[] }> {
  const res = await fetch(`${BASE}/anomaly-alerts`);
  if (!res.ok) throw new Error(`GET /api/anomaly-alerts failed (${res.status})`);
  return res.json();
}

export async function fetchRbac(): Promise<{ roles: RbacRole[] }> {
  const res = await fetch(`${BASE}/rbac`);
  if (!res.ok) throw new Error(`GET /api/rbac failed (${res.status})`);
  return res.json();
}

export async function fetchMappingCodes(): Promise<{ mappings: MappingCode[] }> {
  const res = await fetch(`${BASE}/mapping-codes`);
  if (!res.ok) throw new Error(`GET /api/mapping-codes failed (${res.status})`);
  return res.json();
}

export async function fetchMasterPrograms(): Promise<{ programs: unknown[] }> {
  const res = await fetch(`${BASE}/master-programs`);
  if (!res.ok) throw new Error(`GET /api/master-programs failed (${res.status})`);
  return res.json();
}
