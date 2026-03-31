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
import { CriticalSignal, PatientHighAlert, RecommendationAddOn, RecommendationResponse } from "@/types/recommendation";
import { renderHighlightedText, severityToStyles } from "@/shared/recommendationTextFormatting";
import { PromotionDrawer } from "./PromotionDrawer";

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
    const [riskToast, setRiskToast] = useState<{ message: string; key: number } | null>(null);
    const [showDealsDrawer, setShowDealsDrawer] = useState(false);
    const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set());
    const hudRef = useRef<HTMLDivElement>(null);
    const riskToastTriggerRef = useRef<HTMLButtonElement>(null);
    const riskToastPanelRef = useRef<HTMLDivElement>(null);

    const scrollToHUD = () => {
        hudRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    useEffect(() => {
        if (!riskToast) return;

        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (riskToastPanelRef.current?.contains(target) || riskToastTriggerRef.current?.contains(target)) {
                return;
            }
            setRiskToast(null);
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setRiskToast(null);
            }
        };

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [riskToast]);

    // Initialize all add-ons as selected when data loads
    useEffect(() => {
        if (data?.add_ons) {
            setSelectedAddOns(new Set(data.add_ons.map(a => a.item_code)));
        }
    }, [data?.add_ons]);

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
    // reasoning_trace_annotated is always present from the backend; no string-parsing fallback needed.
    const structuredReasoningLines = data.reasoning_trace_annotated ?? [];
    const clinicalReasoningLines = structuredReasoningLines.filter((line) => line.scope === "clinical_reasoning");
    const policyReasoningLines = structuredReasoningLines.filter((line) => line.scope === "policy_reasoning");
    const consultationSummaryHeadline = data.communication_script?.summary_headline
        || data.communication_script?.opening
        || data.communication_script?.clinical_conclusion
        || "";
    const consultationSummaryHighlights = data.communication_script?.summary_headline_highlights ?? [];
    const consultationTopFindings = data.communication_script?.top_findings ?? [];
    const consultationProgramJustification = data.communication_script?.program_justification
        || data.communication_script?.recommendation_explanation
        || "";
    const consultationProgramHighlights = data.communication_script?.program_justification_highlights ?? [];
    const consultationPriorityAddOns = data.communication_script?.priority_add_ons ?? [];
    const consultationNextActions = data.communication_script?.next_actions ?? [];
    const maskedPackageName = "-";
    const maskedPriceValue = "-";
    const confidenceScore = typeof data.confidence_score === "number" ? data.confidence_score : null;
    const confidencePercent = confidenceScore === null ? null : Math.round(confidenceScore * 100);
    const confidenceColorClass =
        confidenceScore === null
            ? "text-navavej-gray-med"
            : confidenceScore >= 0.75
                ? "text-emerald-600"
                : confidenceScore >= 0.5
                    ? "text-amber-600"
                    : "text-navavej-red";
    const isRiskFallback = data.risk_summary?.is_fallback === true;
    const riskSummaryText = data.risk_summary?.description
        || `Overall risk is ${data.overall_risk_level} based on currently available clinical context.`;

    // --- Promotion overlay variables ---
    const packageOriginalPrice = data.resolved_package?.original_price_thb;
    const packageCurrentPrice = data.resolved_package?.price_thb;
    const promoSummary = data.promotion_summary;
    const urgencyMessages = promoSummary?.urgency_messages ?? [];


    // --- Full price totals (package + add-ons) ---
    // --- Full price totals (only selected add-ons) ---
    const selectedAddOnsList = data.add_ons.filter(a => selectedAddOns.has(a.item_code));
    const addOnCurrentTotal = selectedAddOnsList.reduce((sum, item) => sum + (item.promo_price_thb ?? item.price_thb ?? 0), 0);
    const addOnOriginalTotal = selectedAddOnsList.reduce((sum, item) => sum + (item.original_price_thb ?? item.price_thb ?? 0), 0);
    const fullCurrentPrice = (packageCurrentPrice ?? 0) + addOnCurrentTotal;
    const fullOriginalPrice = (packageOriginalPrice ?? packageCurrentPrice ?? 0) + addOnOriginalTotal;
    const hasFullDiscount = fullOriginalPrice > fullCurrentPrice;
    const selectedAddonSavings = selectedAddOnsList.reduce((sum, a) => {
        if (a.promotions_applied && a.promotions_applied.length > 0 && a.original_price_thb && a.promo_price_thb != null) {
            return sum + (a.original_price_thb - a.promo_price_thb);
        }
        return sum;
    }, 0);
    const selectedTotalSavings = (promoSummary?.total_savings_thb ?? 0) - (data.add_ons.reduce((sum, a) => {
        if (a.promotions_applied && a.promotions_applied.length > 0 && a.original_price_thb && a.promo_price_thb != null) {
            return sum + (a.original_price_thb - a.promo_price_thb);
        }
        return sum;
    }, 0)) + selectedAddonSavings;

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
                        <div className={cn(
                            "md:col-span-3 border-r border-navavej-border/60 p-4 flex flex-col items-center justify-center bg-white group relative",
                            riskToast ? "z-20" : "z-10"
                        )}>
                            <div className="scale-[0.6] origin-center -mb-4">
                                <ClinicalRiskGauge value={data.overall_risk_level} />
                            </div>
                            <div className="flex flex-col items-center mt-2">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <div className="w-1.5 h-1.5 bg-navavej-teal rounded-full animate-pulse shadow-[0_0_5px_rgba(20,184,166,0.6)]" />
                                    <span className="text-[10px] font-bold text-navavej-teal uppercase tracking-widest">Active Monitoring</span>
                                </div>
                                <p className="text-[8px] text-navavej-gray-med font-medium text-center italic opacity-60">Personalized baseline.</p>
                                <div className="flex flex-col items-center gap-0.5 mt-1.5 mb-1">
                                    <span className={cn("text-lg font-black", confidenceColorClass)}>
                                        {confidencePercent === null ? "—%" : `${confidencePercent}%`}
                                    </span>
                                    <span className="text-[7px] font-black uppercase tracking-[0.18em] text-navavej-gray-med/60">
                                        {data.confidence_tier ? `${data.confidence_tier} Confidence` : "AI Confidence"}
                                    </span>
                                </div>
                                <div className="relative mt-1">
                                    <button
                                        ref={riskToastTriggerRef}
                                        type="button"
                                        onClick={() => setRiskToast((curr) => curr ? null : { message: riskSummaryText, key: Date.now() })}
                                        aria-haspopup="dialog"
                                        aria-expanded={riskToast !== null}
                                        aria-controls={riskToast ? "risk-summary-popover" : undefined}
                                        className="text-[8px] font-black uppercase tracking-[0.12em] px-2 py-0.5 rounded border border-navavej-border bg-white text-navavej-gray-med hover:text-navavej-teal hover:border-navavej-teal/40 transition-colors"
                                    >
                                        Risk Summary
                                    </button>
                                    <AnimatePresence>
                                        {riskToast && (
                                            <motion.div
                                                id="risk-summary-popover"
                                                ref={riskToastPanelRef}
                                                role="dialog"
                                                aria-label="Risk Summary"
                                                key={riskToast.key}
                                                initial={{ opacity: 0, y: -4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -4 }}
                                                className="absolute top-full left-1/2 z-[80] mt-2 w-[min(16rem,calc(100vw-3rem))] -translate-x-1/2 rounded-xl border border-navavej-teal/30 bg-white shadow-xl p-3 md:left-full md:top-1/2 md:mt-0 md:ml-3 md:w-64 md:-translate-y-1/2 md:translate-x-0"
                                            >
                                                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-navavej-teal mb-1">Risk Summary</p>
                                                <p className="text-[11px] font-medium text-navavej-gray-dark leading-relaxed">{riskToast.message}</p>
                                                {isRiskFallback && (
                                                    <p className="text-[9px] font-bold text-amber-600 mt-1.5">Fallback active — signal-store context unavailable.</p>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                {isRiskFallback && (
                                    <span className="mt-1 text-[8px] font-black uppercase tracking-[0.12em] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                        Fallback
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* 2. Plan Identity Card */}
                        <div className={cn(
                            "md:col-span-2 p-5 text-white flex flex-col items-center justify-center relative overflow-hidden transition-all duration-1000",
                            (data.ai_recommended_tier || "Premium").toLowerCase() === "premium" ? "bg-gradient-to-br from-cyan-600 to-blue-900" :
                                (data.ai_recommended_tier || "Premium").toLowerCase() === "advanced" ? "bg-gradient-to-br from-[#4A5568] to-[#2D3748]" : "bg-gradient-to-br from-amber-600 to-amber-900"
                        )}>
                            <div className="relative z-10 flex flex-col items-center gap-3 text-center">
                                <PackageSeal tier={data.ai_recommended_tier || "Premium"} />
                                <div>
                                    <h4 className={cn("text-base font-black leading-tight tracking-tight mt-1", privacyMode ? "text-navavej-red/70 font-mono" : "text-white drop-shadow-md")}>
                                        {privacyMode ? maskedPackageName : (data.resolved_package?.name || data.resolved_package?.package_name || "Unknown Plan")}
                                    </h4>
                                    {!privacyMode && data.add_ons.length > 0 && (
                                        <p className="text-[9px] font-bold text-white/80 uppercase tracking-widest mt-1">
                                            + {selectedAddOns.size}/{data.add_ons.length} select add-ons
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 3. Pricing Card */}
                        <div className="md:col-span-2 bg-[#F8FAFC] p-5 flex flex-col justify-center gap-2 border-r border-navavej-border/40 relative">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-navavej-gray-med">Total Investment</span>
                            <div className="flex flex-col gap-0.5 mt-1">
                                {!privacyMode && hasFullDiscount && (
                                    <span className="text-[13px] font-bold text-navavej-gray-med/70 line-through tracking-tight">
                                        ฿{fullOriginalPrice.toLocaleString()}
                                    </span>
                                )}
                                <span className={cn("text-4xl font-black tracking-tighter leading-none -ml-0.5", privacyMode ? "text-navavej-red/70 font-mono" : "text-navavej-gray-dark")}>
                                    {privacyMode ? maskedPriceValue : (fullCurrentPrice > 0 ? `฿${fullCurrentPrice.toLocaleString()}` : "Price TBD")}
                                </span>
                            </div>
                            
                            {!privacyMode && (selectedTotalSavings > 0 || urgencyMessages.length > 0 || promoSummary) && (
                                <div className="flex flex-wrap items-center gap-2 mt-3">
                                    {selectedTotalSavings > 0 && (
                                        <span className="px-2.5 py-1 bg-emerald-100 border border-emerald-200 rounded-md text-[9px] font-black text-emerald-700 uppercase tracking-widest shadow-sm">
                                            Save ฿{selectedTotalSavings.toLocaleString()}
                                        </span>
                                    )}
                                    {promoSummary && (
                                        <button
                                            type="button"
                                            onClick={() => setShowDealsDrawer(true)}
                                            className="px-2.5 py-1 bg-amber-100 border border-amber-300 rounded-md flex items-center gap-1 hover:bg-amber-200 transition-colors shadow-sm active:scale-95 cursor-pointer"
                                        >
                                            <span className="text-[9px] font-black uppercase text-amber-700 tracking-widest">฿ Deals</span>
                                        </button>
                                    )}
                                    {urgencyMessages.length > 0 && (
                                        <span className="px-2.5 py-1 bg-pink-100 border border-pink-200 rounded-md text-[8px] font-black text-pink-600 uppercase tracking-widest animate-pulse shadow-sm block w-full mt-1">
                                            {urgencyMessages[0]}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 4. Strategic Add-ons HUD - Single Column Vertical List */}
                        <div className="md:col-span-5 bg-white p-4 flex flex-col relative border-l border-navavej-border/40">
                            <div className="flex justify-between items-center mb-3 shrink-0">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-3.5 h-3.5 text-navavej-teal" />
                                    <h4 className="text-[9px] font-bold text-navavej-teal uppercase tracking-widest">Medical Screening Add-ons</h4>
                                </div>
                                <div className="px-3 py-1 bg-navavej-teal/10 rounded-full text-[9px] font-bold text-navavej-teal uppercase tracking-widest">
                                    {data.add_ons?.length || 0} Recommended
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[220px]">
                                <div className="divide-y divide-navavej-border/20">
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
                                                const isSelected = selectedAddOns.has(item.item_code);
                                                
                                                return (
                                                    <div 
                                                        key={idx} 
                                                        className={cn(
                                                            "group relative py-1.5 px-3 transition-colors duration-200 cursor-help flex items-center gap-3",
                                                            "border-l-[3px]",
                                                            isSelected ? (isRed ? "border-navavej-red hover:bg-navavej-red/[0.02]" : isGreen ? "border-emerald-500 hover:bg-emerald-50/20" : "border-yellow-500 hover:bg-amber-50/20") : "border-navavej-border/40 opacity-50 hover:opacity-100 bg-transparent"
                                                        )}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => {
                                                                setSelectedAddOns(prev => {
                                                                    const next = new Set(prev);
                                                                    if (next.has(item.item_code)) next.delete(item.item_code);
                                                                    else next.add(item.item_code);
                                                                    return next;
                                                                });
                                                            }}
                                                            className="w-[14px] h-[14px] rounded-[3px] border-2 border-navavej-border text-navavej-teal focus:ring-navavej-teal/30 shrink-0 cursor-pointer accent-[var(--color-navavej-teal)]"
                                                        />
                                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                            <div className="flex items-center gap-2">
                                                                <div className={cn(
                                                                    "w-[5px] h-[5px] rounded-full shrink-0",
                                                                    isRed ? "bg-navavej-red" : isGreen ? "bg-emerald-500" : "bg-yellow-500"
                                                                )} />
                                                                <h5 className="text-[11px] font-bold text-navavej-gray-dark tracking-tight truncate">
                                                                    {item.label}
                                                                </h5>
                                                            </div>
                                                            <div className="max-h-0 opacity-0 overflow-hidden group-hover:max-h-[30px] group-hover:opacity-100 group-hover:mt-0.5 transition-all duration-300 ease-in-out">
                                                                <p className="text-[10px] font-medium text-navavej-gray-med italic line-clamp-1 ml-3.5">
                                                                    {item.rationale}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0 flex flex-col items-end justify-center">
                                                            {item.promotions_applied && item.promotions_applied.length > 0 && item.original_price_thb && (
                                                                <span className="text-[9px] font-bold text-navavej-gray-med/50 line-through leading-none mb-0.5">
                                                                    ฿{item.original_price_thb.toLocaleString()}
                                                                </span>
                                                            )}
                                                            <span className={cn(
                                                                "text-[12px] font-black tracking-tight leading-none",
                                                                isRed ? "text-navavej-red" : isGreen ? "text-emerald-700" : "text-amber-700"
                                                            )}>
                                                                {item.price_thb ? `฿${(item.promo_price_thb ?? item.price_thb).toLocaleString()}` : '—'}
                                                            </span>
                                                            {item.promotions_applied && item.promotions_applied.length > 0 && (
                                                                <span className="text-[7px] font-bold uppercase tracking-wider text-amber-600 mt-0.5 leading-none">
                                                                    {item.promotions_applied[0].label_short}
                                                                </span>
                                                            )}
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
                                    clinicalReasoningLines.map((line, idx: number) => {
                                        const sentiment = line.sentiment;
                                        return (
                                            <div key={idx} className={cn(
                                                "flex items-start gap-3 p-3 rounded-2xl transition-all border",
                                                sentiment === 'risk' ? "bg-navavej-red/[0.03] border-navavej-red/10" : 
                                                sentiment === 'reassuring' ? "bg-navavej-teal/[0.03] border-navavej-teal/10" : 
                                                "bg-navavej-gray-light/40 border-navavej-border/20"
                                            )}>
                                                <div className="mt-1 shrink-0 flex flex-col items-center">
                                                    {sentiment === 'risk' ? (
                                                        <div className="w-2 h-2 rounded-full bg-navavej-red animate-pulse shadow-[0_0_8px_rgba(190,18,60,0.4)]" />
                                                    ) : sentiment === 'reassuring' ? (
                                                        <div className="w-2 h-2 rounded-full bg-navavej-teal shadow-[0_0_8px_rgba(20,184,166,0.4)]" />
                                                    ) : (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-navavej-gray-med/60" />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <p className={cn(
                                                        "text-[13px] font-bold leading-relaxed text-left",
                                                        sentiment === 'risk' ? "text-navavej-red/90" :
                                                        sentiment === 'reassuring' ? "text-navavej-teal/90" :
                                                        "text-navavej-gray-dark",
                                                        privacyMode && "font-mono"
                                                    )}>
                                                        {renderHighlightedText(line.text, line.sentiment, line.highlight_terms)}
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
                                    {policyReasoningLines.map((line, idx: number) => (
                                        <p
                                            key={idx}
                                            className={cn(
                                                "text-sm font-medium leading-relaxed text-left",
                                                privacyMode ? "font-mono text-navavej-red/80" : "text-navavej-gray-dark"
                                            )}
                                        >
                                            {renderHighlightedText(line.text, line.sentiment, line.highlight_terms)}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-8 flex items-center gap-6 text-navavej-gray-med text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
                            <span className="flex items-center gap-2 bg-navavej-gray-light px-3 py-1 rounded-lg"><Search className="w-3 h-3" /> Data Integrity</span>
                            <span className="flex items-center gap-2 bg-navavej-gray-light px-3 py-1 rounded-lg"><Activity className="w-3 h-3" /> Logic Review</span>
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
                                    <p className="text-sm font-medium text-navavej-gray-dark leading-relaxed text-left">
                                        {renderHighlightedText(consultationSummaryHeadline, "informational", consultationSummaryHighlights)}
                                    </p>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-navavej-gray-med uppercase tracking-widest mb-3 border-b border-navavej-border pb-1 w-fit">Core Health Insights</h4>
                                <div className="space-y-2">
                                    {consultationTopFindings.map((finding, i) => (
                                        <div key={i} className="flex gap-2">
                                            <div className="mt-1.5 w-1 h-1 rounded-full bg-navavej-teal shrink-0" />
                                            <p className="text-sm font-medium text-navavej-gray-dark leading-relaxed text-left">
                                                {renderHighlightedText(finding.text, "neutral", finding.highlight_terms)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {consultationPriorityAddOns.length > 0 && (
                                <div className="mt-6 pt-6 border-t border-navavej-border">
                                    <h4 className="text-[10px] font-black text-navavej-gray-med uppercase tracking-widest mb-3 border-b border-navavej-border pb-1 w-fit">Special Highlights</h4>
                                    <div className="space-y-2">
                                        {consultationPriorityAddOns.map((addon, i) => {
                                            const styles = severityToStyles(addon.severity);
                                            return (
                                            <div key={i} className={cn("flex gap-3 rounded-2xl border px-3 py-2.5", styles.container)}>
                                                <div className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", styles.dot)} />
                                                <p className={cn("text-sm font-medium leading-relaxed text-left", styles.text)}>
                                                    {renderHighlightedText(addon.label, "informational")}
                                                </p>
                                            </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-8">
                            <div>
                                <h4 className="text-[10px] font-black text-navavej-gray-med uppercase tracking-widest mb-3 border-b border-navavej-border pb-1 w-fit">Why this program?</h4>
                                <div className="p-6 bg-navavej-gray-light rounded-2xl border-l-4 border-navavej-teal">
                                    <p className="text-sm font-bold text-navavej-gray-dark leading-relaxed text-left">
                                        {renderHighlightedText(consultationProgramJustification, "informational", consultationProgramHighlights)}
                                    </p>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-navavej-gray-med uppercase tracking-widest mb-3 border-b border-navavej-border pb-1 w-fit">Next steps</h4>
                                <div className="space-y-3">
                                    {consultationNextActions.map((action, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <div className="mt-1 shrink-0 bg-emerald-100 p-1 rounded-full border border-emerald-200 shadow-sm"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /></div>
                                            <p className="text-[12px] font-bold text-navavej-gray-dark leading-relaxed text-left">
                                                {renderHighlightedText(action.text, "reassuring", action.highlight_terms)}
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
                                                {hasFullDiscount && (
                                                    <p className="text-sm font-bold tracking-tight text-white/40 line-through mb-0.5">
                                                        ฿{fullOriginalPrice.toLocaleString()}
                                                    </p>
                                                )}
                                                <p className="text-2xl font-black tracking-tighter text-white">
                                                    ฿{fullCurrentPrice.toLocaleString()}
                                                </p>
                                                {selectedTotalSavings > 0 && (
                                                    <p className="text-[10px] font-black text-emerald-400 mt-1">
                                                        Total Savings: ฿{selectedTotalSavings.toLocaleString()}
                                                    </p>
                                                )}
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

            {/* Promotion Drawer */}
            <PromotionDrawer
                isOpen={showDealsDrawer}
                onClose={() => setShowDealsDrawer(false)}
                promoSummary={promoSummary}
                resolvedPackage={data.resolved_package}
                addOns={selectedAddOnsList}
            />

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
