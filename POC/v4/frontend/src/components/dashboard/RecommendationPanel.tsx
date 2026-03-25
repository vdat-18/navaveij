"use client";

import React, { useEffect, useState, useRef } from "react";
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
    XCircle,
    Database,
    ClipboardList,
    CheckCircle,
    Loader2,
    Sparkles,
    BarChart3,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { clinicalService, StageUpdate } from "@/services/api";
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
    hideCharts?: boolean;
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

const splitConsultationSentences = (value: string) => {
    // Better regex for sentence splitting that avoids abbreviations
    // Splits on periods followed by whitespace and an uppercase letter, or at the start of bullets
    const sentences = value
        .split(/\.(?!\d)(?=\s+[A-Z0-9]|$)|(?:\n|^)\s*-\s+/g)
        .map(s => s.trim())
        .filter(s => s.length > 2);

    // Re-join sentences that were split inappropriately (e.g., inside abbreviations like e.g., i.e.)
    const combined: string[] = [];
    for (let i = 0; i < sentences.length; i++) {
        const current = sentences[i];
        const lastInCombined = combined[combined.length - 1];
        
        // If the current sentence starts with a character that suggests it's a fragment 
        // OR the previous one ends with an abbreviation fragment, join them
        if (lastInCombined && (
            /^\s*[a-z0-9]/.test(current) || 
            /\s(e\.g|i\.e|mg|dl|ml|dr|vs)$/i.test(lastInCombined) ||
            lastInCombined.endsWith("(")
        )) {
            combined[combined.length - 1] = lastInCombined + (lastInCombined.endsWith(".") ? "" : ".") + " " + current;
        } else {
            combined.push(current);
        }
    }

    return combined
        .map((sentence) => sentence.endsWith(".") || sentence.endsWith("!") || sentence.endsWith("?") ? sentence : `${sentence}.`);
};

const renderBoldText = (text: string | string[] | null | undefined, sentiment?: 'good' | 'bad' | 'neutral') => {
    if (!text) return null;

    // Handle array of strings (like add_on_highlights)
    if (Array.isArray(text)) {
        return text.map((item, idx) => (
            <span key={idx}>
                {renderBoldText(item, sentiment)}
                {idx < text.length - 1 ? ' ' : ''}
            </span>
        ));
    }

    let content = typeof text === 'string' ? text : String(text);

    // 1. CLEANUP QUOTES: Remove all quote types (single, double, curly/smart quotes)
    content = content.replace(/['"‘’“”]/g, "");

    // 2. AUTO-HIGHLIGHT: Clinical measurements and units (e.g., 140/90 mmHg, 5.5 mg/dL, 23%)
    const unitRegex = /\b(\d+(?:\.\d+)?(?:\/\d+)?\s*(?:mg\/dL|mmol\/L|mmHg|kg\/m²|kg\/m2|mL\/min|years|days|weeks|months|%))\b/gi;
    content = content.replace(unitRegex, (match) => `**${match}**`);

    // 3. AUTO-TRANSLATE: Check for any technical identifiers from our dictionary
    const dictKeys = Object.keys(CLINICAL_DICTIONARY).sort((a, b) => b.length - a.length);

    dictKeys.forEach(key => {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        if (content.includes(key)) {
            content = content.replace(regex, `**${CLINICAL_DICTIONARY[key]}**`);
        }
    });

    content = content.replace(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g, (token) => `**${normalizeClinicalToken(token)}**`);

    // 4. CLEANUP: Normalize multiple asterisks and potential nesting
    content = content.replace(/\*{3,}/g, '**');
    content = content.replace(/\*\*\s*\*\*/g, ''); // Fix double bolding markers ** **

    // 4. FIX: Normalize common AI mistake
    content = content.replace(/\*+([^*]+):\*+/g, '**$1:**');

    const boldMarkerCount = (content.match(/\*\*/g) || []).length;
    if (boldMarkerCount % 2 !== 0) {
        content = content.replace(/\*\*/g, "");
    }

    // 5. RENDER: Split by ** markers and render bold parts
    const textColorClass = sentiment === 'bad' ? 'text-navavej-red' : (sentiment === 'good' ? 'text-emerald-700' : 'text-navavej-teal');
    const bgColorClass = sentiment === 'bad' ? 'bg-navavej-red/10 border-navavej-red/20' : (sentiment === 'good' ? 'bg-emerald-50 border-emerald-100' : 'bg-navavej-teal/10 border-navavej-teal/20');
    
    return content.split(/(\*\*.*?\*\*)/g).map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            const inner = part.slice(2, -2);
            // If it ends with a colon, it's likely a label - render without chip styles
            if (inner.trim().endsWith(':')) {
                return (
                    <strong key={i} className={cn("font-black tracking-tight align-baseline uppercase text-[11px]", textColorClass)}>
                        {inner}
                    </strong>
                );
            }
            // Standard clinical chip for values/signals
            return (
                <strong key={i} className={cn("font-black px-1.5 py-0.5 rounded-md border inline-flex items-center shadow-[0_1px_2px_rgba(0,0,0,0.05)] mx-0.5 whitespace-nowrap leading-none align-baseline", textColorClass, bgColorClass)}>
                    {inner}
                </strong>
            );
        }
        return <span key={i} className="align-baseline">{part}</span>;
    });
};

const ClinicalRiskGauge = ({ value }: { value: string }) => {
    let percentage = 30;
    if (value === "Critical") percentage = 95;
    else if (value === "High") percentage = 85;
    else if (value === "Medium") percentage = 55;
    else if (value === "Low") percentage = 25;

    const isHighOrCritical = value === "High" || value === "Critical";
    const isMedium = value === "Medium";

    const strokeColor = isHighOrCritical ? "var(--color-navavej-red)" : (isMedium ? "#EAB308" : "var(--color-risk-low)");
    const textColor = isHighOrCritical ? "text-navavej-red" : (isMedium ? "text-yellow-500" : "text-green-600");

    return (
        <div className="relative flex flex-col items-center group">
            <svg className="w-48 h-24" viewBox="0 0 100 50">
                {/* Background segments */}
                <path
                    d="M 10 45 A 40 40 0 0 1 30 10.4"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="6"
                    strokeLinecap="round"
                    className="opacity-10"
                />
                <path
                    d="M 30 10.4 A 40 40 0 0 1 70 10.4"
                    fill="none"
                    stroke="#EAB308"
                    strokeWidth="6"
                    strokeLinecap="round"
                    className="opacity-10"
                />
                <path
                    d="M 70 10.4 A 40 40 0 0 1 90 45"
                    fill="none"
                    stroke="#9D0A31"
                    strokeWidth="6"
                    strokeLinecap="round"
                    className="opacity-10"
                />

                {/* Background track (subtle) */}
                <path
                    d="M 10 45 A 40 40 0 0 1 90 45"
                    fill="none"
                    stroke="var(--color-navavej-border)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    className="opacity-40"
                />

                <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: percentage / 100 }}
                    transition={{ duration: 2, ease: "circOut" }}
                    d="M 10 45 A 40 40 0 0 1 90 45"
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="10"
                    strokeLinecap="round"
                    className="transition-all duration-500 drop-shadow-[0_0_8px_rgba(0,0,0,0.15)]"
                    style={{
                        filter: `drop-shadow(0 0 8px ${isHighOrCritical ? 'rgba(157, 10, 49, 0.4)' : isMedium ? 'rgba(234, 179, 8, 0.4)' : 'rgba(16, 185, 129, 0.4)'})`
                    }}
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

const TrendToast = ({ onDismiss }: { onDismiss: () => void }) => {
    return (
        <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-10 right-10 z-[100] bg-white border-2 border-navavej-teal/30 p-6 rounded-[24px] shadow-2xl flex items-center gap-6"
        >
            <div className="w-12 h-12 bg-navavej-teal/10 rounded-2xl flex items-center justify-center animate-bounce shadow-inner">
                <BarChart3 className="w-6 h-6 text-navavej-teal" />
            </div>
            <div>
                <h4 className="text-sm font-black uppercase text-navavej-gray-dark tracking-wide flex items-center gap-2">
                    Analysis Synced <Sparkles className="w-3 h-3 text-amber-400" />
                </h4>
                <p className="text-[10px] font-bold text-navavej-gray-med uppercase tracking-[0.1em] mt-0.5">Historical trends are now available</p>
                <div className="flex items-center gap-3 mt-4">
                    <Link
                        href="/trend-timeline"
                        className="px-4 py-2 bg-navavej-teal text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-navavej-teal/90 transition-all shadow-lg hover:scale-105 active:scale-95"
                    >
                        View Timeline
                    </Link>
                    <button onClick={onDismiss} className="text-[9px] font-black uppercase text-navavej-gray-med hover:text-navavej-gray-dark px-2 transition-colors">Dismiss</button>
                </div>
            </div>
        </motion.div>
    );
};

const PackageSeal = ({ tier }: { tier: string }) => {
    const isDiamond = tier.toLowerCase() === "premium";
    const isPlatinum = tier.toLowerCase() === "advanced";
    const isGold = tier.toLowerCase() === "standard";

    let gradientId = "goldGradient";
    let shimmerId = "goldShimmer";
    let mainColor = "#FFD700";
    let secondaryColor = "#B8860B";
    let ringColor = "rgba(255, 215, 0, 0.4)";

    if (isDiamond) {
        gradientId = "diamondGradient";
        shimmerId = "diamondShimmer";
        mainColor = "#00E5FF";
        secondaryColor = "#0091EA";
        ringColor = "rgba(0, 229, 255, 0.4)";
    } else if (isPlatinum) {
        gradientId = "platinumGradient";
        shimmerId = "platinumShimmer";
        mainColor = "#E5E4E2";
        secondaryColor = "#A9A9A9";
        ringColor = "rgba(229, 228, 226, 0.4)";
    }

    return (
        <div className="relative group cursor-default">
            {/* Animated outer rings */}
            <div className="absolute inset-[-8px] rounded-full border border-dashed opacity-20 animate-[spin_20s_linear_infinite]"
                style={{ borderColor: mainColor }} />
            <div className="absolute inset-[-12px] rounded-full border border-dotted opacity-10 animate-[spin_30s_linear_infinite_reverse]"
                style={{ borderColor: mainColor }} />

            {/* Pulsing glow */}
            <div className="absolute inset-0 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity animate-pulse"
                style={{ backgroundColor: ringColor }} />

            <svg width="80" height="80" viewBox="0 0 100 100" className="relative drop-shadow-2xl">
                <defs>
                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={mainColor} />
                        <stop offset="50%" stopColor="#FFF" />
                        <stop offset="100%" stopColor={secondaryColor} />
                    </linearGradient>

                    <linearGradient id={shimmerId} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="white" stopOpacity="0" />
                        <stop offset="50%" stopColor="white" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="white" stopOpacity="0" />
                    </linearGradient>

                    <filter id="glass">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="1" />
                    </filter>

                    <clipPath id="circleClip">
                        <circle cx="50" cy="50" r="42" />
                    </clipPath>
                </defs>

                {/* Ribbon behind the seal */}
                <motion.path
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 1, delay: 0.5 }}
                    style={{ originY: "top" }}
                    d="M 20 70 L 35 95 L 50 85 L 65 95 L 80 70"
                    fill={secondaryColor}
                    stroke="white"
                    strokeWidth="1"
                    opacity="0.8"
                />

                {/* Main Circle Body */}
                <circle cx="50" cy="50" r="42" fill={secondaryColor} />
                <circle cx="50" cy="50" r="38" fill={`url(#${gradientId})`} />

                {/* Shimmer effect animating across */}
                <g clipPath="url(#circleClip)">
                    <motion.rect
                        x="-100"
                        y="0"
                        width="100"
                        height="100"
                        fill={`url(#${shimmerId})`}
                        animate={{ x: [0, 200] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
                        transform="rotate(25)"
                    />
                </g>

                <circle cx="50" cy="50" r="34" fill="none" stroke="white" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.5" />

                {/* Emblem inside */}
                {isDiamond && (
                    <motion.path
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8 }}
                        d="M 50 25 L 70 40 L 50 75 L 30 40 Z" fill="white" opacity="0.9"
                    />
                )}
                {isPlatinum && (
                    <motion.circle
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8 }}
                        cx="50" cy="50" r="18" fill="white" opacity="0.8"
                    />
                )}
                {isGold && (
                    <motion.path
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8 }}
                        d="M 50 30 L 55 45 L 70 45 L 58 55 L 62 70 L 50 60 L 38 70 L 42 55 L 30 45 L 45 45 Z" fill="white" opacity="0.9"
                    />
                )}

                {/* Inner glass shine */}
                <path d="M 30 30 Q 50 15 70 30" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.3" filter="url(#glass)" />
            </svg>

            {/* Badge Labels */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-max">
                <span className="text-[7px] font-black uppercase tracking-[0.2em] px-2 py-0.5 bg-black/50 backdrop-blur-md rounded-full text-white border border-white/20 shrink-0 text-center shadow-lg">
                    {tier}
                </span>
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

const getLineSentiment = (line: string): 'good' | 'bad' | 'neutral' => {
    const text = line.toLowerCase();
    const badKeywords = ['risk', 'high', 'critical', 'abnormal', 'failure', 'warning', 'elevated', 'low', 'decreased', 'positive history', 'presence of', 'overdue', 'gap', 'urgent', 'uncontrolled'];
    const goodKeywords = ['normal', 'stable', 'good', 'no history', 'negative', 'negative family', 'compliant', 'controlled', 'within limits', 'non-smoker', 'clear'];
    
    if (badKeywords.some(k => text.includes(k))) return 'bad';
    if (goodKeywords.some(k => text.includes(k))) return 'good';
    return 'neutral';
};

const normalizeCriticalAlerts = (patientHighAlert: PatientHighAlert | CriticalSignal[] | null | undefined): NormalizedAlert[] => {
    if (Array.isArray(patientHighAlert)) {
        return patientHighAlert
            .filter((signal): signal is CriticalSignal => !!signal && typeof signal === "object")
            .map((signal) => ({
                label: signal.label || signal.signal_id || "Clinical Signal",
                sub: signal.clinical_note || "Immediate clinical review recommended",
                value: signal.severity || "MONITOR",
            }));
    }
    if (Array.isArray(patientHighAlert?.critical_signals)) {
        const mapped = patientHighAlert.critical_signals
            .map((signal) => ({
                label: signal.label || signal.signal_id || "Clinical Signal",
                sub: signal.clinical_note || "Immediate clinical review recommended",
                value: signal.severity || "MONITOR",
            }));
        if (mapped.length > 0) {
            return mapped;
        }
    }
    return [];
};

// ─── Pipeline stage configuration ────────────────────────────────────────────
const PIPELINE_STAGES: {
    num: number;
    shortLabel: string;
    description: string;
    color: string;          // Tailwind bg class for active badge
    textColor: string;      // Tailwind text class for icon/label
    borderColor: string;    // Tailwind border class
    bgCard: string;         // Tailwind bg class for the card
    Icon: React.ElementType;
    hint?: string;
}[] = [
        {
            num: 1,
            shortLabel: "Fetching Data",
            description: "Reading patient history, lab results, and risk signals from all data sources…",
            color: "bg-teal-500",
            textColor: "text-teal-600",
            borderColor: "border-teal-300",
            bgCard: "bg-teal-50",
            Icon: Database,
            hint: "Usually under 2 seconds",
        },
        {
            num: 2,
            shortLabel: "Applying Rules",
            description: "Checking eligibility constraints and your hospital's clinical ruleset…",
            color: "bg-amber-500",
            textColor: "text-amber-600",
            borderColor: "border-amber-300",
            bgCard: "bg-amber-50",
            Icon: ClipboardList,
            hint: "Under 1 second",
        },
        {
            num: 3,
            shortLabel: "AI Reasoning",
            description: "AI is analysing the patient's risk profile and composing the recommendation…",
            color: "bg-violet-500",
            textColor: "text-violet-600",
            borderColor: "border-violet-300",
            bgCard: "bg-violet-50",
            Icon: BrainCircuit,
            hint: "This step typically takes 7–20 seconds — the AI is thinking carefully",
        },
        {
            num: 6,
            shortLabel: "Finalising",
            description: "Running safety validation and writing the audit log…",
            color: "bg-emerald-500",
            textColor: "text-emerald-600",
            borderColor: "border-emerald-300",
            bgCard: "bg-emerald-50",
            Icon: ShieldCheck,
            hint: "Almost done!",
        },
    ];

// Map raw stage number → index in PIPELINE_STAGES array
const STAGE_INDEX: Record<number, number> = { 1: 0, 2: 1, 3: 2, 6: 3 };

export function RecommendationPanel({
    patientId,
    patientToken,
    privacyMode,
    onRecommendationLoad,
    isRuleBasedForced,
    hideCharts = false
}: RecommendationPanelProps) {
    const [data, setData] = useState<RecommendationResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [currentStage, setCurrentStage] = useState<StageUpdate | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionError, setSubmissionError] = useState<string | null>(null);
    const [decisionOutcome, setDecisionOutcome] = useState<"approved" | "rejected" | null>(null);
    const [notes, setNotes] = useState("");
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState("patient_refusal");
    const [isPackageRevealed, setIsPackageRevealed] = useState(true);
    const [showTrendToast, setShowTrendToast] = useState(false);
    const [isAddOnsExpanded, setIsAddOnsExpanded] = useState(true);
    const [revealedAddOns, setRevealedAddOns] = useState<Record<number, boolean>>({});
    const hudRef = useRef<HTMLDivElement>(null);

    const scrollToHUD = () => {
        hudRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    useEffect(() => {
        if (!patientToken) {
            onRecommendationLoad?.(null);
            return;
        }
        const fetchRecommendation = async () => {
            setLoading(true);
            setCurrentStage(null);
            setError(null);
            setDecisionOutcome(null);
            setNotes("");
            setSubmissionError(null);
            setShowRejectModal(false);
            setRejectReason("patient_refusal");
            setIsPackageRevealed(false);
            setShowTrendToast(false);
            setRevealedAddOns({});
            try {
                const result = await clinicalService.streamRecommendation(
                    patientToken,
                    (update) => setCurrentStage(update),
                    isRuleBasedForced,
                );
                setData(result);
                onRecommendationLoad?.(result);
                if (result) {
                    setShowTrendToast(true);
                }
            } catch (err) {
                console.error("Failed to fetch recommendation:", err);
                setError(err instanceof Error ? err.message : "Failed to load clinical recommendation");
            } finally {
                setLoading(false);
                setCurrentStage(null);
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
        const activeIdx = currentStage ? (STAGE_INDEX[currentStage.stage] ?? -1) : -1;
        // Progress: 0 before any stage, then 25% per completed/active stage
        const progressPct = activeIdx >= 0 ? Math.round(((activeIdx + 1) / PIPELINE_STAGES.length) * 100) : 5;
        const activeStageConfig = activeIdx >= 0 ? PIPELINE_STAGES[activeIdx] : null;

        return (
            <div className="h-[650px] flex flex-col items-center justify-center navavej-card relative overflow-hidden px-8">
                {/* Top progress bar */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-navavej-border overflow-hidden">
                    <motion.div
                        className={`h-full ${activeStageConfig?.color ?? "bg-navavej-teal"}`}
                        initial={{ width: "0%" }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                </div>

                {/* Active stage icon */}
                <motion.div
                    key={activeIdx}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className="mb-6"
                >
                    <div className={`w-24 h-24 rounded-[28px] flex items-center justify-center shadow-xl border-2 ${activeStageConfig ? `${activeStageConfig.bgCard} ${activeStageConfig.borderColor}` : "bg-navavej-gray-light border-navavej-border"}`}>
                        {activeStageConfig
                            ? <activeStageConfig.Icon className={`w-12 h-12 ${activeStageConfig.textColor} animate-pulse`} />
                            : <Loader2 className="w-12 h-12 text-navavej-teal animate-spin" />
                        }
                    </div>
                </motion.div>

                {/* Active stage label */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStage?.stage ?? "init"}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -10, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="text-center mb-6"
                    >
                        <p className="text-base font-black tracking-[0.08em] text-navavej-gray-dark uppercase">
                            {activeStageConfig?.shortLabel ?? "Preparing…"}
                        </p>
                        <p className="text-[11px] font-medium text-navavej-gray-med mt-1 max-w-xs mx-auto leading-relaxed">
                            {activeStageConfig?.description ?? "Connecting to clinical data sources…"}
                        </p>
                        {activeStageConfig?.hint && (
                            <p className={`text-[10px] font-bold mt-2 uppercase tracking-widest ${activeStageConfig.textColor}`}>
                                ⏱ {activeStageConfig.hint}
                            </p>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Step indicator row */}
                <div className="flex items-center gap-2 w-full max-w-sm">
                    {PIPELINE_STAGES.map((stage, idx) => {
                        const isDone = idx < activeIdx;
                        const isActive = idx === activeIdx;
                        const isPending = idx > activeIdx;
                        return (
                            <React.Fragment key={stage.num}>
                                <div className="flex flex-col items-center gap-1 flex-1">
                                    <motion.div
                                        animate={isActive ? { scale: [1, 1.15, 1] } : {}}
                                        transition={isActive ? { duration: 1.2, repeat: Infinity } : {}}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center border-2 shadow-sm ${isDone
                                            ? "bg-emerald-500 border-emerald-500"
                                            : isActive
                                                ? `${stage.color} ${stage.borderColor}`
                                                : "bg-navavej-gray-light border-navavej-border"
                                            }`}
                                    >
                                        {isDone
                                            ? <CheckCircle className="w-4 h-4 text-white" />
                                            : isActive
                                                ? <stage.Icon className="w-4 h-4 text-white" />
                                                : <span className="text-[10px] font-black text-navavej-gray-med">{idx + 1}</span>
                                        }
                                    </motion.div>
                                    <span className={`text-[9px] font-bold uppercase tracking-wide text-center leading-tight ${isDone ? "text-emerald-600" : isActive ? stage.textColor : "text-navavej-gray-med opacity-50"
                                        }`}>
                                        {stage.shortLabel}
                                    </span>
                                </div>
                                {idx < PIPELINE_STAGES.length - 1 && (
                                    <div className={`h-[2px] flex-1 mb-4 rounded-full transition-all duration-500 ${idx < activeIdx ? "bg-emerald-400" : "bg-navavej-border"}`} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
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
                className="space-y-6"
            >
                    <div 
                        ref={hudRef}
                        className="lg:col-span-12 grid grid-cols-1 md:grid-cols-12 navavej-card p-0 rounded-[24px] overflow-hidden shadow-2xl relative bg-white border border-navavej-border min-h-[160px] items-stretch"
                    >                        {/* 1. Active Monitoring (Gauge) - Equally Sized */}
                        <div className="md:col-span-2 border-r border-navavej-border/60 p-4 flex flex-col items-center justify-center bg-white group relative">
                            <div className="scale-[0.6] origin-center -mb-4">
                                <ClinicalRiskGauge value={data.overall_risk_level} />
                            </div>
                            <div className="flex flex-col items-center mt-2">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <div className="w-1.5 h-1.5 bg-navavej-teal rounded-full animate-pulse shadow-[0_0_5px_rgba(20,184,166,0.6)]" />
                                    <span className="text-[10px] font-bold text-navavej-teal uppercase tracking-widest">Active Monitoring</span>
                                </div>
                                <p className="text-[8px] text-navavej-gray-med font-medium text-center italic opacity-60">Personalized baseline.</p>
                            </div>
                        </div>

                        {/* 2. Strategic Tier (Blue box) - Equally Sized */}
                        <div className={cn(
                            "md:col-span-2 p-4 text-white flex flex-col justify-center items-center relative overflow-hidden transition-all duration-1000",
                            (data.ai_recommended_tier || "Premium").toLowerCase() === "premium" ? "bg-gradient-to-br from-cyan-600 to-blue-900" :
                                (data.ai_recommended_tier || "Premium").toLowerCase() === "advanced" ? "bg-gradient-to-br from-[#4A5568] to-[#2D3748]" : "bg-gradient-to-br from-amber-600 to-amber-900"
                        )}>
                             <div className="flex items-center justify-center gap-1.5 mb-3 opacity-80 relative z-10 w-full group">
                                <Package className="w-3.5 h-3.5 text-white/40 group-hover:text-white/60 transition-colors" />
                                <span className="text-[9px] font-bold uppercase tracking-widest text-white/60">Strategic Tier</span>
                            </div>

                            <div className="flex flex-col items-center gap-4 w-full relative z-10 text-center">
                                <PackageSeal tier={data.ai_recommended_tier || "Premium"} />
                                <div className="flex flex-col items-center">
                                    <h3 className="text-xl font-black tracking-tight leading-none mb-1.5 drop-shadow-xl uppercase text-center">
                                        {data.ai_recommended_tier || "Premium"}
                                    </h3>
                                    <div className="flex items-center gap-1.5 justify-center">
                                        <div className="w-1 h-1 bg-navavej-teal rounded-full" />
                                        <span className="text-[6px] font-black uppercase tracking-[0.2em] text-white/50">Trace Verified</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Recommended Plan section - Equally Sized */}
                        <div className="md:col-span-2 p-4 flex flex-col items-center justify-center bg-white border-r border-navavej-border/60 relative group text-center">
                            <div className="space-y-3 flex flex-col items-center">
                                <div className="space-y-0.5">
                                    <span className="text-[8px] font-bold text-navavej-gray-med uppercase tracking-wider block opacity-70">Plan Type</span>
                                    <span className={cn("text-sm font-bold leading-tight tracking-tight", privacyMode ? "text-navavej-red/70 font-mono" : "text-navavej-gray-dark")}>
                                        {privacyMode ? maskedPackageName : (data.resolved_package?.name || data.resolved_package?.package_name || "Unknown Plan")}
                                    </span>
                                </div>
                                
                                <div className="space-y-1">
                                    <span className="text-[9px] font-bold text-navavej-gray-med uppercase tracking-wider block opacity-70">Total Investment</span>
                                    <span className={cn("text-2xl font-bold tracking-tighter", privacyMode ? "text-navavej-red/70 font-mono" : "text-navavej-teal")}>
                                        {privacyMode ? maskedPriceValue : (data.resolved_package?.price_thb ? `฿${data.resolved_package.price_thb.toLocaleString()}` : "Price TBD")}
                                    </span>
                                </div>

                                <div className="mx-auto w-fit px-2 py-1 bg-navavej-gray-light border border-navavej-border/60 rounded-md flex items-center justify-center gap-1.5">
                                    <ShieldCheck className="w-2.5 h-2.5 text-navavej-teal" />
                                    <span className="text-[6px] font-black uppercase text-navavej-gray-dark tracking-[0.2em]">Safety OK</span>
                                </div>
                            </div>
                        </div>

                        {/* 4. Strategic Add-ons HUD - Single Column Vertical List */}
                        <div className="md:col-span-6 bg-white p-4 flex flex-col relative border-l border-navavej-border/40">
                            <div className="flex justify-between items-center mb-3 shrink-0">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-3.5 h-3.5 text-navavej-teal" />
                                    <h4 className="text-[9px] font-bold text-navavej-teal uppercase tracking-widest">Strategic Add-ons</h4>
                                </div>
                                <div className="px-3 py-1 bg-navavej-teal/10 rounded-full text-[9px] font-bold text-navavej-teal uppercase tracking-widest">
                                    {data.add_ons?.length || 0} Recommended
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[220px]">
                                <div className="space-y-3">
                                    {data.add_ons && data.add_ons.length > 0 ? (
                                        [...data.add_ons]
                                            .sort((a, b) => {
                                                const pMap: Record<string, number> = { 'red': 0, 'critical': 0, 'high': 0, 'orange': 1, 'yellow': 2, 'medium': 2, 'green': 3, 'low': 3 };
                                                const prioA = (a.priority_level || a.priority || "").toLowerCase();
                                                const prioB = (b.priority_level || b.priority || "").toLowerCase();
                                                return (pMap[prioA] ?? 99) - (pMap[prioB] ?? 99);
                                            })
                                            .map((item, idx) => {
                                                const prio = (item.priority_level || item.priority || "").toLowerCase();
                                                const isRed = prio === 'red' || prio === 'critical' || prio === 'high';
                                                const isGreen = prio === 'green' || prio === 'low';
                                                
                                                return (
                                                    <div 
                                                        key={idx} 
                                                        className={cn(
                                                            "group relative p-3 rounded-2xl border-2 transition-all duration-300 hover:shadow-xl hover:scale-[1.01] cursor-help",
                                                            isRed ? "bg-navavej-red/[0.03] border-navavej-red/10 hover:border-navavej-red/30" :
                                                            isGreen ? "bg-emerald-50/20 border-emerald-100 hover:border-emerald-300" :
                                                            "bg-amber-50/20 border-amber-100 hover:border-amber-300"
                                                        )}
                                                    >
                                                        <div className="flex justify-between items-center gap-4">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={cn(
                                                                        "w-1.5 h-1.5 rounded-full shadow-sm shrink-0",
                                                                        isRed ? "bg-navavej-red animate-pulse" :
                                                                        isGreen ? "bg-emerald-500" : "bg-amber-500"
                                                                    )} />
                                                                    <h5 className="text-[13px] font-bold text-navavej-gray-dark tracking-tight leading-none truncate group-hover:whitespace-normal">
                                                                        {item.label}
                                                                    </h5>
                                                                </div>
                                                                
                                                                {/* Reveal-on-hover rationale */}
                                                                <div className="max-h-0 opacity-0 overflow-hidden group-hover:max-h-32 group-hover:opacity-100 group-hover:mt-3 transition-all duration-500 ease-in-out">
                                                                    <p className="text-[11px] font-bold text-navavej-gray-dark/60 leading-relaxed italic border-l-2 border-navavej-teal/20 pl-3">
                                                                        {item.rationale}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <p className={cn(
                                                                    "text-[14px] font-black tracking-tight",
                                                                    isRed ? "text-navavej-red" : isGreen ? "text-emerald-700" : "text-amber-700"
                                                                )}>
                                                                    {item.price_thb ? `฿${item.price_thb.toLocaleString()}` : '—'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                    ) : (
                                        <div className="text-center py-8 opacity-30 italic text-[10px] font-bold uppercase tracking-widest">
                                            No additional tests recommended
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                <AnimatePresence>
                    {showTrendToast && <TrendToast onDismiss={() => setShowTrendToast(false)} />}
                </AnimatePresence>

                {/* Evolution & Trends - Only shown if not hidden */}
                {!hideCharts && (
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
                )}

                {/* Detailed Logic & Alerts Reorganized */}
                <div className="space-y-10">
                    {/* 1. Clinical AI Reasoning - Full Width for Maximum Impact */}
                    <div className="navavej-card p-12 border-none bg-white shadow-xl shadow-navavej-teal/[0.03] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-navavej-teal/[0.02] rounded-full translate-x-16 -translate-y-16 group-hover:scale-110 transition-transform duration-700" />

                        <div className="flex items-center justify-between mb-10 relative z-10">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 bg-navavej-teal/10 rounded-2xl flex items-center justify-center border border-navavej-teal/20 shadow-inner group-hover:rotate-1 transition-transform">
                                    <BrainCircuit className="w-8 h-8 text-navavej-teal" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-navavej-gray-dark tracking-tighter leading-none uppercase italic">Clinical Logic & Rationale</h3>
                                    <p className="text-[11px] font-black text-navavej-teal uppercase tracking-[0.2em] mt-2 opacity-80">Physician Evidence Stream</p>
                                </div>
                            </div>
                            <div className="px-4 py-1.5 bg-navavej-teal/10 rounded-full text-[10px] font-black text-navavej-teal uppercase tracking-[0.2em] shadow-sm">Trace Active</div>
                        </div>

                        <div className="relative z-10 bg-white rounded-[24px] p-6 border border-navavej-border/50 shadow-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {clinicalReasoningLines.length > 0 ? (
                                    clinicalReasoningLines.map((line: string, idx: number) => {
                                        const sentiment = getLineSentiment(line);
                                        return (
                                            <div key={idx} className={cn(
                                                "flex items-start gap-3 p-3 rounded-2xl transition-all border",
                                                sentiment === 'bad' ? "bg-navavej-red/[0.03] border-navavej-red/10" : 
                                                sentiment === 'good' ? "bg-navavej-teal/[0.03] border-navavej-teal/10" : 
                                                "bg-navavej-gray-light/40 border-navavej-border/20"
                                            )}>
                                                <div className="mt-1 shrink-0 flex flex-col items-center">
                                                    {sentiment === 'bad' ? (
                                                        <div className="w-2 h-2 rounded-full bg-navavej-red animate-pulse shadow-[0_0_8px_rgba(190,18,60,0.4)]" />
                                                    ) : sentiment === 'good' ? (
                                                        <div className="w-2 h-2 rounded-full bg-navavej-teal shadow-[0_0_8px_rgba(20,184,166,0.4)]" />
                                                    ) : (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-navavej-gray-med/60" />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <p className={cn(
                                                        "text-[13px] font-bold leading-relaxed text-justify",
                                                        sentiment === 'bad' ? "text-navavej-red/90" :
                                                        sentiment === 'good' ? "text-navavej-teal/90" :
                                                        "text-navavej-gray-dark",
                                                        privacyMode && "font-mono"
                                                    )}>
                                                        {renderBoldText(line, sentiment)}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="col-span-2 flex flex-col items-center justify-center py-6 opacity-50">
                                        <span className="text-[10px] font-bold text-navavej-gray-med uppercase tracking-widest">Insufficient reasoning trace data</span>
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


                    {/* 2. Critical Analytics & Execution */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                        {/* Critical Signals & Action Panel */}
                        <div className="lg:col-span-12 flex flex-col lg:flex-row gap-10">
                            <div className="lg:w-1/3 navavej-card p-8 bg-navavej-red/[0.02] border-l-[12px] border-navavej-red shadow-xl shadow-navavej-red/5">
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
                                                    <div className={cn(
                                                        "w-2.5 h-2.5 rounded-full shadow-inner",
                                                        (alert.value === "Critical" || alert.value === "High") ? "bg-navavej-red" : "bg-yellow-500"
                                                    )} />
                                                    <div>
                                                        <h4 className={cn("text-[10px] font-black uppercase", privacyMode ? "text-navavej-red/70 font-mono" : "text-navavej-gray-dark")}>
                                                            {privacyMode ? "Masked Alert" : alert.label}
                                                        </h4>
                                                        <p className={cn("text-[9px] font-bold italic", privacyMode ? "text-navavej-red/70 font-mono" : "text-navavej-gray-med")}>
                                                            {privacyMode ? "Masked Clinical Details" : alert.sub}
                                                        </p>
                                                    </div>
                                                </div>
                                                {!privacyMode && (
                                                    <div className={cn(
                                                        "text-[7px] font-black px-1.5 py-0.5 rounded border uppercase tracking-widest",
                                                        (alert.value === "Critical" || alert.value === "High") ? "text-navavej-red border-navavej-red/20" : "text-yellow-600 border-yellow-600/20"
                                                    )}>
                                                        Priority
                                                    </div>
                                                )}
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
                            <div className="lg:flex-1 bg-navavej-gray-light rounded-[24px] p-8 border border-navavej-border flex flex-col shadow-inner">
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
                                                {isSubmitting ? "..." : "CLOSE CLINICAL GAPS"}
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
                                <div className="p-6 bg-white rounded-[24px] border border-navavej-border shadow-sm">
                                    <p className="text-sm font-medium text-navavej-gray-dark leading-relaxed text-justify">
                                        {renderBoldText(data.communication_script?.opening || data.communication_script?.clinical_conclusion)}
                                    </p>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-navavej-gray-med uppercase tracking-widest mb-3 border-b border-navavej-border pb-1 w-fit">Core Health Insights</h4>
                                <div className="space-y-2">
                                    {splitConsultationSentences(data.communication_script?.health_summary || "").map((sentence: string, i: number) => (
                                        <div key={i} className="flex gap-2">
                                            <div className="mt-1.5 w-1 h-1 rounded-full bg-navavej-teal shrink-0" />
                                            <p className="text-sm font-medium text-navavej-gray-dark leading-relaxed text-justify">
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
                                    {splitConsultationSentences(data.communication_script?.next_steps || "").map((sentence: string, i: number) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <div className="mt-1 shrink-0 bg-emerald-100 p-1 rounded-full border border-emerald-200 shadow-sm"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /></div>
                                            <p className="text-[12px] font-bold text-navavej-gray-dark leading-relaxed text-justify">
                                                {renderBoldText(sentence)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-[10px] font-black text-navavej-gray-med uppercase tracking-widest mb-3 border-b border-navavej-border pb-1 w-fit">Strategy Summary</h4>
                                <div 
                                    onClick={scrollToHUD}
                                    className="bg-navavej-gray-dark rounded-[24px] p-6 text-white relative overflow-hidden group shadow-xl cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                                >                                    <div className="absolute top-0 right-0 w-64 h-64 bg-navavej-teal/5 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2" />
                                    <div className="relative z-10 space-y-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <h3 className="text-xl font-bold tracking-tight leading-none italic mb-2">
                                                    Recommended <span className="text-navavej-teal">Intelligence Plan</span>
                                                </h3>
                                                <p className="text-white/60 text-[11px] font-medium leading-relaxed line-clamp-2">
                                                    {(data.resolved_package?.name || data.ai_recommended_tier)} base + {data.add_ons.length} additions
                                                </p>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <span className="text-[8px] font-bold uppercase tracking-widest text-white/40 block mb-1">Estimate</span>
                                                <p className="text-2xl font-black tracking-tighter text-white">
                                                    ฿{((data.resolved_package?.price_thb || 0) + data.add_ons.reduce((sum, item) => sum + (item.price_thb || 0), 0)).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        <button className="w-full py-3 bg-navavej-teal hover:bg-navavej-teal/90 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-navavej-teal/20 transition-all">
                                            Confirm Strategic Selection
                                        </button>
                                    </div>
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
