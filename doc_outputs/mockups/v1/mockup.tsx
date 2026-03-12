import { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";

/* ─────────────────────────────────────────────
   MOCK DATA
───────────────────────────────────────────── */
const trendData = [
  { year: "2020 Q1", glucose: 92, cholesterol: 188, bmi: 23.4, bp: 118 },
  { year: "2020 Q3", glucose: 96, cholesterol: 195, bmi: 23.8, bp: 121 },
  { year: "2021 Q1", glucose: 101, cholesterol: 203, bmi: 24.1, bp: 124 },
  { year: "2021 Q3", glucose: 108, cholesterol: 218, bmi: 24.7, bp: 128 },
  { year: "2022 Q1", glucose: 115, cholesterol: 226, bmi: 25.2, bp: 132 },
  { year: "2022 Q3", glucose: 118, cholesterol: 231, bmi: 25.6, bp: 135 },
  { year: "2023 Q1", glucose: 122, cholesterol: 240, bmi: 26.1, bp: 138 },
  { year: "2023 Q3", glucose: 119, cholesterol: 228, bmi: 25.8, bp: 134 },
  { year: "2024 Q1", glucose: 124, cholesterol: 235, bmi: 26.3, bp: 140 },
  { year: "2024 Q3", glucose: 127, cholesterol: 242, bmi: 26.7, bp: 143 },
];

const timelineEvents = [
  { year: "2021 Q1", event: "Pre-diabetic threshold crossed (Glucose 101)", type: "warning", icon: "⚠" },
  { year: "2021 Q3", event: "HbA1c elevated — follow-up ordered", type: "alert", icon: "🔴" },
  { year: "2022 Q1", event: "Dyslipidemia diagnosed", type: "diagnosis", icon: "🔵" },
  { year: "2022 Q3", event: "Statin therapy initiated", type: "treatment", icon: "💊" },
  { year: "2023 Q1", event: "BP reached Stage 1 Hypertension", type: "alert", icon: "🔴" },
  { year: "2023 Q3", event: "Diet intervention — partial improvement", type: "info", icon: "✅" },
  { year: "2024 Q1", event: "Annual full check — all markers elevated", type: "alert", icon: "🔴" },
];

const screeningGaps = [
  { test: "HbA1c", lastDone: "Apr 2023", dueDate: "Apr 2024", status: "overdue", daysOver: 180 },
  { test: "Lipid Panel", lastDone: "Jan 2024", dueDate: "Jan 2025", status: "due", daysOver: 60 },
  { test: "Colonoscopy", lastDone: "Never", dueDate: "Recommended at 45", status: "missing", daysOver: 999 },
  { test: "Eye Exam (Diabetic)", lastDone: "Jun 2023", dueDate: "Jun 2024", status: "overdue", daysOver: 210 },
  { test: "Microalbumin (Urine)", lastDone: "Mar 2024", dueDate: "Mar 2025", status: "upcoming", daysOver: -14 },
  { test: "Chest X-Ray", lastDone: "Nov 2023", dueDate: "Nov 2024", status: "due", daysOver: 45 },
];

const auditLogs = [
  { id: "L-9821", user: "Dr. Somchai K.", role: "Physician", patient: "PT-00421", action: "VIEW", time: "10:42:33", risk: "normal", ip: "192.168.1.45" },
  { id: "L-9822", user: "Nurse Ploy T.", role: "Nurse", patient: "PT-00187", action: "VIEW", time: "10:43:11", risk: "normal", ip: "192.168.1.62" },
  { id: "L-9823", user: "Admin Krit S.", role: "Admin", patient: "PT-00199", action: "EXPORT", time: "10:44:02", risk: "high", ip: "10.0.0.14" },
  { id: "L-9824", user: "Dr. Nida W.", role: "Physician", patient: "PT-00038", action: "EDIT", time: "10:44:55", risk: "normal", ip: "192.168.2.11" },
  { id: "L-9825", user: "Nurse Ploy T.", role: "Nurse", patient: "PT-00421", action: "VIEW", time: "10:45:22", risk: "warning", ip: "192.168.1.62" },
  { id: "L-9826", user: "Unknown", role: "—", patient: "PT-00842", action: "EXPORT", time: "10:46:01", risk: "critical", ip: "203.150.2.88" },
  { id: "L-9827", user: "Dr. Somchai K.", role: "Physician", patient: "PT-00522", action: "VIEW", time: "10:47:14", risk: "normal", ip: "192.168.1.45" },
];

const anomalies = [
  { id: "AN-001", user: "Admin Krit S.", type: "Mass Export", detail: "47 records exported in 4 minutes", severity: "critical", time: "10:44" },
  { id: "AN-002", user: "Nurse Ploy T.", type: "Off-Dept Access", detail: "Accessed oncology ward records (not in care team)", severity: "high", time: "10:45" },
  { id: "AN-003", user: "Unknown IP", type: "External Access", detail: "Export from unregistered IP 203.150.2.88", severity: "critical", time: "10:46" },
  { id: "AN-004", user: "Dr. Wanchai P.", type: "After-Hours", detail: "Login at 02:17 AM — deviation from 6-month baseline", severity: "medium", time: "02:17" },
];

const roles = [
  { role: "Physician", view: true, edit: true, export: false, admin: false, count: 12 },
  { role: "Nurse", view: true, edit: false, export: false, admin: false, count: 34 },
  { role: "Admin", view: true, edit: true, export: true, admin: true, count: 4 },
  { role: "DPO", view: true, edit: false, export: true, admin: true, count: 2 },
  { role: "Receptionist", view: false, edit: false, export: false, admin: false, count: 9 },
  { role: "Lab Tech", view: true, edit: false, export: false, admin: false, count: 8 },
];

const masterPrograms = [
  { code: "PKG-001", name: "Executive Gold", tests: 48, lastUpdated: "2024-11-01", status: "active" },
  { code: "PKG-002", name: "Cardiac Screen Plus", tests: 22, lastUpdated: "2024-10-15", status: "active" },
  { code: "PKG-003", name: "Diabetes Annual", tests: 15, lastUpdated: "2024-09-20", status: "active" },
  { code: "PKG-004", name: "Women's Wellness 40+", tests: 31, lastUpdated: "2024-08-01", status: "active" },
  { code: "PKG-005", name: "Basic Wellness", tests: 12, lastUpdated: "2024-07-11", status: "inactive" },
];

const mappingCodes = [
  { internal: "GLUC-FBS", fhir: "59261-8", description: "Fasting Blood Glucose", category: "Lab", status: "mapped" },
  { internal: "CHOL-LDL", fhir: "18262-6", description: "LDL Cholesterol", category: "Lab", status: "mapped" },
  { internal: "DIAG-T2DM", fhir: "44054006", description: "Type 2 Diabetes Mellitus", category: "Diagnosis", status: "mapped" },
  { internal: "PROC-ECG", fhir: "29303009", description: "12-lead ECG", category: "Procedure", status: "pending" },
  { internal: "VACC-FLU24", fhir: "49281-0422-10", description: "Influenza Vaccine 2024", category: "Vaccine", status: "mapped" },
];

/* ─────────────────────────────────────────────
   COLOR SYSTEM
───────────────────────────────────────────── */
const C = {
  bg: "#0b0f1a",
  surface: "#111827",
  surface2: "#1a2235",
  border: "#1e2d47",
  accent: "#00c9a7",
  accentDim: "rgba(0,201,167,0.12)",
  red: "#ff4d6a",
  redDim: "rgba(255,77,106,0.12)",
  yellow: "#f59e0b",
  yellowDim: "rgba(245,158,11,0.12)",
  blue: "#3b9eff",
  blueDim: "rgba(59,158,255,0.12)",
  text: "#e2e8f0",
  muted: "#64748b",
  white: "#ffffff",
};

/* ─────────────────────────────────────────────
   SHARED COMPONENTS
───────────────────────────────────────────── */
const Card = ({ children, style, className }) => (
  <div style={{
    background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 12, padding: "20px 24px", ...style
  }} className={className}>{children}</div>
);

const Tag = ({ color, children, dot }) => {
  const map = { red: [C.red, C.redDim], yellow: [C.yellow, C.yellowDim], green: [C.accent, C.accentDim], blue: [C.blue, C.blueDim] };
  const [fg, bg] = map[color] || [C.muted, "rgba(100,116,139,0.15)"];
  return (
    <span style={{ background: bg, color: fg, border: `1px solid ${fg}33`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", display: "inline-flex", alignItems: "center", gap: 5 }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: fg, display: "inline-block" }} />}
      {children}
    </span>
  );
};

const SectionLabel = ({ children }) => (
  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.15em", color: C.muted, textTransform: "uppercase", marginBottom: 14 }}>{children}</div>
);

/* ─────────────────────────────────────────────
   SCREEN 1 — Individual Summary & Recommendation
───────────────────────────────────────────── */
function Screen1() {
  const [scriptOpen, setScriptOpen] = useState(false);
  const [confidence] = useState(87);

  const addOns = [
    { name: "HbA1c (Glycated Hemoglobin)", reason: "Glucose trending up 4 consecutive visits", priority: "red" },
    { name: "Microalbumin (Urine)", reason: "Early nephropathy screening — DM risk", priority: "yellow" },
    { name: "Ophthalmology Referral", reason: "Diabetic eye screening overdue 210 days", priority: "red" },
    { name: "Ankle-Brachial Index", reason: "PAD risk — BMI + BP + lipid combo", priority: "yellow" },
    { name: "Sleep Apnea Screening", reason: "BMI 26.7 + hypertension pattern", priority: "yellow" },
  ];

  const reasoning = [
    { factor: "Fasting Glucose 127 mg/dL", weight: 92, note: "IFG/Pre-DM classification (ADA 2024)" },
    { factor: "Total Cholesterol 242 mg/dL", weight: 85, note: "Borderline High — NCEP ATP III" },
    { factor: "BP 143/91 mmHg", weight: 78, note: "Stage 1 Hypertension — ACC/AHA 2017" },
    { factor: "BMI 26.7 (Overweight)", weight: 65, note: "WHO Asia-Pacific cutoff: ≥23 = risk" },
    { factor: "Age 52, Male", weight: 72, note: "10-year ASCVD risk: 14.2%" },
    { factor: "Family Hx: T2DM (Father)", weight: 80, note: "Genetic risk factor — 2× relative risk" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, height: "calc(100vh - 120px)", overflowY: "auto" }}>
      {/* LEFT COLUMN */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Recommended Program */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <SectionLabel>Recommended Program</SectionLabel>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.white, letterSpacing: "-0.02em" }}>
                Executive Metabolic Screen <span style={{ color: C.accent }}>Plus+</span>
              </div>
              <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>Package PKG-002-EXT · 31 examinations included</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <Tag color="red" dot>HIGH PRIORITY</Tag>
              <div style={{ color: C.muted, fontSize: 11, marginTop: 6 }}>Recommend within 14 days</div>
            </div>
          </div>

          {/* Confidence Score */}
          <div style={{ background: C.surface2, borderRadius: 10, padding: "16px 20px", display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
              <svg viewBox="0 0 72 72" style={{ transform: "rotate(-90deg)", width: 72, height: 72 }}>
                <circle cx="36" cy="36" r="30" fill="none" stroke={C.border} strokeWidth="6" />
                <circle cx="36" cy="36" r="30" fill="none" stroke={C.accent} strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 30 * confidence / 100} ${2 * Math.PI * 30 * (1 - confidence / 100)}`}
                  strokeLinecap="round" />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: C.accent }}>{confidence}%</div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.white }}>AI Confidence Score</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Based on 6 clinical parameters · Model v3.2.1</div>
              <div style={{ fontSize: 11, color: C.accent, marginTop: 5 }}>↑ High Confidence — Recommend with clinical review</div>
            </div>
          </div>
        </Card>

        {/* Explainable AI Reasoning */}
        <Card>
          <SectionLabel>Logical Reasoning — Explainable AI</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {reasoning.map((r, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 160px auto", gap: 12, alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{r.factor}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{r.note}</div>
                </div>
                <div style={{ background: C.surface2, borderRadius: 4, height: 6, overflow: "hidden" }}>
                  <div style={{ width: `${r.weight}%`, height: "100%", background: r.weight > 80 ? C.red : r.weight > 65 ? C.yellow : C.accent, borderRadius: 4, transition: "width 1s ease" }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: r.weight > 80 ? C.red : r.weight > 65 ? C.yellow : C.accent, width: 36, textAlign: "right" }}>{r.weight}%</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, background: C.accentDim, border: `1px solid ${C.accent}33`, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: C.text }}>
            <span style={{ color: C.accent, fontWeight: 700 }}>Model Reasoning: </span>
            Patient presents with a metabolic syndrome cluster (3/5 criteria met). Upward trajectory across all markers over 4 years suggests accelerating cardiometabolic risk. Recommend immediate intervention-focused screening with diabetes and cardiovascular modules.
          </div>
        </Card>

        {/* Add-on List */}
        <Card>
          <SectionLabel>Add-on Examinations</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {addOns.map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: C.surface2, borderRadius: 8, border: `1px solid ${C.border}` }}>
                <Tag color={a.priority}>{a.priority.toUpperCase()}</Tag>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: C.white, fontWeight: 600 }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{a.reason}</div>
                </div>
                <button style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 10px", color: C.muted, fontSize: 11, cursor: "pointer" }}>Add</button>
              </div>
            ))}
          </div>
        </Card>

        {/* Screening Gap */}
        <Card>
          <SectionLabel>Screening Gap / Overdue List</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {screeningGaps.map((s, i) => {
              const color = s.status === "overdue" || s.status === "missing" ? "red" : s.status === "due" ? "yellow" : "green";
              const label = s.status === "overdue" ? `${s.daysOver}d overdue` : s.status === "missing" ? "Never done" : s.status === "due" ? `${s.daysOver}d due` : "Upcoming";
              return (
                <div key={i} style={{ background: C.surface2, borderRadius: 8, padding: "12px", border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{s.test}</div>
                  <div style={{ fontSize: 10, color: C.muted, margin: "3px 0 8px" }}>Last: {s.lastDone}</div>
                  <Tag color={color}>{label}</Tag>
                </div>
              );
            })}
          </div>
        </Card>

        {/* User Script */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setScriptOpen(o => !o)}>
            <div>
              <SectionLabel>Communication Script</SectionLabel>
              <div style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>Standard Patient Communication Guide</div>
            </div>
            <div style={{ color: C.muted, fontSize: 18 }}>{scriptOpen ? "▲" : "▼"}</div>
          </div>
          {scriptOpen && (
            <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { step: "Opening", text: "\"สวัสดีครับ/ค่ะ คุณ [ชื่อผู้รับบริการ] วันนี้ผมจะอธิบายผลการตรวจสุขภาพและข้อแนะนำโปรแกรมที่เหมาะสมสำหรับท่านนะครับ/ค่ะ\"" },
                  { step: "Summary", text: "\"จากผลการตรวจล่าสุด พบว่าค่าน้ำตาลและไขมันในเลือดของท่านมีแนวโน้มสูงขึ้นต่อเนื่อง ซึ่งอาจเพิ่มความเสี่ยงต่อโรคเบาหวานและโรคหัวใจ\"" },
                  { step: "Recommendation", text: "\"ระบบแนะนำโปรแกรม Executive Metabolic Screen Plus+ ซึ่งครอบคลุมการตรวจ 31 รายการ เหมาะสมกับสภาวะสุขภาพของท่านมากที่สุด\"" },
                  { step: "Q&A Handling", text: "\"หากท่านมีคำถามเพิ่มเติมเกี่ยวกับรายการตรวจ ทีมแพทย์พร้อมให้คำปรึกษาก่อนเริ่มโปรแกรมครับ/ค่ะ\"" },
                ].map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: C.accent, background: C.accentDim, padding: "4px 8px", borderRadius: 6, letterSpacing: "0.05em", height: "fit-content", whiteSpace: "nowrap" }}>{s.step}</div>
                    <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>{s.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* RIGHT COLUMN — High Alert */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card style={{ background: "#1a0e12", border: `1px solid ${C.red}44` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.red, boxShadow: `0 0 8px ${C.red}` }} />
            <SectionLabel>Patient High Alert</SectionLabel>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Fasting Glucose", value: "127 mg/dL", ref: "70–100", status: "CRITICAL" },
              { label: "LDL Cholesterol", value: "158 mg/dL", ref: "<100 (DM target)", status: "HIGH" },
              { label: "Blood Pressure", value: "143/91", ref: "<130/80", status: "HIGH" },
              { label: "HbA1c", value: "MISSING", ref: "Required", status: "MISSING" },
            ].map((item, i) => (
              <div key={i} style={{ background: C.surface, borderRadius: 8, padding: "10px 12px", border: `1px solid ${item.status === "MISSING" ? C.yellow + "44" : C.red + "33"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 12, color: C.muted }}>{item.label}</div>
                  <Tag color={item.status === "MISSING" ? "yellow" : "red"}>{item.status}</Tag>
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: item.status === "MISSING" ? C.yellow : C.red, letterSpacing: "-0.02em", marginTop: 2 }}>{item.value}</div>
                <div style={{ fontSize: 10, color: C.muted }}>Ref: {item.ref}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Patient Info */}
        <Card>
          <SectionLabel>Patient Profile</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accent}, ${C.blue})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: C.bg }}>S</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.white }}>Somchai Wattana</div>
                <div style={{ fontSize: 11, color: C.muted }}>HN: PT-00421 · Male · 52 yrs</div>
              </div>
            </div>
            {[
              ["Last Visit", "Jan 15, 2025"],
              ["Risk Score", "14.2% (High)"],
              ["Program History", "Basic Wellness × 3"],
              ["Insurance", "BUPA Gold Executive"],
              ["Primary MD", "Dr. Nida Wongsa"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }}>
                <span style={{ color: C.muted }}>{k}</span>
                <span style={{ color: C.text, fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick stats */}
        <Card>
          <SectionLabel>Risk Indicators</SectionLabel>
          {[
            { label: "ASCVD 10yr Risk", value: "14.2%", color: "red" },
            { label: "Diabetes Risk Score", value: "High", color: "red" },
            { label: "Metabolic Syndrome", value: "3/5 criteria", color: "yellow" },
            { label: "Compliance Rate", value: "61%", color: "yellow" },
          ].map((r, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < 3 ? `1px solid ${C.border}` : "none" }}>
              <span style={{ fontSize: 12, color: C.muted }}>{r.label}</span>
              <Tag color={r.color}>{r.value}</Tag>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SCREEN 2 — Trend & Timeline
───────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px" }}>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ fontSize: 12, color: p.color, fontWeight: 600 }}>{p.name}: {p.value}</div>
        ))}
      </div>
    );
  }
  return null;
};

function Screen2() {
  const [activeMetric, setActiveMetric] = useState("glucose");
  const metrics = [
    { key: "glucose", label: "Glucose (mg/dL)", color: C.red, ref: 100 },
    { key: "cholesterol", label: "Cholesterol (mg/dL)", color: C.yellow, ref: 200 },
    { key: "bmi", label: "BMI", color: C.blue, ref: 23 },
    { key: "bp", label: "Systolic BP (mmHg)", color: "#a78bfa", ref: 130 },
  ];
  const active = metrics.find(m => m.key === activeMetric);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "calc(100vh - 120px)", overflowY: "auto" }}>
      {/* Metric Selector */}
      <Card style={{ padding: "14px 20px" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {metrics.map(m => (
            <button key={m.key} onClick={() => setActiveMetric(m.key)} style={{
              padding: "7px 16px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer",
              background: activeMetric === m.key ? m.color : C.surface2,
              color: activeMetric === m.key ? C.bg : C.muted,
              border: `1px solid ${activeMetric === m.key ? m.color : C.border}`,
              transition: "all 0.2s"
            }}>{m.label}</button>
          ))}
        </div>
      </Card>

      {/* Main Trend Chart */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <SectionLabel>Trend Visualization — 4 Year History</SectionLabel>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.white }}>{active.label}</div>
          </div>
          <div style={{ fontSize: 11, color: C.muted, background: C.surface2, padding: "4px 10px", borderRadius: 6 }}>
            Ref: <span style={{ color: C.accent }}>≤ {active.ref}</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={active.color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={active.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
            <XAxis dataKey="year" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={active.ref} stroke={active.color} strokeDasharray="5 5" opacity={0.5} label={{ value: "Threshold", fill: active.color, fontSize: 10, position: "right" }} />
            <Area type="monotone" dataKey={active.key} stroke={active.color} strokeWidth={2.5} fill="url(#aGrad)" name={active.label} dot={{ fill: active.color, r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* All metrics small charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {metrics.map(m => (
          <Card key={m.key} style={{ cursor: "pointer", borderColor: activeMetric === m.key ? m.color + "55" : C.border }} onClick={() => setActiveMetric(m.key)}>
            <div style={{ fontSize: 11, color: m.color, fontWeight: 700, marginBottom: 8 }}>{m.label}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 900, color: C.white }}>{trendData[trendData.length - 1][m.key]}</span>
              <span style={{ fontSize: 11, color: trendData[trendData.length - 1][m.key] > m.ref ? C.red : C.accent }}>
                {trendData[trendData.length - 1][m.key] > m.ref ? "↑ Above ref" : "✓ In range"}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={60}>
              <LineChart data={trendData}>
                <Line type="monotone" dataKey={m.key} stroke={m.color} strokeWidth={2} dot={false} />
                <ReferenceLine y={m.ref} stroke={m.color} strokeDasharray="3 3" opacity={0.4} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        ))}
      </div>

      {/* Timeline */}
      <Card>
        <SectionLabel>Clinical Timeline — Significant Events</SectionLabel>
        <div style={{ position: "relative", paddingLeft: 24 }}>
          <div style={{ position: "absolute", left: 8, top: 0, bottom: 0, width: 2, background: `linear-gradient(to bottom, ${C.red}, ${C.blue})`, borderRadius: 2 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {timelineEvents.map((ev, i) => {
              const clr = ev.type === "alert" ? C.red : ev.type === "warning" ? C.yellow : ev.type === "diagnosis" ? C.blue : ev.type === "treatment" ? "#a78bfa" : C.accent;
              return (
                <div key={i} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: i < timelineEvents.length - 1 ? `1px dashed ${C.border}` : "none" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: clr, flexShrink: 0, marginTop: 3, boxShadow: `0 0 6px ${clr}88`, marginLeft: -3 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{ev.event}</div>
                      <div style={{ fontSize: 10, color: C.muted, background: C.surface2, padding: "3px 8px", borderRadius: 4, whiteSpace: "nowrap", marginLeft: 8 }}>{ev.year}</div>
                    </div>
                    <div style={{ fontSize: 10, color: clr, marginTop: 2, textTransform: "capitalize" }}>{ev.type.replace("-", " ")}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SCREEN 3 — Access Monitoring Dashboard
───────────────────────────────────────────── */
function Screen3() {
  const [activeTab, setActiveTab] = useState("monitoring");
  const [logFilter, setLogFilter] = useState({ user: "", patientId: "", action: "ALL" });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 3000);
    return () => clearInterval(t);
  }, []);

  const activeUsers = 47 + (tick % 3) - 1;
  const accessCount = 1284 + tick * 3;

  const filteredLogs = auditLogs.filter(l => {
    const u = l.user.toLowerCase().includes(logFilter.user.toLowerCase());
    const p = l.patient.toLowerCase().includes(logFilter.patientId.toLowerCase());
    const a = logFilter.action === "ALL" || l.action === logFilter.action;
    return u && p && a;
  });

  const tabs = [
    { id: "monitoring", label: "Real-time Monitor" },
    { id: "anomaly", label: "Anomaly Detection" },
    { id: "audit", label: "Audit Log" },
    { id: "roles", label: "Role & Permissions" },
    { id: "mapping", label: "Mapping Tool" },
    { id: "master", label: "Master Data" },
  ];

  const riskColor = r => r === "critical" ? C.red : r === "high" ? C.red : r === "warning" ? C.yellow : C.accent;
  const riskLabel = r => r === "critical" ? "red" : r === "high" ? "red" : r === "warning" ? "yellow" : "green";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "calc(100vh - 120px)", overflow: "hidden" }}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: C.surface, borderRadius: 10, padding: 4, border: `1px solid ${C.border}` }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flex: 1, padding: "8px 4px", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer", border: "none",
            background: activeTab === t.id ? C.accent : "transparent",
            color: activeTab === t.id ? C.bg : C.muted,
            transition: "all 0.2s", letterSpacing: "0.02em"
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── REAL-TIME MONITORING ── */}
        {activeTab === "monitoring" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {[
                { label: "Active Users", value: activeUsers, sub: "online now", color: C.accent },
                { label: "Record Accesses", value: accessCount.toLocaleString(), sub: "today total", color: C.blue },
                { label: "Critical Alerts", value: "3", sub: "require action", color: C.red },
                { label: "Exports Today", value: "14", sub: "2 flagged", color: C.yellow },
              ].map((s, i) => (
                <Card key={i} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: s.color, letterSpacing: "-0.03em" }}>{s.value}</div>
                  <div style={{ fontSize: 13, color: C.text, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>{s.sub}</div>
                </Card>
              ))}
            </div>
            <Card>
              <SectionLabel>Live Access Activity</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {auditLogs.map((l, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "90px 1fr 100px 80px 80px 90px", gap: 8, alignItems: "center", padding: "10px 0", borderBottom: i < auditLogs.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <div style={{ fontSize: 10, color: C.muted, fontFamily: "monospace" }}>{l.time}</div>
                    <div>
                      <div style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{l.user}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>{l.role} · {l.ip}</div>
                    </div>
                    <div style={{ fontSize: 12, color: C.blue, fontWeight: 600 }}>{l.patient}</div>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: l.action === "EXPORT" ? C.yellow : l.action === "EDIT" ? C.blue : C.muted, background: C.surface2, padding: "2px 8px", borderRadius: 4 }}>{l.action}</span>
                    </div>
                    <Tag color={riskLabel(l.risk)}>{l.risk.toUpperCase()}</Tag>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: riskColor(l.risk), boxShadow: `0 0 ${l.risk === "critical" ? "8px" : "4px"} ${riskColor(l.risk)}88`, marginLeft: "auto" }} />
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        {/* ── ANOMALY DETECTION ── */}
        {activeTab === "anomaly" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {anomalies.map((a, i) => (
                <Card key={i} style={{ borderColor: a.severity === "critical" ? C.red + "55" : a.severity === "high" ? C.red + "33" : C.yellow + "44", background: a.severity === "critical" ? "#1a0e12" : C.surface }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <Tag color={a.severity === "critical" ? "red" : a.severity === "high" ? "red" : "yellow"}>{a.severity.toUpperCase()}</Tag>
                    <span style={{ fontSize: 10, color: C.muted, fontFamily: "monospace" }}>{a.time} · {a.id}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.white, marginBottom: 4 }}>{a.type}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{a.detail}</div>
                  <div style={{ fontSize: 11, color: a.severity === "critical" ? C.red : C.yellow }}>User: {a.user}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button style={{ flex: 1, padding: "6px", background: C.redDim, border: `1px solid ${C.red}55`, color: C.red, borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Block User</button>
                    <button style={{ flex: 1, padding: "6px", background: C.surface2, border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Investigate</button>
                    <button style={{ padding: "6px 10px", background: C.surface2, border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Dismiss</button>
                  </div>
                </Card>
              ))}
            </div>
            <Card>
              <SectionLabel>Behavioral Baseline — Access Frequency Today</SectionLabel>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={[
                  { hour: "08:00", normal: 12, anomaly: 0 },
                  { hour: "09:00", normal: 28, anomaly: 0 },
                  { hour: "10:00", normal: 35, anomaly: 47 },
                  { hour: "11:00", normal: 31, anomaly: 0 },
                  { hour: "12:00", normal: 18, anomaly: 0 },
                  { hour: "13:00", normal: 22, anomaly: 0 },
                  { hour: "14:00", normal: 29, anomaly: 0 },
                ]} margin={{ left: -20, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                  <XAxis dataKey="hour" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="normal" fill={C.accentDim} stroke={C.accent} strokeWidth={1} name="Normal" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="anomaly" fill={C.redDim} stroke={C.red} strokeWidth={1} name="Anomaly" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </>
        )}

        {/* ── AUDIT LOG ── */}
        {activeTab === "audit" && (
          <>
            <Card style={{ padding: "14px 20px" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <input placeholder="Search user..." value={logFilter.user} onChange={e => setLogFilter(f => ({ ...f, user: e.target.value }))}
                  style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 12px", color: C.text, fontSize: 12, flex: 1, minWidth: 140, outline: "none" }} />
                <input placeholder="Patient ID..." value={logFilter.patientId} onChange={e => setLogFilter(f => ({ ...f, patientId: e.target.value }))}
                  style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 12px", color: C.text, fontSize: 12, flex: 1, minWidth: 120, outline: "none" }} />
                <select value={logFilter.action} onChange={e => setLogFilter(f => ({ ...f, action: e.target.value }))}
                  style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 12px", color: C.text, fontSize: 12, outline: "none" }}>
                  {["ALL", "VIEW", "EDIT", "EXPORT"].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </Card>
            <Card>
              <SectionLabel>Audit Trail — {filteredLogs.length} records</SectionLabel>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                    {["Log ID", "Time", "User", "Role", "Patient", "Action", "IP", "Risk"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 8px", fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.1em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((l, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, background: l.risk === "critical" ? "#1a0e1244" : "transparent" }}>
                      <td style={{ padding: "9px 8px", fontSize: 11, color: C.muted, fontFamily: "monospace" }}>{l.id}</td>
                      <td style={{ padding: "9px 8px", fontSize: 11, color: C.muted, fontFamily: "monospace" }}>{l.time}</td>
                      <td style={{ padding: "9px 8px", fontSize: 12, color: C.text, fontWeight: 600 }}>{l.user}</td>
                      <td style={{ padding: "9px 8px", fontSize: 11, color: C.muted }}>{l.role}</td>
                      <td style={{ padding: "9px 8px", fontSize: 12, color: C.blue, fontWeight: 600 }}>{l.patient}</td>
                      <td style={{ padding: "9px 8px" }}><span style={{ fontSize: 11, fontWeight: 700, color: l.action === "EXPORT" ? C.yellow : l.action === "EDIT" ? C.blue : C.muted }}>{l.action}</span></td>
                      <td style={{ padding: "9px 8px", fontSize: 10, color: C.muted, fontFamily: "monospace" }}>{l.ip}</td>
                      <td style={{ padding: "9px 8px" }}><Tag color={riskLabel(l.risk)}>{l.risk}</Tag></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </>
        )}

        {/* ── ROLES ── */}
        {activeTab === "roles" && (
          <Card>
            <SectionLabel>Role-Based Access Control (RBAC)</SectionLabel>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                  {["Role", "View", "Edit", "Export", "Admin", "Users"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.1em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roles.map((r, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "12px 12px", fontSize: 13, fontWeight: 700, color: C.white }}>{r.role}</td>
                    {["view", "edit", "export", "admin"].map(p => (
                      <td key={p} style={{ padding: "12px 12px" }}>
                        <div style={{ width: 22, height: 22, borderRadius: 6, background: r[p] ? C.accentDim : C.surface2, border: `2px solid ${r[p] ? C.accent : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                          {r[p] && <div style={{ color: C.accent, fontSize: 12, fontWeight: 900 }}>✓</div>}
                        </div>
                      </td>
                    ))}
                    <td style={{ padding: "12px 12px", fontSize: 13, color: C.muted, fontWeight: 600 }}>{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 16, background: C.surface2, borderRadius: 8, padding: "12px 16px", fontSize: 12, color: C.muted }}>
              <span style={{ color: C.accent, fontWeight: 700 }}>RBAC Policy: </span>
              Least Privilege enforced. All changes logged. Dual approval required for Admin/DPO role assignment.
            </div>
          </Card>
        )}

        {/* ── MAPPING TOOL ── */}
        {activeTab === "mapping" && (
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div><SectionLabel>Code Mapping Tool</SectionLabel>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Internal ↔ FHIR Standard Mappings</div>
              </div>
              <button style={{ background: C.accentDim, border: `1px solid ${C.accent}55`, color: C.accent, borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Add Mapping</button>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                  {["Internal Code", "FHIR Code", "Description", "Category", "Status", ""].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.1em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mappingCodes.map((m, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "11px 10px", fontSize: 12, color: C.blue, fontWeight: 700, fontFamily: "monospace" }}>{m.internal}</td>
                    <td style={{ padding: "11px 10px", fontSize: 12, color: C.accent, fontFamily: "monospace" }}>{m.fhir}</td>
                    <td style={{ padding: "11px 10px", fontSize: 12, color: C.text }}>{m.description}</td>
                    <td style={{ padding: "11px 10px" }}><Tag color="blue">{m.category}</Tag></td>
                    <td style={{ padding: "11px 10px" }}><Tag color={m.status === "mapped" ? "green" : "yellow"}>{m.status}</Tag></td>
                    <td style={{ padding: "11px 10px" }}>
                      <button style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 5, padding: "3px 8px", fontSize: 10, cursor: "pointer" }}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {/* ── MASTER DATA ── */}
        {activeTab === "master" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div><SectionLabel>Health Check Programs</SectionLabel></div>
                <button style={{ background: C.accentDim, border: `1px solid ${C.accent}55`, color: C.accent, borderRadius: 8, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+ New Program</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {masterPrograms.map((p, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: C.surface2, borderRadius: 8, border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 10, color: C.muted, fontFamily: "monospace", width: 80 }}>{p.code}</div>
                    <div style={{ flex: 1, fontSize: 13, color: C.white, fontWeight: 700 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{p.tests} tests</div>
                    <div style={{ fontSize: 10, color: C.muted }}>Updated {p.lastUpdated}</div>
                    <Tag color={p.status === "active" ? "green" : "yellow"}>{p.status}</Tag>
                    <button style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 5, padding: "3px 8px", fontSize: 10, cursor: "pointer" }}>Edit</button>
                  </div>
                ))}
              </div>
            </Card>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { label: "Alert Thresholds", items: ["Glucose Critical: >200 mg/dL", "LDL High: >160 mg/dL", "BP Stage 2: >140/90", "HbA1c Alert: >8.0%"] },
                { label: "Medical Rules Engine", items: ["Rule R-001: IFG → Diabetes Screen", "Rule R-002: BMI>25 + BP → CVD Risk", "Rule R-003: Age>50 → Colonoscopy", "Rule R-004: DM Dx → Annual HbA1c"] },
              ].map((section, i) => (
                <Card key={i}>
                  <SectionLabel>{section.label}</SectionLabel>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {section.items.map((item, j) => (
                      <div key={j} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: C.surface2, borderRadius: 6, fontSize: 12, color: C.text }}>
                        <span>{item}</span>
                        <button style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 4, padding: "2px 7px", fontSize: 10, cursor: "pointer" }}>Edit</button>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   APP SHELL
───────────────────────────────────────────── */
export default function App() {
  const [screen, setScreen] = useState(1);

  const screens = [
    { id: 1, label: "Individual Summary", sub: "& Recommendation" },
    { id: 2, label: "Trend & Timeline", sub: "Health History" },
    { id: 3, label: "Access Monitor", sub: "Admin / DPO" },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: C.bg, minHeight: "100vh", color: C.text, padding: "0" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${C.accent}, ${C.blue})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>✚</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.white, letterSpacing: "-0.02em" }}>HealthIQ Dashboard</div>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.05em" }}>AI-POWERED HEALTH INTELLIGENCE SYSTEM</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {screens.map(s => (
            <button key={s.id} onClick={() => setScreen(s.id)} style={{
              padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none", transition: "all 0.2s",
              background: screen === s.id ? C.accent : C.surface2,
              color: screen === s.id ? C.bg : C.muted,
              borderColor: screen === s.id ? C.accent : C.border
            }}>
              <span style={{ fontSize: 10, display: "block", opacity: 0.7 }}>SCREEN {s.id}</span>
              {s.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: C.white, fontWeight: 700 }}>Dr. Nida Wongsa</div>
            <div style={{ fontSize: 10, color: C.muted }}>Physician · Internal Med</div>
          </div>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${C.blue}, #a78bfa)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: C.white }}>N</div>
        </div>
      </div>

      {/* Screen title bar */}
      <div style={{ background: C.surface2, borderBottom: `1px solid ${C.border}`, padding: "8px 28px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent, boxShadow: `0 0 8px ${C.accent}` }} />
        <div style={{ fontSize: 12, color: C.muted }}>Screen {screen} — </div>
        <div style={{ fontSize: 12, color: C.text, fontWeight: 700 }}>{screens.find(s => s.id === screen)?.label} · {screens.find(s => s.id === screen)?.sub}</div>
        <div style={{ marginLeft: "auto", fontSize: 10, color: C.muted }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </div>
      </div>

      {/* Main content */}
      <div style={{ padding: "20px 28px" }}>
        {screen === 1 && <Screen1 />}
        {screen === 2 && <Screen2 />}
        {screen === 3 && <Screen3 />}
      </div>
    </div>
  );
}
