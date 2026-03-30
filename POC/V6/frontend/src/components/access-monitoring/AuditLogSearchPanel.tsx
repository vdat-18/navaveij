"use client";

import React, { useState, useEffect } from "react";
import { AuditLogEntry, AuditLogFilters } from "@/types/access-monitoring";
import { usePrivacyMode } from "@/shared/privacy-mode";
import { patientService } from "@/services/api";
import { Patient } from "@/types/patient";

const ACTION_OPTIONS = ["", "View", "Export", "Generate", "Decision", "AdminUpdate", "LLMRequest"];

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
  const { privacyMode } = usePrivacyMode();
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const [verifyResult, setVerifyResult] = useState<"idle" | "pass" | "fail" | "no-https">("idle");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [revealWho, setRevealWho] = useState(false);
  const [revealPatient, setRevealPatient] = useState(false);
  const [patientDetails, setPatientDetails] = useState<Patient | null>(null);

  // Initialize reveal states based on privacy mode when a new entry is selected
  const handleEntrySelect = (entry: AuditLogEntry) => {
    setSelectedEntry(entry);
    setVerifyResult("idle");
    setVerifyError(null);
    setRevealWho(false);
    setRevealPatient(false);
    setPatientDetails(null);
    if (entry.what.patient_id) {
      patientService.getDetails(entry.what.patient_id).then(setPatientDetails).catch(() => {});
    }
  };

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
            <tr className="bg-navavej-gray-light">
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
                onClick={() => handleEntrySelect(entry)}
                className="border-t border-navavej-border hover:bg-navavej-gray-light/30 cursor-pointer"
              >
                <td className="px-3 py-2 text-[11px] font-bold">{new Date(entry.when.iso_timestamp_utc).toLocaleString()}</td>
                <td className="px-3 py-2 text-[11px] font-bold">
                  {privacyMode ? "*******" : entry.who.user_id}
                </td>
                <td className="px-3 py-2 text-[11px] font-bold">{entry.what.action_type}</td>
                <td className="px-3 py-2 text-[11px] font-mono">
                  {privacyMode ? "*******" : (entry.what.patient_id || "—")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedEntry && (
        <div className="rounded-xl border border-navavej-border bg-white min-w-0 overflow-hidden divide-y divide-navavej-border">
          {/* WHO + WHEN row */}
          <div className="grid grid-cols-2 divide-x divide-navavej-border">
            {/* WHO */}
            <div className="p-4 space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-navavej-gray-med">Who</p>
                <button
                  className="text-gray-400 hover:text-gray-600 focus:outline-none"
                  title={revealWho ? "Hide" : "Reveal"}
                  onClick={() => setRevealWho(!revealWho)}
                >
                  <EyeIcon revealed={revealWho} />
                </button>
              </div>
              {revealWho ? (
                <>
                  <p className="text-xs font-bold">{selectedEntry.who.user_display_name}</p>
                  <p className="text-[11px] text-navavej-gray-med">
                    {selectedEntry.who.user_role}{selectedEntry.who.department ? ` · ${selectedEntry.who.department}` : ""}
                  </p>
                  <p className="text-[11px] font-mono text-navavej-gray-med">{selectedEntry.who.user_id}</p>
                </>
              ) : (
                <p className="text-xs font-bold text-navavej-gray-med">*******</p>
              )}
            </div>
            {/* WHEN */}
            <div className="p-4 space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-navavej-gray-med">When</p>
              <p className="text-xs font-bold">
                {new Date(selectedEntry.when.local_timestamp_ict || selectedEntry.when.iso_timestamp_utc).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
              </p>
              <p className="text-[11px] text-navavej-gray-med">
                {new Date(selectedEntry.when.local_timestamp_ict || selectedEntry.when.iso_timestamp_utc).toLocaleTimeString()}
              </p>
            </div>
          </div>

          {/* WHAT + WHERE row */}
          <div className="grid grid-cols-2 divide-x divide-navavej-border">
            {/* WHAT */}
            <div className="p-4 space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-navavej-gray-med">What</p>
              <p className="text-xs font-bold">{selectedEntry.what.action_type}</p>
              {selectedEntry.what.action_type === "LLMRequest" ? (
                <>
                  <p className="text-[11px] text-navavej-gray-med font-mono">
                    {selectedEntry.what.function_name ?? "—"}
                  </p>
                  <p className="text-[11px] text-navavej-gray-med">
                    {[
                      selectedEntry.what.model_id,
                      selectedEntry.what.template_version,
                      selectedEntry.what.latency_ms != null ? `${selectedEntry.what.latency_ms}ms` : null,
                    ].filter(Boolean).join(" · ")}
                  </p>
                  {selectedEntry.what.prompt_template_key && (
                    <p className="text-[11px] text-navavej-gray-med">
                      Template key: <span className="font-mono">{selectedEntry.what.prompt_template_key}</span>
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-[11px] text-navavej-gray-med">{selectedEntry.what.resource_type}</p>
                  {(selectedEntry.what.model_id || selectedEntry.what.latency_ms != null) && (
                    <p className="text-[11px] text-navavej-gray-med">
                      {[
                        selectedEntry.what.model_id,
                        selectedEntry.what.latency_ms != null ? `${selectedEntry.what.latency_ms}ms` : null,
                        selectedEntry.what.safety_validator_result === "pass" ? "Safety \u2713" : null,
                      ].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </>
              )}
            </div>
            {/* WHERE */}
            <div className="p-4 space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-navavej-gray-med">Where</p>
              <p className="text-xs font-bold">{selectedEntry.where.service_id}</p>
              <p className="text-[11px] font-mono text-navavej-gray-med">{selectedEntry.where.request_id}</p>
            </div>
          </div>

          {/* PATIENT row */}
          <div className="p-4 space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-navavej-gray-med">Patient</p>
              {selectedEntry.what.patient_id && (
                <button
                  className="text-gray-400 hover:text-gray-600 focus:outline-none"
                  title={revealPatient ? "Hide" : "Reveal"}
                  onClick={() => setRevealPatient(!revealPatient)}
                >
                  <EyeIcon revealed={revealPatient} />
                </button>
              )}
            </div>
            {!selectedEntry.what.patient_id ? (
              <p className="text-xs text-navavej-gray-med">—</p>
            ) : revealPatient ? (
              <>
                {patientDetails ? (
                  <>
                    <p className="text-xs font-bold">{patientDetails.patient_name}</p>
                    <p className="text-[11px] text-navavej-gray-med">
                      {[
                        patientDetails.patient_id,
                        patientDetails.gender,
                        patientDetails.age != null ? `${patientDetails.age}y` : null,
                        patientDetails.mrn,
                      ].filter(Boolean).join(" · ")}
                    </p>
                  </>
                ) : (
                  <p className="text-xs font-bold">{selectedEntry.what.patient_id}</p>
                )}
              </>
            ) : (
              <p className="text-xs font-bold text-navavej-gray-med">*******</p>
            )}
          </div>

          {/* WHY row */}
          <div className="p-4 space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-navavej-gray-med">Why</p>
            <p className="text-xs font-bold break-words">
              {typeof selectedEntry.why.request_context === "string"
                ? selectedEntry.why.request_context
                : JSON.stringify(selectedEntry.why.request_context)}
            </p>
          </div>

          {/* CHAIN INTEGRITY row */}
          <div className="p-4 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-navavej-gray-med">Chain Integrity</p>
            <div className="space-y-1">
              <p className="text-[11px] text-navavej-gray-med">
                <span className="font-bold">Hash:</span>{" "}
                <span className="font-mono break-all">{selectedEntry.sha256_hash}</span>
              </p>
              <p className="text-[11px] text-navavej-gray-med">
                <span className="font-bold">Prev:</span>{" "}
                <span className="font-mono break-all">{selectedEntry.prev_entry_hash}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => verifyHash(selectedEntry)}
                className="px-3 py-1 rounded-lg border border-navavej-border text-[10px] font-black uppercase"
              >
                Verify Hash
              </button>
              {verifyResult === "pass" && <p className="text-xs font-black text-green-600">Passed</p>}
              {verifyResult === "no-https" && <p className="text-xs font-black text-red-600">Hash verification requires a secure (HTTPS) connection</p>}
              {verifyResult === "fail" && <p className="text-xs font-black text-red-600">{verifyError || "Failed"}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EyeIcon({ revealed }: { revealed: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
      {revealed ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
      ) : (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </>
      )}
    </svg>
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
