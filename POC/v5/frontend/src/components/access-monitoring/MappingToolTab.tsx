"use client";

import React, { useEffect, useState } from "react";
import { Search, X, Plus, ChevronRight } from "lucide-react";
import { MappingCode } from "@/types/access-monitoring";
import { cn } from "@/shared/utils";

interface MappingToolTabProps {
  mappings: MappingCode[];
}

const TARGET_SYSTEMS = ["All", "LOINC", "SNOMED CT", "ICD-10", "FHIR", "Internal"];
const STATUSES = ["All", "Active", "Pending", "Inactive", "Draft"];
const SYSTEM_OPTIONS = ["Internal", "LOINC", "SNOMED CT", "ICD-10", "FHIR", "Other"];
const MAP_TYPE_OPTIONS = ["exact", "broader", "narrower", "equivalent"];

const EMPTY_FORM = {
  local_code: "",
  local_system: "Internal",
  target_code: "",
  target_system: "LOINC",
  target_label: "",
  mapping_type: "exact",
};

function statusBadgeClass(status: string) {
  const s = status.toLowerCase();
  if (s === "active")   return "bg-emerald-100 text-emerald-700";
  if (s === "pending")  return "bg-amber-100 text-amber-700";
  if (s === "inactive") return "bg-slate-100 text-slate-600";
  if (s === "draft")    return "bg-blue-100 text-blue-700";
  return "bg-navavej-gray-light text-navavej-gray-med";
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] font-black text-navavej-gray-med uppercase tracking-widest">{label}</span>
      <span className="text-xs font-bold text-navavej-gray-dark break-all">{value || "—"}</span>
    </div>
  );
}

export function MappingToolTab({ mappings }: MappingToolTabProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [systemFilter, setSystemFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedRow, setSelectedRow] = useState<MappingCode | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [localMappings, setLocalMappings] = useState<MappingCode[]>(mappings);
  const [form, setForm] = useState(EMPTY_FORM);

  // Sync prop → local state when parent reloads
  useEffect(() => { setLocalMappings(mappings); }, [mappings]);

  // Debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filtered = localMappings.filter((m) => {
    const q = debouncedSearch.toLowerCase();
    const matchSearch = !q
      || m.local_code.toLowerCase().includes(q)
      || (m.target_label ?? "").toLowerCase().includes(q)
      || (m.local_label ?? "").toLowerCase().includes(q);
    const matchSystem = systemFilter === "All" || m.target_system === systemFilter;
    const matchStatus = statusFilter === "All" || m.status.toLowerCase() === statusFilter.toLowerCase();
    return matchSearch && matchSystem && matchStatus;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.local_code || !form.target_code || !form.target_label) return;
    const newMapping: MappingCode = {
      mapping_id: `draft-${Date.now()}`,
      local_label: form.local_code,
      status: "draft",
      validated_by_user_id: "",
      validated_at: "",
      last_updated_by_user_id: "",
      last_updated_at: "",
      notes: "",
      ...form,
    };
    setLocalMappings((prev) => [newMapping, ...prev]);
    setShowAddModal(false);
    setForm(EMPTY_FORM);
  };

  return (
    <div className="navavej-card p-6 flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-navavej-gray-med" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code or label…"
            className="w-full pl-8 pr-4 py-2 border border-navavej-border rounded-lg text-xs font-medium outline-none focus:border-navavej-teal/50 bg-white"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-navavej-gray-med hover:text-navavej-gray-dark">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Target System filter */}
        <select
          value={systemFilter}
          onChange={(e) => setSystemFilter(e.target.value)}
          className="px-3 py-2 border border-navavej-border rounded-lg text-xs font-bold outline-none bg-white focus:border-navavej-teal/50 cursor-pointer"
        >
          {TARGET_SYSTEMS.map((s) => (
            <option key={s} value={s}>{s === "All" ? "All Systems" : s}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-navavej-border rounded-lg text-xs font-bold outline-none bg-white focus:border-navavej-teal/50 cursor-pointer"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s === "All" ? "All Statuses" : s}</option>
          ))}
        </select>

        {/* Row count */}
        <span className="text-[10px] font-bold text-navavej-gray-med uppercase tracking-widest whitespace-nowrap">
          {filtered.length} / {localMappings.length} rows
        </span>

        {/* Add Mapping */}
        <button
          onClick={() => setShowAddModal(true)}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-navavej-teal text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-navavej-teal/90 transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Mapping
        </button>
      </div>

      {/* Table + Slide-over */}
      <div className="flex gap-4 min-h-0">
        {/* Table */}
        <div className={cn("overflow-auto flex-1 rounded-lg border border-navavej-border", selectedRow && "max-w-[calc(100%-396px)]")}>
          <table className="w-full text-left min-w-[700px]">
            <thead className="sticky top-0 bg-navavej-gray-light/80 backdrop-blur-sm">
              <tr>
                {["Local Code", "Local Sys", "Target Code", "Target Sys", "Target Label", "Type", "Status", ""].map((h) => (
                  <th key={h} className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-navavej-gray-med whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-xs font-bold text-navavej-gray-med">
                    No mappings match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((m) => (
                  <tr
                    key={m.mapping_id}
                    onClick={() => setSelectedRow(selectedRow?.mapping_id === m.mapping_id ? null : m)}
                    className={cn(
                      "border-t border-navavej-border cursor-pointer transition-colors",
                      selectedRow?.mapping_id === m.mapping_id
                        ? "bg-navavej-teal/5"
                        : "hover:bg-navavej-gray-light/40"
                    )}
                  >
                    <td className="px-3 py-2 text-xs font-black text-navavej-gray-dark whitespace-nowrap">{m.local_code}</td>
                    <td className="px-3 py-2 text-xs font-bold text-navavej-gray-med whitespace-nowrap">{m.local_system}</td>
                    <td className="px-3 py-2 text-xs font-bold whitespace-nowrap">{m.target_code}</td>
                    <td className="px-3 py-2 text-xs font-bold whitespace-nowrap">{m.target_system}</td>
                    <td className="px-3 py-2 text-xs font-bold max-w-[160px] truncate">{m.target_label}</td>
                    <td className="px-3 py-2 text-xs font-bold whitespace-nowrap">{m.mapping_type}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider", statusBadgeClass(m.status))}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <ChevronRight className={cn("w-3.5 h-3.5 text-navavej-gray-med transition-transform", selectedRow?.mapping_id === m.mapping_id && "rotate-90 text-navavej-teal")} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Slide-over Detail Panel */}
        {selectedRow && (
          <div className="w-[380px] flex-shrink-0 navavej-card bg-white border border-navavej-border rounded-xl p-5 flex flex-col gap-4 overflow-y-auto max-h-[600px]">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-black text-navavej-gray-dark uppercase tracking-widest">Mapping Detail</h4>
              <button onClick={() => setSelectedRow(null)} className="p-1 rounded-full hover:bg-navavej-gray-light text-navavej-gray-med hover:text-navavej-gray-dark transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-[9px] font-black text-navavej-teal uppercase tracking-widest border-b border-navavej-border pb-1">Local</p>
              <DetailRow label="Code" value={selectedRow.local_code} />
              <DetailRow label="System" value={selectedRow.local_system} />
              <DetailRow label="Label" value={selectedRow.local_label} />
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-[9px] font-black text-navavej-teal uppercase tracking-widest border-b border-navavej-border pb-1">Target</p>
              <DetailRow label="Code" value={selectedRow.target_code} />
              <DetailRow label="System" value={selectedRow.target_system} />
              <DetailRow label="Label" value={selectedRow.target_label} />
              <DetailRow label="Map Type" value={selectedRow.mapping_type} />
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-[9px] font-black text-navavej-teal uppercase tracking-widest border-b border-navavej-border pb-1">Validation</p>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-black text-navavej-gray-med uppercase tracking-widest">Status</span>
                <span className={cn("inline-flex w-fit px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider", statusBadgeClass(selectedRow.status))}>
                  {selectedRow.status}
                </span>
              </div>
              <DetailRow label="Validated By" value={selectedRow.validated_by_user_id} />
              <DetailRow label="Validated At" value={selectedRow.validated_at} />
              <DetailRow label="Last Updated By" value={selectedRow.last_updated_by_user_id} />
              <DetailRow label="Last Updated At" value={selectedRow.last_updated_at} />
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-[9px] font-black text-navavej-teal uppercase tracking-widest border-b border-navavej-border pb-1">Notes</p>
              <p className="text-xs font-medium text-navavej-gray-dark leading-relaxed">{selectedRow.notes || "—"}</p>
            </div>
          </div>
        )}
      </div>

      {/* Add Mapping Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] shadow-2xl border border-navavej-border w-full max-w-lg mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-navavej-border">
              <div>
                <h3 className="text-sm font-black text-navavej-gray-dark uppercase tracking-tight">Add Mapping</h3>
                <p className="text-[10px] font-bold text-navavej-gray-med uppercase tracking-widest mt-0.5">New entry saved as Draft</p>
              </div>
              <button onClick={() => { setShowAddModal(false); setForm(EMPTY_FORM); }} className="p-1.5 rounded-full hover:bg-navavej-gray-light text-navavej-gray-med transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="px-8 py-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Local Code */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-navavej-gray-med uppercase tracking-widest">Local Code <span className="text-navavej-red">*</span></label>
                  <input
                    type="text"
                    required
                    value={form.local_code}
                    onChange={(e) => setForm((f) => ({ ...f, local_code: e.target.value }))}
                    className="px-3 py-2 border border-navavej-border rounded-lg text-xs font-medium outline-none focus:border-navavej-teal/50"
                    placeholder="e.g. 8480-6"
                  />
                </div>

                {/* Local System */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-navavej-gray-med uppercase tracking-widest">Local System</label>
                  <select
                    value={form.local_system}
                    onChange={(e) => setForm((f) => ({ ...f, local_system: e.target.value }))}
                    className="px-3 py-2 border border-navavej-border rounded-lg text-xs font-bold outline-none bg-white focus:border-navavej-teal/50"
                  >
                    {SYSTEM_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Target Code */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-navavej-gray-med uppercase tracking-widest">Target Code <span className="text-navavej-red">*</span></label>
                  <input
                    type="text"
                    required
                    value={form.target_code}
                    onChange={(e) => setForm((f) => ({ ...f, target_code: e.target.value }))}
                    className="px-3 py-2 border border-navavej-border rounded-lg text-xs font-medium outline-none focus:border-navavej-teal/50"
                    placeholder="e.g. 271649006"
                  />
                </div>

                {/* Target System */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-navavej-gray-med uppercase tracking-widest">Target System</label>
                  <select
                    value={form.target_system}
                    onChange={(e) => setForm((f) => ({ ...f, target_system: e.target.value }))}
                    className="px-3 py-2 border border-navavej-border rounded-lg text-xs font-bold outline-none bg-white focus:border-navavej-teal/50"
                  >
                    {SYSTEM_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Target Label */}
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-[10px] font-black text-navavej-gray-med uppercase tracking-widest">Target Label <span className="text-navavej-red">*</span></label>
                  <input
                    type="text"
                    required
                    value={form.target_label}
                    onChange={(e) => setForm((f) => ({ ...f, target_label: e.target.value }))}
                    className="px-3 py-2 border border-navavej-border rounded-lg text-xs font-medium outline-none focus:border-navavej-teal/50"
                    placeholder="e.g. Systolic blood pressure"
                  />
                </div>

                {/* Mapping Type */}
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-[10px] font-black text-navavej-gray-med uppercase tracking-widest">Mapping Type</label>
                  <select
                    value={form.mapping_type}
                    onChange={(e) => setForm((f) => ({ ...f, mapping_type: e.target.value }))}
                    className="px-3 py-2 border border-navavej-border rounded-lg text-xs font-bold outline-none bg-white focus:border-navavej-teal/50"
                  >
                    {MAP_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setForm(EMPTY_FORM); }}
                  className="flex-1 py-3 border-2 border-navavej-border text-navavej-gray-dark bg-white hover:bg-navavej-gray-light rounded-xl font-black text-xs uppercase tracking-widest transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-navavej-teal text-white hover:bg-navavej-teal/90 rounded-xl font-black text-xs uppercase tracking-widest transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add as Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
