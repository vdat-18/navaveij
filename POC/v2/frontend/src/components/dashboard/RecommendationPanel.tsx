"use client";

import React, { useEffect, useState } from "react";
import {
    ShieldCheck,
    BrainCircuit,
    AlertTriangle,
    CheckCircle2,
    Package,
    ArrowRight,
    TrendingDown,
    TrendingUp,
    Activity,
    Heart,
    Stethoscope,
    ChevronDown,
    MessageSquare,
    Search,
    XCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clinicalService } from "@/services/api";
import { cn } from "@/shared/utils";
import { BiomarkerCharts } from "./BiomarkerCharts";
import { LabResultsGrid } from "./LabResultsGrid";
import { CLINICAL_DICTIONARY } from "@/shared/clinical-dictionary";
import { CriticalSignal, PatientHighAlert, RecommendationAddOn, RecommendationResponse } from "@/types/recommendation";

interface RecommendationPanelProps {
    patientId: string | null;
    patientToken: string | null;
    privacyMode: boolean;
    onRecommendationLoad?: (data: RecommendationResponse | null) => void;
    isRuleBasedForced: boolean;
}

interface NormalizedAlert {
    label: string;
    sub: string;
    value: string;
}

const CLINICAL_ACRONYMS: Record<string, string> = {
    bmi: "BMI",
    bp: "BP",
    hba1c: "HbA1c",
    ascvd: "ASCVD",
    hdl: "HDL",
    ldl: "LDL",
    cad: "CAD",
    ckd: "CKD",
    ct: "CT",
    sbp: "SBP",
    dbp: "DBP",
    hx: "Hx",
    htn: "Hypertension"
};

const normalizeClinicalToken = (token: string) =>
    token
        .split("_")
        .map((segment) => {
            const normalized = segment.toLowerCase();
            if (normalized in CLINICAL_ACRONYMS) {
                return CLINICAL_ACRONYMS[normalized];
            }
            if (/^stage\d+$/.test(normalized)) {
                return `Stage ${normalized.replace("stage", "")}`;
            }
            return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
        })
        .join(" ");

const splitConsultationSentences = (value: string) =>
    value
        .split(/\.(?!\d)(?=\s+[A-Z0-9]|$)|(?:\n|^)\s*-\s+|(?<=\.)\s*-\s+/g)
        .map((sentence) => sentence.trim().replace(/^(?:[*-]|\d+[\.\)])\s*/, ""))
        .filter((sentence) => sentence.length > 2)
        .filter((sentence) => !/^\d+(?:[.,]\d+)?[%)]?$/.test(sentence))
        .map((sentence) => sentence.endsWith(".") ? sentence : `${sentence}.`);

const renderBoldText = (text: string | string[] | null | undefined) => {
    if (!text) return null;

    // Handle array of strings (like add_on_highlights)
    if (Array.isArray(text)) {
        return text.map((item, idx) => (
            <span key={idx}>
                {renderBoldText(item)}
                {idx < text.length - 1 ? ' ' : ''}
            </span>
        ));
    }

    let content = typeof text === 'string' ? text : String(text);

    // 1. CLEANUP QUOTES: Remove all quote types (single, double, curly/smart quotes)
    content = content.replace(/['"‘’“”]/g, "");

    // 2. AUTO-TRANSLATE: Check for any technical identifiers from our dictionary
    // We sort keys by length descending to match longer identifiers first (e.g., PREMIUM_SEVERE_SINGLE before PREMIUM)
    const dictKeys = Object.keys(CLINICAL_DICTIONARY).sort((a, b) => b.length - a.length);

    dictKeys.forEach(key => {
        // Use regex with word boundaries to replace exact identifiers
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        if (content.includes(key)) {
            // Replace with wrapped bold version if it's not already bolded
            // Note: the split/map below will handle the bolding if we wrap it in **
            content = content.replace(regex, `**${CLINICAL_DICTIONARY[key]}**`);
        }
    });

    content = content.replace(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g, (token) => `**${normalizeClinicalToken(token)}**`);

    // 3. CLEANUP: Normalize multiple asterisks (e.g., ****Text**** to **Text**)
    content = content.replace(/\*{3,}/g, '**');

    // 4. FIX: Normalize common AI mistake where it does *Text:** or **Text*
    content = content.replace(/\*+([^*]+):\*+/g, '**$1:**');

    const boldMarkerCount = (content.match(/\*\*/g) || []).length;
    if (boldMarkerCount % 2 !== 0) {
        content = content.replace(/\*\*/g, "");
    }

    // 5. RENDER: Split by ** markers and render bold parts
    return content.split(/(\*\*.*?\*\*)/g).map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
            ? <strong key={i} className="font-black text-navavej-teal">{part.slice(2, -2)}</strong>
            : part
    );
};

const ClinicalRiskGauge = ({ value }: { value: string }) => {
    let percentage = 30;
    if (value === "Critical") percentage = 95;
    else if (value === "High") percentage = 85;
    else if (value === "Medium") percentage = 55;
    else if (value === "Low") percentage = 25;

    const isHighOrCritical = value === "High" || value === "Critical";
    const isMedium = value === "Medium";
    
    const strokeColor = isHighOrCritical ? "var(--color-navavej-red)" : (isMedium ? "var(--color-risk-mod)" : "var(--color-risk-low)");
    const textColor = isHighOrCritical ? "text-navavej-red" : (isMedium ? "text-orange-500" : "text-green-600");

    return (
        <div className="relative flex flex-col items-center group">
            <svg className="w-48 h-24" viewBox="0 0 100 50">
                <path
                    d="M 10 45 A 40 40 0 0 1 90 45"
                    fill="none"
                    stroke="var(--color-navavej-border)"
                    strokeWidth="6"
                    strokeLinecap="round"
                />
                <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: percentage / 100 }}
                    transition={{ duration: 2, ease: "circOut" }}
                    d="M 10 45 A 40 40 0 0 1 90 45"
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="8"
                    strokeLinecap="round"
                    className="transition-all duration-500"
                />
            </svg>
            <div className="absolute top-10 flex flex-col items-center">
                <span className={cn(
                    "text-3xl font-black transition-all duration-1000 tracking-tighter",
                    textColor
                )}>
                    {value}
                </span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-navavej-gray-med font-black">Risk Level</span>
            </div>
        </div>
    );
};

const priorityBadgeClass = (priority?: string) => {
    if (priority === "Red" || priority === "Critical" || priority === "High") return "bg-navavej-red";
    if (priority === "Orange") return "bg-orange-500";
    if (priority === "Yellow" || priority === "Medium") return "bg-yellow-500";
    if (priority === "Green" || priority === "Low") return "bg-green-600";
    return "bg-navavej-teal";
};

const normalizeCriticalAlerts = (patientHighAlert: PatientHighAlert | CriticalSignal[] | null | undefined): NormalizedAlert[] => {
    if (Array.isArray(patientHighAlert)) {
        return patientHighAlert
            .filter((signal): signal is CriticalSignal => !!signal && typeof signal === "object")
            .map((signal) => ({
                label: signal.label || signal.signal_id || "Clinical Signal",
                sub: signal.clinical_note || "Immediate clinical review recommended",
                value: signal.severity === "Critical" ? "URGENT" : signal.severity || "MONITOR",
            }));
    }
    if (Array.isArray(patientHighAlert?.critical_signals)) {
        const mapped = patientHighAlert.critical_signals
            .filter((signal): signal is CriticalSignal => !!signal && typeof signal === "object")
            .map((signal) => ({
                label: signal.label || signal.signal_id || "Clinical Signal",
                sub: signal.clinical_note || "Immediate clinical review recommended",
                value: signal.severity === "Critical" ? "URGENT" : signal.severity || "MONITOR",
            }));
        if (mapped.length > 0) {
            return mapped;
        }
    }
    return [];
};

export function RecommendationPanel({ patientId, patientToken, privacyMode, onRecommendationLoad, isRuleBasedForced }: RecommendationPanelProps) {
    const [data, setData] = useState<RecommendationResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionError, setSubmissionError] = useState<string | null>(null);
    const [decisionOutcome, setDecisionOutcome] = useState<"approved" | "rejected" | null>(null);
    const [notes, setNotes] = useState("");
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState("patient_refusal");

    useEffect(() => {
        if (!patientToken) {
            onRecommendationLoad?.(null);
            return;
        }
        const fetchRecommendation = async () => {
            setLoading(true);
            setError(null);
            setDecisionOutcome(null);
            setNotes("");
            setSubmissionError(null);
            setShowRejectModal(false);
            setRejectReason("patient_refusal");
            try {
                const result = await clinicalService.getRecommendation(patientToken, isRuleBasedForced);
                setData(result);
                onRecommendationLoad?.(result);
            } catch (err) {
                console.error("Failed to fetch recommendation:", err);
                setError(err instanceof Error ? err.message : "Failed to load clinical recommendation");
            } finally {
                setLoading(false);
            }
        };
        fetchRecommendation();
    }, [patientToken, isRuleBasedForced]);

    const handleApprove = async () => {
        if (!data?.recommendation_hash || !patientId) return;
        setIsSubmitting(true);
        setSubmissionError(null);
        try {
            await clinicalService.recordDecision(patientId, data.recommendation_hash, "Approve", notes);
            setDecisionOutcome("approved");
        } catch (err) {
            console.error("Failed to approve:", err);
            setSubmissionError("Approval failed. Please check backend connection.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!data?.recommendation_hash || !patientId) return;
        setIsSubmitting(true);
        setSubmissionError(null);
        const encodedNotes = `[REASON: ${rejectReason}] ${notes}`.trim();
        try {
            await clinicalService.recordDecision(patientId, data.recommendation_hash, "Reject", encodedNotes);
            setDecisionOutcome("rejected");
            setShowRejectModal(false);
        } catch (err) {
            console.error("Failed to reject:", err);
            setSubmissionError("Rejection failed. Please check backend connection.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!patientId) {
        return (
            <div className="h-[650px] flex flex-col items-center justify-center navavej-card bg-navavej-gray-light border-dashed border-2">
                <div className="relative mb-8">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg border border-navavej-border">
                        <Stethoscope className="w-10 h-10 text-navavej-teal opacity-30" />
                    </div>
                    <div className="absolute inset-x-0 bottom-[-10px] flex justify-center">
                        <div className="px-3 py-1 bg-navavej-teal text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-md">System Ready</div>
                    </div>
                </div>
                <h3 className="text-sm font-black text-navavej-gray-dark uppercase tracking-[0.2em]">Patient Analysis Pending</h3>
                <p className="text-xs text-navavej-gray-med mt-2 font-medium">Please select a validated entity from the clinical sidebar</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="h-[650px] flex flex-col items-center justify-center navavej-card relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-navavej-teal/10 overflow-hidden">
                    <motion.div
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="w-1/3 h-full bg-navavej-teal"
                    />
                </div>
                <motion.div
                    animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="relative z-10"
                >
                    <div className="w-28 h-28 bg-navavej-gray-light rounded-[30px] flex items-center justify-center shadow-xl border border-navavej-border">
                        <BrainCircuit className="w-14 h-14 text-navavej-teal animate-pulse" />
                    </div>
                </motion.div>
                <p className="mt-10 text-lg font-black tracking-[0.1em] text-navavej-gray-dark uppercase">
                    Synthesizing Clinical Intelligence
                </p>
                <p className="text-[10px] font-bold text-navavej-gray-med uppercase tracking-widest mt-2">Checking signal store & rulesets...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-[650px] flex flex-col items-center justify-center navavej-card bg-red-50 border-red-200 border-2 border-dashed">
                <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                <h3 className="text-sm font-black text-red-700 uppercase tracking-widest">Error Loading Recommendation</h3>
                <p className="text-xs text-red-600/80 mt-2 font-medium">{error}</p>
            </div>
        );
    }

    if (!data) return null;
    const criticalAlerts = normalizeCriticalAlerts(data.patient_high_alert);
    const reasoningTrace = (data.reasoning_trace || "").toString();
    const parsedReasoningLines = (reasoningTrace?.split('\n') ?? [])
        .map((line: string) => line.replace(/^[*-]\s*/, '').trim())
        .filter((line: string) => line.length > 0);
    const policyReasoningLines = parsedReasoningLines
        .filter((line: string) => /^policy reasoning\s*:/i.test(line))
        .map((line: string) => line.replace(/^policy reasoning\s*:\s*/i, "").trim())
        .filter((line: string) => line.length > 0);
    const clinicalReasoningLines = parsedReasoningLines.filter((line: string) => !/^policy reasoning\s*:/i.test(line));
    const maskedPackageName = "-";
    const maskedPriceValue = "-";

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={patientToken}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-10"
            >
                {/* Intelligence HUD Panels */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                    <div className="lg:col-span-4 navavej-card p-10 flex flex-col items-center justify-center relative bg-white group overflow-hidden">
                        <div className="absolute top-0 left-0 w-2 h-full bg-navavej-teal/20 transition-all group-hover:bg-navavej-teal" />
                        <ClinicalRiskGauge value={data.overall_risk_level} />
                        <div className="mt-8 flex flex-col items-center">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 bg-navavej-teal rounded-full animate-ping" />
                                <span className="text-[9px] font-black text-navavej-teal uppercase tracking-widest">Active Monitoring</span>
                            </div>
                            <p className="text-[11px] text-navavej-gray-med font-medium text-center italic">Calculated based on current BMI, ASCVD scores and clinical signals.</p>
                        </div>
                    </div>

                    <div className="lg:col-span-8 navavej-card p-0 rounded-[20px] overflow-hidden flex flex-col md:flex-row shadow-xl">
                        <div className="bg-navavej-teal p-12 text-white flex flex-col justify-center md:w-[45%]">
                            <div className="flex items-center gap-2 mb-4 opacity-70">
                                <Package className="w-5 h-5" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Strategy Assignment</span>
                            </div>
                            <h3 className="text-4xl font-black tracking-tight">{data.ai_recommended_tier || "Premium"}</h3>
                            <div className="mt-6 flex items-center gap-2">
                                <div className="w-10 h-1 bg-white/30 rounded-full overflow-hidden">
                                    <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} transition={{ duration: 1 }} className="w-full h-full bg-white" />
                                </div>
                                <span className="text-[10px] font-bold uppercase">Optimal Confidence</span>
                            </div>
                        </div>

                        <div className="flex-1 p-12 bg-white flex flex-col justify-center items-start border-l border-navavej-border">
                            <div className="flex items-center justify-between w-full mb-8">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-navavej-gray-med uppercase tracking-[0.2em] mb-1">Recommended Package</span>
                                    <span className={cn("text-xl font-black uppercase tracking-wide", privacyMode ? "text-navavej-red/70 font-mono" : "text-navavej-gray-dark")}>
                                        {privacyMode ? maskedPackageName : (data.resolved_package?.name || data.resolved_package?.package_name || "Unknown Package")}
                                    </span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[9px] font-black text-navavej-gray-med uppercase tracking-[0.2em] mb-1">Program Value</span>
                                    <span className={cn("text-3xl font-black italic", privacyMode ? "text-navavej-red/70 font-mono" : "text-navavej-teal")}>
                                        {privacyMode ? maskedPriceValue : (data.resolved_package?.price_thb ? `฿${data.resolved_package.price_thb.toLocaleString()}` : "Price TBD")}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 w-full">
                                <div className="px-5 py-3 bg-navavej-gray-light rounded-xl flex items-center gap-3 border border-navavej-border">
                                    <ShieldCheck className="w-5 h-5 text-navavej-teal" />
                                    <span className="text-[10px] font-black uppercase text-navavej-gray-dark">AI Verified</span>
                                </div>
                                <div className="px-5 py-3 bg-navavej-gray-light rounded-xl flex items-center gap-3 border border-navavej-border">
                                    <CheckCircle2 className="w-5 h-5 text-navavej-teal" />
                                    <span className="text-[10px] font-black uppercase text-navavej-gray-dark">Safety Log OK</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Evolution & Trends - Newly Implemented Visualization */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-navavej-teal">
                        <TrendingUp className="w-5 h-5" />
                        <span className="text-xs font-black uppercase tracking-[0.2em]">Biomarker Evolution Trends</span>
                    </div>
                    <BiomarkerCharts
                        bmiHistory={data.biomarker_trends?.bmi?.history || []}
                        bpHistory={data.biomarker_trends?.blood_pressure?.history || []}
                    />
                    <LabResultsGrid labs={data.biomarker_trends?.labs || []} />
                </div>

                {/* Detailed Logic & Alerts Reorganized */}
                <div className="space-y-10">
                    {/* 1. Clinical AI Reasoning - Full Width for Maximum Impact */}
                    <div className="navavej-card p-12 border-none bg-white shadow-xl shadow-navavej-teal/[0.03] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-navavej-teal/[0.02] rounded-full translate-x-16 -translate-y-16 group-hover:scale-110 transition-transform duration-700" />

                        <div className="flex items-center justify-between mb-10 relative z-10">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 bg-navavej-teal/10 rounded-2xl flex items-center justify-center border border-navavej-teal/20 shadow-inner group-hover:rotate-3 transition-transform">
                                    <BrainCircuit className="w-7 h-7 text-navavej-teal" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-navavej-gray-dark uppercase tracking-tight leading-none">Clinical Logic & Rationale</h3>
                                    <p className="text-[10px] font-bold text-navavej-teal uppercase tracking-widest mt-1">Physician Evidence Stream</p>
                                </div>
                            </div>
                            <div className="px-4 py-1.5 bg-navavej-teal/10 rounded-full text-[10px] font-black text-navavej-teal uppercase tracking-[0.2em] shadow-sm">Trace Active</div>
                        </div>

                        <div className="relative z-10 bg-navavej-gray-light/30 rounded-[24px] p-8 border border-navavej-border/50">
                            <div className="space-y-4">
                                {clinicalReasoningLines.length > 0 ? (
                                    clinicalReasoningLines.map((line: string, idx: number) => (
                                        <div key={idx} className="flex gap-4">
                                            <div className={cn(
                                                "mt-2 w-2 h-2 rounded-full shrink-0 shadow-[0_0_8px_rgba(45,161,162,0.4)]",
                                                privacyMode ? "bg-navavej-red" : "bg-navavej-teal"
                                            )} />
                                            <p className={cn(
                                                "text-sm font-medium leading-relaxed text-justify flex-1",
                                                privacyMode ? "font-mono text-navavej-red/80" : "text-navavej-gray-dark"
                                            )}>
                                                {renderBoldText(line)}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-6 opacity-50">
                                        <span className="text-xs font-bold text-navavej-gray-med uppercase tracking-widest">Insufficient reasoning trace data</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {policyReasoningLines.length > 0 && (
                            <div className="relative z-10 mt-6 bg-navavej-teal/[0.04] rounded-[24px] p-8 border border-navavej-teal/20">
                                <div className="flex items-center gap-2 mb-5">
                                    <Activity className={cn("w-4 h-4", privacyMode ? "text-navavej-red" : "text-navavej-teal")} />
                                    <h4 className={cn(
                                        "text-xs font-black uppercase tracking-[0.2em]",
                                        privacyMode ? "text-navavej-red/80" : "text-navavej-teal"
                                    )}>
                                        Policy Reasoning
                                    </h4>
                                </div>
                                <div className="space-y-4">
                                    {policyReasoningLines.map((line: string, idx: number) => (
                                        <p
                                            key={idx}
                                            className={cn(
                                                "text-sm font-medium leading-relaxed text-justify",
                                                privacyMode ? "font-mono text-navavej-red/80" : "text-navavej-gray-dark"
                                            )}
                                        >
                                            {renderBoldText(line)}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-8 flex items-center gap-6 text-navavej-gray-med text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
                            <span className="flex items-center gap-2 bg-navavej-gray-light px-3 py-1 rounded-lg"><Search className="w-3 h-3" /> Integrity: Valid</span>
                            <span className="flex items-center gap-2 bg-navavej-gray-light px-3 py-1 rounded-lg"><Activity className="w-3 h-3" /> Logic: Verified</span>
                        </div>
                    </div>

                    {/* 2. Secondary Insights Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                        {/* Strategic Add-ons List */}
                        <div className="lg:col-span-8 navavej-card p-10 bg-white border-2 border-navavej-teal/10 shadow-lg flex flex-col">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 bg-navavej-teal/5 rounded-xl flex items-center justify-center">
                                    <Package className="w-5 h-5 text-navavej-teal" />
                                </div>
                                <h4 className="text-sm font-black text-navavej-gray-dark uppercase tracking-widest">Additional Clinical Screenings</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                                {data.add_ons?.map((item: RecommendationAddOn, i: number) => (
                                    <div key={i} className="p-5 bg-navavej-gray-light rounded-2xl border border-navavej-border hover:border-navavej-teal/30 transition-all group flex flex-col justify-between">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-[11px] font-black text-navavej-gray-dark uppercase bg-white px-2 py-1 rounded shadow-sm">{item.item_code}</span>
                                            <span className={cn(
                                                "text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest text-white shadow-sm",
                                                priorityBadgeClass(item.priority_level || item.priority)
                                            )}>
                                                {item.priority_level}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-navavej-gray-med font-medium leading-relaxed text-justify">
                                            {renderBoldText(item.rationale)}
                                        </p>
                                    </div>
                                ))}
                                {(!data.add_ons || data.add_ons.length === 0) && (
                                    <div className="col-span-2 flex flex-col items-center justify-center py-10 opacity-30 italic text-xs">
                                        No clinical add-ons required for this tier.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Critical Signals & Action Panel */}
                        <div className="lg:col-span-4 flex flex-col gap-6">
                            <div className="navavej-card p-8 bg-navavej-red/[0.02] border-l-[12px] border-navavej-red shadow-xl shadow-navavej-red/5">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 bg-navavej-red/10 rounded-2xl flex items-center justify-center border border-navavej-red/20 animate-float">
                                        <AlertTriangle className="w-6 h-6 text-navavej-red" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-navavej-gray-dark uppercase tracking-tight leading-none">Critical Signals</h3>
                                        <p className="text-[9px] font-bold text-navavej-red uppercase tracking-widest mt-1">Immediate Review</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {criticalAlerts.length > 0 ? (
                                        criticalAlerts.map((alert: NormalizedAlert, i: number) => (
                                            <div key={i} className="flex items-center justify-between p-4 bg-white rounded-xl border border-navavej-border group hover:border-navavej-red/40 transition-colors shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-1.5 h-1.5 bg-navavej-red rounded-full" />
                                                    <div>
                                                        <h4 className={cn("text-[10px] font-black uppercase", privacyMode ? "text-navavej-red/70 font-mono" : "text-navavej-gray-dark")}>
                                                            {privacyMode ? "Masked Alert" : alert.label}
                                                        </h4>
                                                        <p className={cn("text-[9px] font-bold italic", privacyMode ? "text-navavej-red/70 font-mono" : "text-navavej-gray-med")}>
                                                            {privacyMode ? "Masked Clinical Details" : alert.sub}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-[8px] font-black text-navavej-red border border-navavej-red/20 px-2 py-1 rounded tracking-tighter">
                                                    {privacyMode ? "—" : alert.value}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex items-center justify-center p-4 bg-white rounded-xl border border-navavej-border shadow-sm">
                                            <span className="text-[10px] font-bold text-navavej-gray-med uppercase">Insufficient data</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Physician Notes & Action */}
                            <div className="bg-navavej-gray-light rounded-[24px] p-8 border border-navavej-border flex flex-col flex-1 shadow-inner">
                                <div className="flex items-center gap-2 mb-4 text-navavej-gray-med">
                                    <Activity className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Execution Notes</span>
                                </div>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    disabled={!!decisionOutcome || isSubmitting}
                                    placeholder="Add clinical observation..."
                                    className="w-full h-24 bg-white border-2 border-navavej-border rounded-xl p-4 text-[11px] font-medium outline-none transition-all resize-none shadow-sm focus:border-navavej-teal/50"
                                />
                                {submissionError && (
                                    <p className="text-xs text-red-500 font-bold mt-2">{submissionError}</p>
                                )}
                                {/* Post-decision locked state */}
                                {decisionOutcome ? (
                                    <button
                                        disabled
                                        className={cn(
                                            "mt-4 w-full py-4 flex items-center justify-center gap-3 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-lg cursor-not-allowed",
                                            decisionOutcome === "approved" ? "bg-green-600" : "bg-navavej-red"
                                        )}
                                    >
                                        {decisionOutcome === "approved"
                                            ? <><CheckCircle2 className="w-5 h-5" /><span>Approved</span></>
                                            : <><XCircle className="w-5 h-5" /><span>Rejected</span></>
                                        }
                                    </button>
                                ) : (
                                    <div className="mt-4 flex gap-3">
                                        <button
                                            onClick={() => setShowRejectModal(true)}
                                            disabled={isSubmitting}
                                            className="flex-shrink-0 px-5 py-4 border-2 border-navavej-red text-navavej-red bg-white hover:bg-red-50 rounded-xl font-black text-xs uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={handleApprove}
                                            disabled={isSubmitting}
                                            className={cn(
                                                "navavej-button-primary flex-1 py-4 flex items-center justify-center gap-3 group shadow-lg",
                                                isSubmitting && "opacity-70 cursor-wait"
                                            )}
                                        >
                                            <span className="text-xs uppercase tracking-widest font-black">
                                                {isSubmitting ? "..." : "Confirm Strategy"}
                                            </span>
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Patient Consultation Guide - New Implementation */}
                <div className="navavej-card p-12 bg-white border-none shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-navavej-teal/[0.03] rounded-full translate-x-32 -translate-y-32" />

                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-12 h-12 bg-navavej-teal/10 rounded-2xl flex items-center justify-center border border-navavej-teal/20">
                            <MessageSquare className="w-6 h-6 text-navavej-teal" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-navavej-gray-dark uppercase tracking-tight">Patient Consultation Guide</h3>
                            <p className="text-[10px] font-bold text-navavej-teal uppercase tracking-widest mt-1">AI-generated talk track for physicians</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
                        <div className="space-y-8">
                            <div>
                                <h4 className="text-[10px] font-black text-navavej-gray-med uppercase tracking-widest mb-3 border-b border-navavej-border pb-1 w-fit">Clinical Conclusion</h4>
                                <p className="text-sm font-black text-navavej-teal leading-relaxed italic text-left">
                                    {renderBoldText(data.communication_script?.opening || data.communication_script?.clinical_conclusion)}
                                </p>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-navavej-gray-med uppercase tracking-widest mb-3 border-b border-navavej-border pb-1 w-fit">Core Health Insights</h4>
                                <div className="space-y-2">
                                    {splitConsultationSentences(data.communication_script?.health_summary || "").map((sentence: string, i: number) => (
                                        <div key={i} className="flex gap-2">
                                            <div className="mt-1.5 w-1 h-1 rounded-full bg-navavej-teal shrink-0" />
                                            <p className="text-sm font-medium text-navavej-gray-dark leading-relaxed">
                                                {renderBoldText(sentence)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {data.communication_script?.add_on_highlights && data.communication_script.add_on_highlights.length > 0 && (
                                <div className="mt-6 pt-6 border-t border-navavej-border">
                                    <h4 className="text-[10px] font-black text-navavej-gray-med uppercase tracking-widest mb-3 border-b border-navavej-border pb-1 w-fit">Special Highlights</h4>
                                    <div className="space-y-2">
                                        {data.communication_script.add_on_highlights.map((highlight: string, i: number) => (
                                            <div key={i} className="flex gap-2">
                                                <div className="mt-1.5 w-1 h-1 rounded-full bg-navavej-teal shrink-0" />
                                                <p className="text-sm font-medium text-navavej-gray-dark leading-relaxed text-justify">
                                                    {renderBoldText(highlight)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-8">
                            <div>
                                <h4 className="text-[10px] font-black text-navavej-gray-med uppercase tracking-widest mb-3 border-b border-navavej-border pb-1 w-fit">Why this program?</h4>
                                <div className="p-6 bg-navavej-gray-light rounded-2xl border-l-4 border-navavej-teal">
                                    <p className="text-sm font-bold text-navavej-gray-dark leading-relaxed text-justify">
                                        {renderBoldText(data.communication_script?.recommendation_explanation)}
                                    </p>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-navavej-gray-med uppercase tracking-widest mb-3 border-b border-navavej-border pb-1 w-fit">Next steps</h4>
                                <div className="space-y-3">
                                    {(data.communication_script?.next_steps || "").split('.').filter((s: string) => s.trim().length > 0).map((sentence: string, i: number) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <div className="mt-1 bg-emerald-100 p-1 rounded-full"><CheckCircle2 className="w-3 h-3 text-emerald-600" /></div>
                                            <p className="text-[11px] font-bold text-navavej-gray-med italic">
                                                {renderBoldText(sentence.trim() + ".")}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Rejection Reason Modal */}
            <AnimatePresence>
                {showRejectModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ duration: 0.18 }}
                            className="bg-white rounded-[24px] shadow-2xl border border-navavej-border w-full max-w-md mx-4 overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="flex items-center gap-4 px-8 py-6 border-b border-navavej-border bg-red-50">
                                <div className="w-10 h-10 bg-navavej-red/10 rounded-xl flex items-center justify-center border border-navavej-red/20">
                                    <AlertTriangle className="w-5 h-5 text-navavej-red" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-navavej-gray-dark uppercase tracking-tight">Reject Recommendation</h3>
                                    <p className="text-[10px] font-bold text-navavej-red uppercase tracking-widest mt-0.5">Select a reason to continue</p>
                                </div>
                            </div>

                            {/* Reason Radio Group */}
                            <div className="px-8 pt-6 pb-4 space-y-2">
                                <p className="text-[10px] font-black text-navavej-gray-med uppercase tracking-widest mb-3">Rejection Reason</p>
                                {[
                                    { value: "patient_refusal", label: "Patient Refusal" },
                                    { value: "done_elsewhere", label: "Already Done Elsewhere" },
                                    { value: "cost_concern", label: "Cost / Financial Concern" },
                                    { value: "clinical_override", label: "Clinical Override" },
                                    { value: "other", label: "Other" },
                                ].map(({ value, label }) => (
                                    <label
                                        key={value}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                                            rejectReason === value
                                                ? "border-navavej-red bg-red-50"
                                                : "border-navavej-border bg-white hover:border-navavej-red/30"
                                        )}
                                    >
                                        <input
                                            type="radio"
                                            name="rejectReason"
                                            value={value}
                                            checked={rejectReason === value}
                                            onChange={() => setRejectReason(value)}
                                            className="accent-navavej-red"
                                        />
                                        <span className={cn(
                                            "text-xs font-black uppercase tracking-wide",
                                            rejectReason === value ? "text-navavej-red" : "text-navavej-gray-dark"
                                        )}>
                                            {label}
                                        </span>
                                    </label>
                                ))}
                            </div>

                            {/* Additional Notes */}
                            <div className="px-8 pb-4">
                                <p className="text-[10px] font-black text-navavej-gray-med uppercase tracking-widest mb-2">Additional Notes <span className="font-medium normal-case tracking-normal text-navavej-gray-med/70">(optional)</span></p>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add context for this rejection..."
                                    className="w-full h-20 bg-navavej-gray-light border-2 border-navavej-border rounded-xl p-3 text-[11px] font-medium outline-none transition-all resize-none focus:border-navavej-red/50"
                                />
                            </div>

                            {/* Modal Actions */}
                            <div className="px-8 pb-8 flex gap-3">
                                <button
                                    onClick={() => { setShowRejectModal(false); setRejectReason("patient_refusal"); }}
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 border-2 border-navavej-border text-navavej-gray-dark bg-white hover:bg-navavej-gray-light rounded-xl font-black text-xs uppercase tracking-widest transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReject}
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 bg-navavej-red text-white hover:bg-red-700 rounded-xl font-black text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 disabled:cursor-wait"
                                >
                                    <XCircle className="w-4 h-4" />
                                    <span>{isSubmitting ? "..." : "Confirm Rejection"}</span>
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </AnimatePresence>
    );
}
