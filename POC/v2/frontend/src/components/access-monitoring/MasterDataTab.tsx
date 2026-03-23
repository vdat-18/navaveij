"use client";

import React, { useState } from "react";
import { MasterAddOn, MasterProgram } from "@/types/access-monitoring";
import { ChevronDown, ChevronRight } from "lucide-react";

interface MasterDataTabProps {
  programs: MasterProgram[];
  addOns: MasterAddOn[];
}

type MasterTab = "programs" | "addons" | "tiers" | "thresholds";

// ── Tier Rules (static) ────────────────────────────────────────────────────
const TIER_RULES = [
  {
    id: "PREMIUM_SEVERE_SINGLE",
    priority: 1,
    tier: "Premium",
    logic: "ANY",
    signals: [
      "ckd_rapid_progression",
      "ascvd_very_high",
      "hypertensive_crisis",
      "diabetes_confirmed + dm_organ_complication_screening",
      "liver_enzyme_elevation_significant + fibroscan_indication",
    ],
  },
  {
    id: "PREMIUM_MULTI_SIGNAL",
    priority: 2,
    tier: "Premium",
    logic: "COUNT ≥ 3",
    signals: [
      "ascvd_high",
      "hba1c_elevated",
      "ckd_stage3_or_above",
      "bmi_obese",
      "ldl_very_high",
      "microalbuminuria_present",
      "liver_enzyme_elevation",
      "symptom_chest_pain",
      "symptom_dyspnea_on_exertion",
      "symptom_palpitations",
      "metabolic_syndrome",
      "family_hx_colon_ca_first_degree",
    ],
  },
  {
    id: "ADVANCED_METABOLIC_OR_CVD",
    priority: 3,
    tier: "Advanced",
    logic: "ANY",
    signals: [
      "metabolic_syndrome",
      "ascvd_intermediate",
      "bmi_overweight",
      "hba1c_prediabetes",
      "ckd_stage2",
      "ldl_borderline_high",
      "liver_enzyme_elevation",
      "cholesterol_screening_gap",
      "thyroid_screening_gap",
    ],
  },
  {
    id: "STANDARD_DEFAULT",
    priority: 4,
    tier: "Standard",
    logic: "FALLBACK",
    signals: ["(No conditions — matches all remaining patients)"],
  },
];

// ── Clinical Thresholds (static) ───────────────────────────────────────────
const THRESHOLDS = [
  { biomarker: "BMI (Asian)", normal: "< 23 kg/m²", alert: "≥ 25 kg/m² (Obese)", guideline: "WHO/IOTF 2000" },
  { biomarker: "Blood Pressure", normal: "< 120 / < 80 mmHg", alert: "≥ 140 / 90 mmHg (Stage 2)", guideline: "ACC/AHA 2017" },
  { biomarker: "HbA1c", normal: "< 5.7%", alert: "≥ 6.5% (Diabetes)", guideline: "ADA 2024" },
  { biomarker: "Fasting Blood Sugar", normal: "70–99 mg/dL", alert: "≥ 126 mg/dL", guideline: "ADA 2024" },
  { biomarker: "eGFR", normal: "≥ 90 mL/min/1.73m²", alert: "< 60 (Stage 3+)", guideline: "KDIGO 2022" },
  { biomarker: "LDL Cholesterol", normal: "< 100 mg/dL", alert: "≥ 160 mg/dL", guideline: "ACC/AHA 2018" },
];

// ── Helpers ────────────────────────────────────────────────────────────────
const TIER_MAP: Record<string, string> = {
  PREM: "Premium", DIAM: "Premium",
  ADV: "Advanced", PLUS: "Advanced",
  STD: "Standard", BASIC: "Standard",
};

function tierFromCode(code: string) {
  const prefix = code.split("_")[0];
  return TIER_MAP[prefix] ?? "Standard";
}

function tierBadgeClass(tier: string) {
  if (tier === "Premium") return "bg-purple-100 text-purple-700";
  if (tier === "Advanced") return "bg-blue-100 text-blue-700";
  return "bg-slate-100 text-slate-600";
}

function statusBadgeClass(status: string) {
  const s = status.toLowerCase();
  if (s === "active") return "bg-emerald-100 text-emerald-700";
  if (s === "inactive") return "bg-slate-100 text-slate-600";
  if (s === "draft") return "bg-blue-100 text-blue-700";
  return "bg-navavej-gray-light text-navavej-gray-med";
}

const CAT_COLORS: Record<string, string> = {
  cancer_screening: "bg-rose-100 text-rose-700",
  cardiac: "bg-red-100 text-red-700",
  metabolic: "bg-amber-100 text-amber-700",
  liver: "bg-orange-100 text-orange-700",
  renal: "bg-blue-100 text-blue-700",
  vaccination: "bg-green-100 text-green-700",
  imaging: "bg-purple-100 text-purple-700",
};

function catBadgeClass(cat: string) {
  return CAT_COLORS[cat] ?? "bg-navavej-gray-light text-navavej-gray-med";
}

function priorityBadgeClass(p: number) {
  if (p === 1) return "bg-red-100 text-red-700";
  if (p === 2) return "bg-orange-100 text-orange-700";
  if (p === 3) return "bg-blue-100 text-blue-700";
  return "bg-slate-100 text-slate-600";
}

function InnerTabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border-b-2 transition-colors ${
        active ? "text-navavej-teal border-navavej-teal" : "text-navavej-gray-med border-transparent hover:text-navavej-gray-dark"
      }`}
    >
      {label}
    </button>
  );
}

// ── Programs Sub-tab ───────────────────────────────────────────────────────
function ProgramsTab({ programs }: { programs: MasterProgram[] }) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-left min-w-[800px]">
        <thead>
          <tr className="bg-navavej-gray-light/40">
            <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest">Code</th>
            <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest">Program</th>
            <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest">Tier</th>
            <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest">Price THB</th>
            <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest">Age Band</th>
            <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest">Gender</th>
            <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest">Status</th>
          </tr>
        </thead>
        <tbody>
          {programs.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-3 py-6 text-center text-xs text-navavej-gray-med">No programs loaded.</td>
            </tr>
          ) : programs.map((p) => {
            const tier = tierFromCode(p.program_code);
            return (
              <tr key={p.program_code} className="border-t border-navavej-border hover:bg-navavej-gray-light/20">
                <td className="px-3 py-2 text-xs font-black">{p.program_code}</td>
                <td className="px-3 py-2 text-xs font-bold">{p.program_name}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${tierBadgeClass(tier)}`}>{tier}</span>
                </td>
                <td className="px-3 py-2 text-xs font-bold">{p.price_thb.toLocaleString()}</td>
                <td className="px-3 py-2 text-xs font-bold">{p.target_ages}</td>
                <td className="px-3 py-2 text-xs font-bold">{p.gender}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black capitalize ${statusBadgeClass(p.status)}`}>{p.status}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Add-On Library Sub-tab ─────────────────────────────────────────────────
function AddOnLibraryTab({ addOns }: { addOns: MasterAddOn[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="overflow-auto">
      <table className="w-full text-left min-w-[860px]">
        <thead>
          <tr className="bg-navavej-gray-light/40">
            <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest">Label</th>
            <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest">Category</th>
            <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest">Price</th>
            <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest">Gender</th>
            <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest">Age Range</th>
            <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest">Triggers</th>
            <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest">Status</th>
          </tr>
        </thead>
        <tbody>
          {addOns.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-3 py-6 text-center text-xs text-navavej-gray-med">No add-on items loaded.</td>
            </tr>
          ) : addOns.map((item) => {
            const isOpen = expanded === item.item_code;
            const genderLabel = !item.gender_constraint ? "Any" : item.gender_constraint;
            const genderClass = item.gender_constraint === "male"
              ? "bg-blue-100 text-blue-700"
              : item.gender_constraint === "female"
              ? "bg-pink-100 text-pink-700"
              : "bg-navavej-gray-light text-navavej-gray-med";
            const ageRange = `${item.age_min ?? "—"}–${item.age_max ?? "—"} yr`;
            const priceLabel = item.price_thb != null ? `${item.price_thb.toLocaleString()} ฿` : "TBD";

            return (
              <React.Fragment key={item.item_code}>
                <tr
                  className="border-t border-navavej-border hover:bg-navavej-gray-light/20 cursor-pointer"
                  onClick={() => setExpanded(isOpen ? null : item.item_code)}
                >
                  <td className="px-3 py-2 text-xs font-bold">
                    <div className="flex items-center gap-1.5">
                      {isOpen
                        ? <ChevronDown className="w-3 h-3 text-navavej-teal flex-shrink-0" />
                        : <ChevronRight className="w-3 h-3 text-navavej-gray-med flex-shrink-0" />}
                      <span>{item.label}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${catBadgeClass(item.category)}`}>
                      {item.category.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs font-bold">{priceLabel}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${genderClass}`}>{genderLabel}</span>
                  </td>
                  <td className="px-3 py-2 text-xs font-bold">{ageRange}</td>
                  <td className="px-3 py-2 text-xs font-bold text-navavej-gray-med">
                    {item.trigger_signals.length} signal{item.trigger_signals.length !== 1 ? "s" : ""}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black capitalize ${statusBadgeClass(item.status)}`}>{item.status}</span>
                  </td>
                </tr>
                {isOpen && (
                  <tr className="border-t border-navavej-border bg-navavej-gray-light/30">
                    <td colSpan={7} className="px-6 py-3">
                      <p className="text-[10px] font-black text-navavej-gray-med uppercase tracking-widest mb-1.5">Trigger Signals</p>
                      <ul className="flex flex-wrap gap-1.5">
                        {item.trigger_signals.map((sig) => (
                          <li key={sig} className="px-2 py-0.5 bg-white border border-navavej-border rounded text-[10px] font-bold text-navavej-gray-dark">
                            {sig}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Tier Rules Sub-tab ─────────────────────────────────────────────────────
const SIGNALS_SHOW_LIMIT = 5;

function TierRulesTab() {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {TIER_RULES.map((rule) => {
        const isExpanded = expandedCard === rule.id;
        const visibleSignals = isExpanded ? rule.signals : rule.signals.slice(0, SIGNALS_SHOW_LIMIT);
        const hasMore = rule.signals.length > SIGNALS_SHOW_LIMIT;

        return (
          <div key={rule.id} className="navavej-card p-4 border border-navavej-border rounded-xl space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${priorityBadgeClass(rule.priority)}`}>
                P{rule.priority}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${tierBadgeClass(rule.tier)}`}>{rule.tier}</span>
              <span className="text-[10px] font-black text-navavej-gray-med uppercase tracking-widest">{rule.logic}</span>
            </div>
            <p className="text-xs font-black text-navavej-gray-dark font-mono">{rule.id}</p>
            <ul className="space-y-1">
              {visibleSignals.map((sig) => (
                <li key={sig} className="flex items-start gap-1.5 text-[11px] text-navavej-gray-dark">
                  <span className="text-navavej-teal font-black mt-0.5">•</span>
                  <span className="font-mono">{sig}</span>
                </li>
              ))}
            </ul>
            {hasMore && (
              <button
                type="button"
                onClick={() => setExpandedCard(isExpanded ? null : rule.id)}
                className="text-[10px] font-black text-navavej-teal uppercase tracking-widest hover:underline"
              >
                {isExpanded ? "Show less" : `+ ${rule.signals.length - SIGNALS_SHOW_LIMIT} more`}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Clinical Thresholds Sub-tab ────────────────────────────────────────────
function ThresholdsTab() {
  return (
    <div className="overflow-auto">
      <table className="w-full text-left min-w-[640px]">
        <thead>
          <tr className="bg-navavej-gray-light/40">
            <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest">Biomarker</th>
            <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest">Normal Range</th>
            <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest">Alert Threshold</th>
            <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest">Guideline</th>
          </tr>
        </thead>
        <tbody>
          {THRESHOLDS.map((row) => (
            <tr key={row.biomarker} className="border-t border-navavej-border hover:bg-navavej-gray-light/20">
              <td className="px-3 py-2 text-xs font-black">{row.biomarker}</td>
              <td className="px-3 py-2 text-xs font-bold text-green-700">{row.normal}</td>
              <td className="px-3 py-2 text-xs font-bold text-navavej-red">{row.alert}</td>
              <td className="px-3 py-2 text-xs text-navavej-gray-med">{row.guideline}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export function MasterDataTab({ programs, addOns }: MasterDataTabProps) {
  const [innerTab, setInnerTab] = useState<MasterTab>("programs");

  const TAB_LABELS: { key: MasterTab; label: string }[] = [
    { key: "programs", label: "Programs" },
    { key: "addons", label: "Add-On Library" },
    { key: "tiers", label: "Tier Rules" },
    { key: "thresholds", label: "Clinical Thresholds" },
  ];

  return (
    <div className="navavej-card p-6 flex flex-col gap-4">
      <div className="flex gap-1 border-b border-navavej-border">
        {TAB_LABELS.map(({ key, label }) => (
          <InnerTabButton key={key} label={label} active={innerTab === key} onClick={() => setInnerTab(key)} />
        ))}
      </div>

      {innerTab === "programs" && <ProgramsTab programs={programs} />}
      {innerTab === "addons" && <AddOnLibraryTab addOns={addOns} />}
      {innerTab === "tiers" && <TierRulesTab />}
      {innerTab === "thresholds" && <ThresholdsTab />}
    </div>
  );
}
