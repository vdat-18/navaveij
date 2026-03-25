import React, { useId } from "react";
import { cn } from "@/shared/utils";

interface PackageSealBadgeProps {
  tier?: string | null;
  className?: string;
  compact?: boolean;
}

type SealVariant = {
  label: "Gold" | "Platinum" | "Diamond";
  tierLabel: string;
  wrapperClassName: string;
  emblemClassName: string;
  accentClassName: string;
};

const resolveSealVariant = (tier?: string | null): SealVariant => {
  const normalizedTier = (tier || "Standard").trim().toLowerCase();

  if (normalizedTier === "premium") {
    return {
      label: "Diamond",
      tierLabel: "Premium Tier",
      wrapperClassName: "border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-sky-100 text-cyan-800 shadow-cyan-200/70",
      emblemClassName: "from-cyan-400 via-sky-300 to-white",
      accentClassName: "border-cyan-300/70 bg-cyan-500/10 text-cyan-700",
    };
  }

  if (normalizedTier === "advanced") {
    return {
      label: "Platinum",
      tierLabel: "Advanced Tier",
      wrapperClassName: "border-slate-200 bg-gradient-to-br from-slate-100 via-white to-blue-50 text-slate-800 shadow-slate-200/80",
      emblemClassName: "from-slate-300 via-blue-100 to-white",
      accentClassName: "border-slate-300/80 bg-slate-500/10 text-slate-700",
    };
  }

  return {
    label: "Gold",
    tierLabel: "Standard Tier",
    wrapperClassName: "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-yellow-100 text-amber-900 shadow-amber-200/80",
    emblemClassName: "from-amber-300 via-yellow-200 to-white",
    accentClassName: "border-amber-300/80 bg-amber-500/10 text-amber-700",
  };
};

export function PackageSealBadge({ tier, className, compact = false }: PackageSealBadgeProps) {
  const instanceId = useId();
  const variant = resolveSealVariant(tier);

  return (
    <div
      data-testid="package-seal-badge"
      className={cn(
        "inline-flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg",
        variant.wrapperClassName,
        compact ? "px-3 py-2" : "px-4 py-3",
        className
      )}
    >
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-br shadow-inner",
          variant.emblemClassName,
          compact ? "h-12 w-12" : "h-16 w-16"
        )}
      >
        <svg
          viewBox="0 0 64 64"
          className={cn(compact ? "h-8 w-8" : "h-10 w-10")}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`seal-gradient-${instanceId}`} x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.2)" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="24" r="16" fill={`url(#seal-gradient-${instanceId})`} stroke="currentColor" strokeWidth="2.5" />
          <path d="M24 39l8-6 8 6-2 15-6-4-6 4-2-15z" fill="currentColor" opacity="0.18" />
          <path d="M32 15l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5-4.7-4.6 6.5-.9L32 15z" fill="currentColor" opacity="0.85" />
        </svg>
      </div>

      <div className="flex flex-col">
        <span className="text-[10px] font-black uppercase tracking-[0.24em] opacity-70">{variant.label} Seal</span>
        <span className={cn(
          "mt-1 inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em]",
          variant.accentClassName
        )}>
          {variant.tierLabel}
        </span>
      </div>
    </div>
  );
}
