"use client";

import { useEffect, useRef, useState } from "react";
import {
    ShieldCheck,
    BrainCircuit,
    AlertTriangle,
    CheckCircle2,
    Package,
    ArrowRight,
    TrendingUp,
    Activity,
    Stethoscope,
    ChevronDown,
    MessageSquare,
    Search,
    XCircle,
    Layers3,
    Sparkles,
    Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clinicalService } from "@/services/api";
import { cn } from "@/shared/utils";
import { BiomarkerCharts } from "./BiomarkerCharts";
import { LabResultsGrid } from "./LabResultsGrid";
import { LoadingSteps } from "./LoadingSteps";
import { PackageSealBadge } from "./PackageSealBadge";
import { CLINICAL_DICTIONARY } from "@/shared/clinical-dictionary";
import { CriticalSignal, PatientHighAlert, RecommendationAddOn, RecommendationResponse } from "@/types/recommendation";

interface RecommendationPanelProps {
    patientId: string | null;
    patientToken: string | null;
    privacyMode: boolean;
    onRecommendationLoad?: (data: RecommendationResponse | null) => void;
    onOpenTrendTimeline?: () => void;
    isRuleBasedForced: boolean;
}

interface NormalizedAlert {
    label: string;
    sub: string;
    value: string;
}

interface NormalizedAddOn extends RecommendationAddOn {
    itemKey: string;
    categoryLabel: string;
    priorityLabel: string;
    priorityRank: number;
    priceLabel: string;
    triggerSignals: string[];
}

interface AddOnGroup {
    id: string;
    categoryLabel: string;
    highestPriorityLabel: string;
    highestPriorityRank: number;
    items: NormalizedAddOn[];
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

    const isCritical = value === "Critical";
    const isHigh = value === "High";
    const isMedium = value === "Medium";

    const strokeColor = isCritical ? "#ef4444" : isHigh ? "#f97316" : isMedium ? "#eab308" : "#22c55e";
    const textColor = isCritical ? "text-red-600" : isHigh ? "text-orange-600" : isMedium ? "text-yellow-600" : "text-green-700";

    return (
        <div className="relative flex flex-col items-center group pt-4">
            {isCritical && (
                <motion.div
                    className="absolute top-5 h-[150px] w-[150px] rounded-full border-2 border-red-300/70"
                    animate={{ scale: [1, 1.08, 1], opacity: [0.75, 0.25, 0.75] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                />
            )}
            <svg className="w-[240px] h-[140px]" viewBox="0 0 100 56">
                <path
                    d="M 10 45 A 40 40 0 0 1 34 20"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="9"
                    strokeLinecap="round"
                    opacity="0.4"
                />
                <path
                    d="M 34 20 A 40 40 0 0 1 66 20"
                    fill="none"
                    stroke="#eab308"
                    strokeWidth="9"
                    strokeLinecap="round"
                    opacity="0.4"
                />
                <path
                    d="M 66 20 A 40 40 0 0 1 90 45"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="9"
                    strokeLinecap="round"
                    opacity="0.4"
                />
                <path
                    d="M 10 45 A 40 40 0 0 1 90 45"
                    fill="none"
                    stroke="var(--color-navavej-border)"
                    strokeWidth="10"
                    strokeLinecap="round"
                />
                <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: percentage / 100 }}
                    transition={{ duration: 2, ease: "circOut" }}
                    d="M 10 45 A 40 40 0 0 1 90 45"
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="11"
                    strokeLinecap="round"
                    className="transition-all duration-500"
                />
            </svg>
            <div className="absolute top-[62px] flex flex-col items-center">
                <span className={cn(
                    "text-4xl font-black transition-all duration-1000 tracking-tighter",
                    textColor
                )}>
                    {value}
                </span>
                <span className="text-[10px] uppercase tracking-[0.24em] text-navavej-gray-med font-black">Risk Level</span>
            </div>
        </div>
    );
};

const normalizePriorityLabel = (priority?: string) => {
    const normalized = (priority || "").trim().toLowerCase();
    if (normalized === "red" || normalized === "critical" || normalized === "high") return "Red";
    if (normalized === "orange") return "Orange";
    if (normalized === "yellow" || normalized === "medium") return "Yellow";
    if (normalized === "green" || normalized === "low") return "Green";
    return "Green";
};

const priorityRank = (priority?: string) => {
    const normalized = normalizePriorityLabel(priority);
    if (normalized === "Red") return 0;
    if (normalized === "Orange") return 1;
    if (normalized === "Yellow") return 2;
    return 3;
};

const priorityBadgeClass = (priority?: string) => {
    const normalized = normalizePriorityLabel(priority);
    if (normalized === "Red") return "bg-navavej-red";
    if (normalized === "Orange") return "bg-orange-500";
    if (normalized === "Yellow") return "bg-yellow-500";
    return "bg-green-600";
};

const formatPriceLabel = (value?: number | null) => {
    if (typeof value === "number") {
        return `฿${value.toLocaleString()}`;
    }
    return "Price TBD";
};

const slugifyKey = (value: string) =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "uncategorized";

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

const mapStreamStageToLoadingStep = (stage: number, currentStep: number): number => {
    if (stage <= 1) return 0;
    if (stage === 2) return 3;
    if (stage === 3) return 4;
    if (stage >= 6) return 5;
    return currentStep;
};

export function RecommendationPanel({ patientId, patientToken, privacyMode, onRecommendationLoad, isRuleBasedForced }: RecommendationPanelProps) {
    const [data, setData] = useState<RecommendationResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionError, setSubmissionError] = useState<string | null>(null);
    const [decisionOutcome, setDecisionOutcome] = useState<"approved" | "rejected" | null>(null);
    const [notes, setNotes] = useState("");
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState("patient_refusal");
    const [packageDetailsExpanded, setPackageDetailsExpanded] = useState(false);
    const [expandedAddOnGroups, setExpandedAddOnGroups] = useState<Record<string, boolean>>({});
    const [expandedAddOnItems, setExpandedAddOnItems] = useState<Record<string, boolean>>({});
    const riskSummaryButtonRef = useRef<HTMLButtonElement | null>(null);
    const actionPanelRef = useRef<HTMLDivElement | null>(null);
    const [riskToast, setRiskToast] = useState<{ message: string; metadata: string; key: number } | null>(null);

    useEffect(() => {
        if (!patientToken) {
            onRecommendationLoad?.(null);
            return;
        }
        let isCancelled = false;
        const fetchRecommendation = async () => {
            setLoading(true);
            setLoadingStep(0);
            setError(null);
            setDecisionOutcome(null);
            setNotes("");
            setSubmissionError(null);
            setShowRejectModal(false);
            setRejectReason("patient_refusal");
            setPackageDetailsExpanded(false);
            setExpandedAddOnGroups({});
            setExpandedAddOnItems({});
            try {
                const result = await clinicalService.getRecommendationStream(patientToken, isRuleBasedForced, {
                    onStage: (stage) => {
                        if (isCancelled) return;
                        setLoadingStep((current) => mapStreamStageToLoadingStep(stage, current));
                    },
                    onError: (message) => {
                        if (isCancelled) return;
                        console.warn("Recommendation stream warning:", message);
                    },
                });
                if (isCancelled) return;
                setData(result);
                onRecommendationLoad?.(result);
            } catch (err) {
                try {
                    const fallbackResult = await clinicalService.getRecommendation(patientToken, isRuleBasedForced);
                    if (isCancelled) return;
                    setData(fallbackResult);
                    onRecommendationLoad?.(fallbackResult);
                } catch (fallbackErr) {
                    console.error("Failed to fetch recommendation:", err);
                    setError(fallbackErr instanceof Error ? fallbackErr.message : "Failed to load clinical recommendation");
                }
            } finally {
                if (!isCancelled) {
                    setLoading(false);
                }
            }
        };
        fetchRecommendation();
        return () => {
            isCancelled = true;
        };
    }, [patientToken, isRuleBasedForced]);

    useEffect(() => {
        if (!riskToast) return;
        const timeoutId = window.setTimeout(() => setRiskToast(null), 4500);
        return () => window.clearTimeout(timeoutId);
    }, [riskToast]);

    const scrollToDecisionPanel = () => {
        actionPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    const handleToggleAddOnGroup = (groupId: string) => {
        setExpandedAddOnGroups((current) => ({
            ...current,
            [groupId]: !(current[groupId] ?? true),
        }));
    };

    const handleToggleAddOnItem = (itemKey: string) => {
        setExpandedAddOnItems((current) => ({
            ...current,
            [itemKey]: !current[itemKey],
        }));
    };

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
        return <LoadingSteps activeStep={loadingStep} />;
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
    const confidenceScore = typeof data.confidence_score === "number" ? data.confidence_score : null;
    const confidencePercent = confidenceScore === null ? null : Math.round(confidenceScore * 100);
    const confidenceColorClass =
        confidenceScore === null
            ? "text-navavej-gray-med"
            : confidenceScore >= 0.75
                ? "text-green-700"
                : confidenceScore >= 0.5
                    ? "text-amber-700"
                    : "text-red-700";
    const isRiskFallback = data.risk_summary?.is_fallback === true;
    const normalizedRiskLevel = (data.overall_risk_level || "Low").toLowerCase();
    const riskLevelLabel =
        normalizedRiskLevel === "critical"
            ? "Critical Risk Level"
            : normalizedRiskLevel === "high"
                ? "High Risk Level"
                : normalizedRiskLevel === "medium"
                    ? "Medium Risk Level"
                    : "Low Risk Level";
    const riskLevelClassName =
        normalizedRiskLevel === "critical"
            ? "text-red-700"
            : normalizedRiskLevel === "high"
                ? "text-red-600"
                : normalizedRiskLevel === "medium"
                    ? "text-amber-600"
                    : "text-green-700";
    const riskSummaryPrimaryText = data.risk_summary?.description || `Overall risk is ${data.overall_risk_level} based on currently available clinical context.`;
    const riskSummaryMetadataText = [
        data.risk_summary?.source ? `Source: ${data.risk_summary.source}.` : "",
        isRiskFallback ? "Fallback is active due to missing signal-store risk context." : "",
    ]
        .filter((item) => item.length > 0)
        .join(" ");
    const resolvedTier = data.ai_recommended_tier || data.resolved_package?.tier || data.rule_preliminary_tier || "Standard";
    const resolvedPackageName = data.resolved_package?.name || data.resolved_package?.package_name || "Unknown Package";
    const packageNameDisplay = privacyMode ? maskedPackageName : resolvedPackageName;
    const packagePriceDisplay = privacyMode ? maskedPriceValue : formatPriceLabel(data.resolved_package?.price_thb);
    const packageCodeDisplay = data.resolved_package?.package_code || "Unassigned";
    const packageSummaryRationale = data.communication_script?.recommendation_explanation || data.tier_deviation_justification || "No additional package rationale was returned.";
    const normalizedAddOns: NormalizedAddOn[] = [...(data.add_ons || [])]
        .map((item, index) => {
            const priorityLabel = normalizePriorityLabel(item.priority_level || item.priority);
            const categoryLabel = item.category?.trim() || "Uncategorized";
            return {
                ...item,
                itemKey: item.item_id || item.product_code || `${item.item_code}-${index}`,
                categoryLabel,
                priorityLabel,
                priorityRank: priorityRank(item.priority_level || item.priority),
                priceLabel: formatPriceLabel(item.price_thb),
                triggerSignals: item.trigger_signals_matched || [],
            };
        })
        .sort((left, right) => {
            if (left.priorityRank !== right.priorityRank) {
                return left.priorityRank - right.priorityRank;
            }
            return left.label.localeCompare(right.label);
        });
    const addOnGroups = normalizedAddOns.reduce<AddOnGroup[]>((groups, item) => {
        const groupId = slugifyKey(item.categoryLabel);
        const existingGroup = groups.find((group) => group.id === groupId);
        if (existingGroup) {
            existingGroup.items.push(item);
            if (item.priorityRank < existingGroup.highestPriorityRank) {
                existingGroup.highestPriorityRank = item.priorityRank;
                existingGroup.highestPriorityLabel = item.priorityLabel;
            }
            return groups;
        }
        groups.push({
            id: groupId,
            categoryLabel: item.categoryLabel,
            highestPriorityLabel: item.priorityLabel,
            highestPriorityRank: item.priorityRank,
            items: [item],
        });
        return groups;
    }, []).sort((left, right) => {
        if (left.highestPriorityRank !== right.highestPriorityRank) {
            return left.highestPriorityRank - right.highestPriorityRank;
        }
        return left.categoryLabel.localeCompare(right.categoryLabel);
    });

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={patientToken}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-10"
            >
                {/* Intelligence HUD Panels */}
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(320px,0.92fr)_minmax(0,1.35fr)] gap-6">

                    <div className="navavej-card p-8 md:p-10 relative bg-white group overflow-visible flex flex-col gap-8">
                        <div className="absolute top-0 left-0 h-2 w-full bg-navavej-teal/10 transition-all group-hover:bg-navavej-teal/20" />
                        <div className="flex flex-col items-center">
                            <ClinicalRiskGauge value={data.overall_risk_level} />
                            <div className="mt-6 flex flex-col items-center">
                                <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
                                    <div className="w-2 h-2 bg-navavej-teal rounded-full animate-ping" />
                                    <span className={cn("text-[9px] font-black uppercase tracking-widest", riskLevelClassName)}>{riskLevelLabel}</span>
                                    <div className="relative">
                                        <button
                                            ref={riskSummaryButtonRef}
                                            type="button"
                                            onClick={() => {
                                                setRiskToast((current) => {
                                                    if (current) return null;
                                                    return {
                                                        message: riskSummaryPrimaryText,
                                                        metadata: riskSummaryMetadataText,
                                                        key: Date.now(),
                                                    };
                                                });
                                            }}
                                            className="inline-flex items-center justify-center text-[9px] font-black uppercase tracking-[0.12em] px-2 py-1 rounded-md border border-navavej-border bg-white text-navavej-gray-med hover:text-navavej-teal hover:border-navavej-teal/40 transition-colors focus:outline-none"
                                            aria-label="Risk summary information"
                                        >
                                            Risk Summary
                                        </button>
                                        <AnimatePresence>
                                            {riskToast ? (
                                                <motion.div
                                                    role="status"
                                                    key={riskToast.key}
                                                    initial={{ opacity: 0, y: -6 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -6 }}
                                                    className="absolute left-1/2 top-full z-50 mt-3 w-[min(20rem,calc(100vw-4rem))] -translate-x-1/2 rounded-xl border border-navavej-teal/40 bg-white shadow-2xl p-4"
                                                >
                                                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-navavej-teal mb-1">Risk Summary</p>
                                                    <p className="text-xs font-medium text-navavej-gray-dark leading-relaxed">{riskToast.message}</p>
                                                    {riskToast.metadata ? (
                                                        <p className="text-[10px] font-bold text-navavej-gray-med mt-2">{riskToast.metadata}</p>
                                                    ) : null}
                                                </motion.div>
                                            ) : null}
                                        </AnimatePresence>
                                    </div>
                                </div>
                                <p className="max-w-sm text-[11px] text-navavej-gray-med font-medium text-center italic">Calculated based on current BMI, ASCVD scores and clinical signals.</p>
                                {isRiskFallback && (
                                    <span className="mt-3 text-[9px] font-black uppercase tracking-[0.12em] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                                        Fallback Risk Data
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="rounded-[24px] border border-navavej-border bg-navavej-gray-light/40 p-5">
                                <div className="flex items-center gap-2 text-navavej-teal">
                                    <Package className="w-4 h-4" />
                                    <span className="text-[9px] font-black uppercase tracking-[0.18em]">Strategy Assignment</span>
                                </div>
                                <p className="mt-3 text-3xl font-black tracking-tight text-navavej-gray-dark">{resolvedTier}</p>
                                <span className="mt-2 block text-[9px] font-bold uppercase tracking-[0.14em] text-navavej-gray-med">
                                    {data.confidence_tier ? `${data.confidence_tier} Tier` : "Confidence Tier Unavailable"}
                                </span>
                            </div>
                            <div className="rounded-[24px] border border-navavej-border bg-navavej-teal px-5 py-5 text-white">
                                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/70">Confidence Score</p>
                                <div className="mt-3 flex items-center gap-3">
                                    <div className="h-1.5 flex-1 rounded-full bg-white/20 overflow-hidden">
                                        <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} transition={{ duration: 1 }} className="h-full w-full rounded-full bg-white" />
                                    </div>
                                    <span className={cn(
                                        "shrink-0 rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]",
                                        confidenceColorClass
                                    )}>
                                        {confidencePercent === null ? "--%" : `${confidencePercent}%`}
                                    </span>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em]">
                                        <ShieldCheck className="w-4 h-4" /> AI Verified
                                    </span>
                                    <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em]">
                                        <CheckCircle2 className="w-4 h-4" /> Safety Log OK
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="navavej-card overflow-hidden rounded-[28px] border border-navavej-border shadow-xl bg-white">
                        <div className="p-8 md:p-10 xl:p-12 flex flex-col gap-6">
                            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(220px,280px)] xl:items-start">
                                <div className="min-w-0 space-y-4">
                                    <span className="text-[9px] font-black text-navavej-gray-med uppercase tracking-[0.24em]">Recommended Package</span>
                                    <PackageSealBadge tier={resolvedTier} />
                                    <div>
                                        <h4 className={cn("text-2xl font-black uppercase tracking-tight break-words leading-tight", privacyMode ? "text-navavej-red/70 font-mono" : "text-navavej-gray-dark")}>
                                            {packageNameDisplay}
                                        </h4>
                                        <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-navavej-gray-med break-all">
                                            Package Code · {privacyMode ? "—" : packageCodeDisplay}
                                        </p>
                                    </div>
                                </div>

                                <div className="rounded-[24px] border border-navavej-border bg-navavej-gray-light/60 px-6 py-5">
                                    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-navavej-gray-med">Program Value</p>
                                    <p className={cn("mt-2 text-3xl font-black italic break-words", privacyMode ? "text-navavej-red/70 font-mono" : "text-navavej-teal")}>
                                        {packagePriceDisplay}
                                    </p>
                                    <p className="mt-2 text-[10px] font-medium text-navavej-gray-med">Prepared for consultation open and close flow.</p>
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="rounded-[24px] border border-navavej-border bg-navavej-gray-light/40 p-5">
                                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-navavej-gray-med">Selected Tier</p>
                                    <p className="mt-2 text-base font-black text-navavej-gray-dark">{resolvedTier}</p>
                                </div>
                                <div className="rounded-[24px] border border-navavej-border bg-navavej-gray-light/40 p-5">
                                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-navavej-gray-med">Recommendation Source</p>
                                    <p className="mt-2 text-base font-black uppercase text-navavej-gray-dark">{data.recommendation_source || "Hybrid"}</p>
                                </div>
                                <div className="rounded-[24px] border border-navavej-border bg-navavej-gray-light/40 p-5">
                                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-navavej-gray-med">Summary State</p>
                                    <p className="mt-2 text-base font-black text-navavej-teal">{packageDetailsExpanded ? "Expanded" : "Collapsed"}</p>
                                </div>
                            </div>

                            <div className="rounded-[24px] border border-navavej-border bg-navavej-gray-light/50 p-6">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="max-w-2xl">
                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-navavej-teal">Package Detail</p>
                                        <p className="mt-1 text-sm font-medium text-navavej-gray-med">Reveal package rationale, pricing context, and selected tier summary.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setPackageDetailsExpanded((current) => !current)}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-navavej-border bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-navavej-gray-dark transition-colors hover:border-navavej-teal/40 hover:text-navavej-teal sm:w-auto"
                                    >
                                        <Eye className="w-4 h-4" />
                                        {packageDetailsExpanded ? "Hide Package Detail" : "View Package Detail"}
                                        <ChevronDown className={cn("w-4 h-4 transition-transform", packageDetailsExpanded ? "rotate-180" : "rotate-0")} />
                                    </button>
                                </div>

                                <AnimatePresence initial={false}>
                                    {packageDetailsExpanded ? (
                                        <motion.div
                                            key="package-detail"
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="mt-5 grid gap-4 md:grid-cols-3">
                                                <div className="rounded-2xl border border-navavej-border bg-white p-4">
                                                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-navavej-gray-med">Selected Tier</p>
                                                    <p className="mt-2 text-base font-black text-navavej-gray-dark">{resolvedTier}</p>
                                                </div>
                                                <div className="rounded-2xl border border-navavej-border bg-white p-4">
                                                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-navavej-gray-med">Package Value</p>
                                                    <p className="mt-2 text-base font-black text-navavej-gray-dark break-words">{packagePriceDisplay}</p>
                                                </div>
                                                <div className="rounded-2xl border border-navavej-border bg-white p-4">
                                                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-navavej-gray-med">Recommendation Source</p>
                                                    <p className="mt-2 text-base font-black text-navavej-gray-dark uppercase">{data.recommendation_source || "Hybrid"}</p>
                                                </div>
                                            </div>
                                            <div className="mt-4 rounded-2xl border border-navavej-border bg-white p-5">
                                                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-navavej-gray-med">AI Rationale</p>
                                                <p className="mt-3 text-sm font-medium leading-relaxed text-navavej-gray-dark">
                                                    {renderBoldText(packageSummaryRationale)}
                                                </p>
                                            </div>
                                        </motion.div>
                                    ) : null}
                                </AnimatePresence>
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
                            <div className="flex items-center justify-between gap-4 mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-navavej-teal/5 rounded-xl flex items-center justify-center">
                                        <Layers3 className="w-5 h-5 text-navavej-teal" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-navavej-gray-dark uppercase tracking-widest">Additional Clinical Screenings</h4>
                                        <p className="mt-1 text-[11px] font-medium text-navavej-gray-med">Single-column consultation view sorted by highest clinical urgency first.</p>
                                    </div>
                                </div>
                                {normalizedAddOns.length > 0 ? (
                                    <span className="rounded-full border border-navavej-border bg-navavej-gray-light px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-navavej-gray-med">
                                        {normalizedAddOns.length} Add-on{normalizedAddOns.length > 1 ? "s" : ""}
                                    </span>
                                ) : null}
                            </div>

                            <div className="flex flex-col gap-4 flex-1">
                                {addOnGroups.map((group) => {
                                    const isExpanded = expandedAddOnGroups[group.id] ?? true;
                                    return (
                                        <div key={group.id} className="rounded-[24px] border border-navavej-border bg-navavej-gray-light/50 overflow-hidden">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleAddOnGroup(group.id)}
                                                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-white/60"
                                            >
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-navavej-gray-med">Category Group</p>
                                                    <h5 className="mt-1 text-lg font-black uppercase tracking-tight text-navavej-gray-dark">{group.categoryLabel}</h5>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={cn(
                                                        "rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white shadow-sm",
                                                        priorityBadgeClass(group.highestPriorityLabel)
                                                    )}>
                                                        Highest Risk · {group.highestPriorityLabel}
                                                    </span>
                                                    <span className="rounded-full border border-navavej-border bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-navavej-gray-med">
                                                        {group.items.length} Item{group.items.length > 1 ? "s" : ""}
                                                    </span>
                                                    <ChevronDown className={cn("w-5 h-5 text-navavej-gray-med transition-transform", isExpanded ? "rotate-180" : "rotate-0")} />
                                                </div>
                                            </button>

                                            <AnimatePresence initial={false}>
                                                {isExpanded ? (
                                                    <motion.div
                                                        key={`${group.id}-items`}
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: "auto" }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="px-4 pb-4 space-y-3">
                                                            {group.items.map((item) => {
                                                                const isItemExpanded = !!expandedAddOnItems[item.itemKey];
                                                                return (
                                                                    <div key={item.itemKey} className="rounded-2xl border border-navavej-border bg-white shadow-sm">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleToggleAddOnItem(item.itemKey)}
                                                                            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                                                                        >
                                                                            <div className="flex items-start gap-4">
                                                                                <span className={cn(
                                                                                    "mt-1 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white shadow-sm",
                                                                                    priorityBadgeClass(item.priorityLabel)
                                                                                )}>
                                                                                    {item.priorityLabel}
                                                                                </span>
                                                                                <div>
                                                                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-navavej-gray-med">{item.item_code}</p>
                                                                                    <h6 className="mt-1 text-sm font-black uppercase tracking-tight text-navavej-gray-dark">{item.label}</h6>
                                                                                    <p className="mt-1 text-[11px] font-medium text-navavej-gray-med">{item.priceLabel}</p>
                                                                                </div>
                                                                            </div>
                                                                            <ChevronDown className={cn("w-5 h-5 text-navavej-gray-med transition-transform", isItemExpanded ? "rotate-180" : "rotate-0")} />
                                                                        </button>

                                                                        <AnimatePresence initial={false}>
                                                                            {isItemExpanded ? (
                                                                                <motion.div
                                                                                    key={`${item.itemKey}-detail`}
                                                                                    initial={{ opacity: 0, height: 0 }}
                                                                                    animate={{ opacity: 1, height: "auto" }}
                                                                                    exit={{ opacity: 0, height: 0 }}
                                                                                    className="overflow-hidden"
                                                                                >
                                                                                    <div className="border-t border-navavej-border px-5 py-4 bg-navavej-gray-light/50">
                                                                                        <div className="grid gap-4 md:grid-cols-2">
                                                                                            <div>
                                                                                                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-navavej-gray-med">AI Rationale</p>
                                                                                                <p className="mt-2 text-sm font-medium leading-relaxed text-navavej-gray-dark text-justify">
                                                                                                    {renderBoldText(item.rationale || "No rationale provided.")}
                                                                                                </p>
                                                                                            </div>
                                                                                            <div className="space-y-3">
                                                                                                <div>
                                                                                                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-navavej-gray-med">Supporting Metadata</p>
                                                                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                                                                        <span className="rounded-full border border-navavej-border bg-white px-2.5 py-1 text-[10px] font-bold text-navavej-gray-dark">Category · {item.categoryLabel}</span>
                                                                                                        <span className="rounded-full border border-navavej-border bg-white px-2.5 py-1 text-[10px] font-bold text-navavej-gray-dark">Product · {item.product_code || "N/A"}</span>
                                                                                                        <span className="rounded-full border border-navavej-border bg-white px-2.5 py-1 text-[10px] font-bold text-navavej-gray-dark">Price · {item.priceLabel}</span>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div>
                                                                                                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-navavej-gray-med">Triggered Signals</p>
                                                                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                                                                        {item.triggerSignals.length > 0 ? item.triggerSignals.map((signal, signalIndex) => (
                                                                                                            <span key={`${item.itemKey}-signal-${signalIndex}`} className="rounded-full bg-navavej-teal/10 px-2.5 py-1 text-[10px] font-bold text-navavej-teal">
                                                                                                                {signal}
                                                                                                            </span>
                                                                                                        )) : (
                                                                                                            <span className="text-[11px] font-medium text-navavej-gray-med">No trigger signals returned.</span>
                                                                                                        )}
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </motion.div>
                                                                            ) : null}
                                                                        </AnimatePresence>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </motion.div>
                                                ) : null}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}

                                {normalizedAddOns.length === 0 && (
                                    <div className="flex flex-1 flex-col items-center justify-center rounded-[24px] border border-dashed border-navavej-border py-12 text-center">
                                        <Sparkles className="w-8 h-8 text-navavej-teal/40 mb-3" />
                                        <p className="text-sm font-black uppercase tracking-[0.18em] text-navavej-gray-med">No clinical add-ons required</p>
                                        <p className="mt-2 text-[11px] font-medium text-navavej-gray-med">The recommended package covers the current consultation scope.</p>
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
                                            <div key={i} className="flex items-center justify-between gap-3 p-4 bg-white rounded-xl border border-navavej-border group hover:border-navavej-red/40 transition-colors shadow-sm">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-1.5 h-1.5 bg-navavej-red rounded-full shrink-0" />
                                                    <div className="min-w-0">
                                                        <h4 className={cn("text-[10px] font-black uppercase", privacyMode ? "text-navavej-red/70 font-mono" : "text-navavej-gray-dark")}>
                                                            {privacyMode ? "Masked Alert" : alert.label}
                                                        </h4>
                                                        <p className={cn("text-[9px] font-bold italic", privacyMode ? "text-navavej-red/70 font-mono" : "text-navavej-gray-med")}>
                                                            {privacyMode ? "Masked Clinical Details" : alert.sub}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-[8px] font-black text-navavej-red border border-navavej-red/20 px-2 py-1 rounded tracking-tighter shrink-0">
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
                            <div ref={actionPanelRef} className="bg-navavej-gray-light rounded-[24px] p-8 border border-navavej-border flex flex-col flex-1 shadow-inner">
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

                <div className="navavej-card overflow-hidden rounded-[28px] border border-navavej-border bg-white shadow-xl">
                    <div className="grid grid-cols-1 gap-6 p-10 md:grid-cols-[1fr_auto] md:items-center md:p-12">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                                <PackageSealBadge tier={resolvedTier} compact />
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-navavej-teal">Consultation Summary</p>
                                    <h4 className={cn("text-2xl font-black uppercase tracking-tight", privacyMode ? "text-navavej-red/70 font-mono" : "text-navavej-gray-dark")}>
                                        {packageNameDisplay}
                                    </h4>
                                </div>
                            </div>
                            <p className="text-sm font-medium leading-relaxed text-navavej-gray-med">Repeat the package recommendation at the bottom of the consultation flow so staff can close the discussion with the same tier and value context.</p>
                        </div>
                        <div className="flex flex-col items-start gap-3 md:items-end">
                            <span className={cn("text-3xl font-black italic", privacyMode ? "text-navavej-red/70 font-mono" : "text-navavej-teal")}>
                                {packagePriceDisplay}
                            </span>
                            <button
                                type="button"
                                onClick={scrollToDecisionPanel}
                                className="navavej-button-primary inline-flex items-center gap-3 px-6 py-4 shadow-lg"
                            >
                                <span className="text-xs font-black uppercase tracking-[0.16em]">Proceed with Recommendation</span>
                                <ArrowRight className="w-5 h-5" />
                            </button>
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
