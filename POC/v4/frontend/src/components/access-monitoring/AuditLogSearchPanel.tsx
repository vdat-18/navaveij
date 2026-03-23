"use client";

import React, { useState } from "react";
import { AuditLogEntry, AuditLogFilters } from "@/types/access-monitoring";

const ACTION_OPTIONS = ["", "View", "Export", "Generate", "Decision", "AdminUpdate"];

interface AuditLogSearchPanelProps {
  entries: AuditLogEntry[];
  total: number;
  filters: AuditLogFilters;
  onFilterChange: (next: AuditLogFilters) => void;
  onSearch: () => Promise<void>;
}

export function AuditLogSearchPanel({
  entries,
  total,
  filters,
  onFilterChange,
  onSearch,
}: AuditLogSearchPanelProps) {
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const [verifyResult, setVerifyResult] = useState<"idle" | "pass" | "fail" | "no-https">("idle");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const verifyHash = async (entry: AuditLogEntry) => {
    setVerifyError(null);
    if (!crypto?.subtle) {
      setVerifyResult("no-https");
      return;
    }

    try {
      const payload = {
        prev_entry_hash: entry.prev_entry_hash,
        who: entry.who,
        when: entry.when,
        where: entry.where,
        what: entry.what,
        why: entry.why,
        retention_expiry: entry.retention_expiry,
      };
      const input = stableStringify(payload);
      const encoded = new TextEncoder().encode(input);
      const digest = await crypto.subtle.digest("SHA-256", encoded);
      const hash = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      setVerifyResult(hash === entry.sha256_hash ? "pass" : "fail");
    } catch (err) {
      console.error("Hash verification failed:", err);
      setVerifyError("An error occurred during hash verification.");
      setVerifyResult("fail");
    }
  };

  return (
    <div className="navavej-card p-6 space-y-4">
      <h3 className="text-sm font-black uppercase tracking-widest text-navavej-gray-dark">Audit Log Search</h3>
      {/* C4-2: Audit retention banner — collapsible */}
      <div>
        <button
          type="button"
          onClick={() => setBannerOpen((v) => !v)}
          className="flex items-center gap-2 text-xs text-sky-700 font-black"
        >
          <span>ℹ</span>
          <span>Audit Retention Policy</span>
          <span className="text-sky-400">{bannerOpen ? "▲" : "▼"}</span>
        </button>
        {bannerOpen && (
          <div className="mt-1 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-800">
            <span className="font-black">Retention policy: 3 years</span>
            <span className="text-sky-600"> (PDPA §40 compliant)</span>
            <span className="mx-2 text-sky-300">·</span>
            <span className="font-black">Storage:</span> append-only JSONL
            <span className="mx-2 text-sky-300">·</span>
            <span className="font-black">Chain integrity:</span> SHA-256 verified
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
        <input
          placeholder="user_id"
          value={filters.user_id || ""}
          onChange={(e) => onFilterChange({ ...filters, user_id: e.target.value })}
          className="rounded-lg border border-navavej-border px-3 py-2 text-xs font-bold"
        />
        <input
          placeholder="patient ID (e.g. id_1aa1b504)"
          value={filters.patient_id || ""}
          onChange={(e) => onFilterChange({ ...filters, patient_id: e.target.value })}
          className="rounded-lg border border-navavej-border px-3 py-2 text-xs font-bold"
        />
        <select
          value={filters.action_type || ""}
          onChange={(e) => onFilterChange({ ...filters, action_type: e.target.value })}
          className="rounded-lg border border-navavej-border px-3 py-2 text-xs font-bold"
        >
          {ACTION_OPTIONS.map((option) => (
            <option key={option || "all"} value={option}>
              {option || "All actions"}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={async () => {
          setSearchError(null);
          try { await onSearch(); }
          catch (err) { setSearchError(err instanceof Error ? err.message : "Search failed."); }
        }}
        className="px-4 py-2 rounded-lg bg-navavej-teal text-white text-xs font-black uppercase tracking-widest"
      >
        Search ({total})
      </button>
      {searchError && (
        <p className="text-xs font-black text-red-600">{searchError}</p>
      )}

      <div className="max-h-[320px] overflow-y-auto border border-navavej-border rounded-xl">
        <table className="w-full text-left">
          <thead className="sticky top-0 z-10">
            <tr className="bg-navavej-gray-light/50">
              <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest">When</th>
              <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest">Who</th>
              <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest">What</th>
              <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest">Patient</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-xs text-navavej-gray-med">
                  No audit entries match the current filters.
                </td>
              </tr>
            )}
            {[...entries].sort((a, b) => b.when.iso_timestamp_utc.localeCompare(a.when.iso_timestamp_utc)).map((entry) => (
              <tr
                key={entry.entry_id}
                onClick={() => {
                  setSelectedEntry(entry);
                  setVerifyResult("idle");
                  setVerifyError(null);
                }}
                className="border-t border-navavej-border hover:bg-navavej-gray-light/30 cursor-pointer"
              >
                <td className="px-3 py-2 text-[11px] font-bold">{new Date(entry.when.iso_timestamp_utc).toLocaleString()}</td>
                <td className="px-3 py-2 text-[11px] font-bold">{entry.who.user_id}</td>
                <td className="px-3 py-2 text-[11px] font-bold">{entry.what.action_type}</td>
                <td className="px-3 py-2 text-[11px] font-mono">{entry.what.patient_id || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedEntry && (
        <div className="rounded-xl border border-navavej-border p-4 bg-white space-y-2 min-w-0 overflow-hidden">
          <p className="text-[10px] font-black uppercase tracking-widest text-navavej-gray-med">Who / When / Where / What / Why</p>
          <p className="text-xs font-bold break-words">{selectedEntry.who.user_display_name} ({selectedEntry.who.user_role})</p>
          <p className="text-xs font-bold break-words">{selectedEntry.when.iso_timestamp_utc}</p>
          <p className="text-xs font-bold break-words">{selectedEntry.where.service_id}</p>
          <p className="text-xs font-bold break-words">{selectedEntry.what.action_type} • {selectedEntry.what.resource_type}</p>
          <p className="text-xs font-bold break-all whitespace-pre-wrap">
            {typeof selectedEntry.why.request_context === "string"
              ? selectedEntry.why.request_context
              : JSON.stringify(selectedEntry.why.request_context)}
          </p>
          <p className="text-xs font-mono break-all">{selectedEntry.sha256_hash}</p>
          <p className="text-xs font-mono break-all">{selectedEntry.prev_entry_hash}</p>
          <button
            type="button"
            onClick={() => verifyHash(selectedEntry)}
            className="px-3 py-1 rounded-lg border border-navavej-border text-[10px] font-black uppercase"
          >
            Verify Hash
          </button>
          {verifyResult === "pass" && <p className="text-xs font-black text-green-600">Hash verification passed</p>}
          {verifyResult === "no-https" && (
            <p className="text-xs font-black text-red-600">Hash verification requires a secure (HTTPS) connection</p>
          )}
          {verifyResult === "fail" && <p className="text-xs font-black text-red-600">{verifyError || "Hash verification failed"}</p>}
        </div>
      )}
    </div>
  );
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const objectValue = value as Record<string, unknown>;
  const keys = Object.keys(objectValue).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(objectValue[key])}`)
    .join(",")}}`;
}
