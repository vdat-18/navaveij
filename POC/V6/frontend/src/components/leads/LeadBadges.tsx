import type { LeadStatus } from "@/types/leads";

import { getRiskStyles, STATUS_STYLES } from "@/components/leads/leadVisualMaps";

const basePill = "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em]";

export function StatusBadge({ status, className = "" }: { status: LeadStatus; className?: string }) {
  const styles = STATUS_STYLES[status];
  return <span className={`${basePill} ${styles.badge} ${className}`}>{status}</span>;
}

export function RiskBadge({ riskLevel, className = "" }: { riskLevel?: string | null; className?: string }) {
  const styles = getRiskStyles(riskLevel);
  return (
    <span className={`${basePill} ${styles.badge} ${className}`}>
      {riskLevel || "Unknown"}
    </span>
  );
}

export function RiskDot({ riskLevel, className = "" }: { riskLevel?: string | null; className?: string }) {
  const styles = getRiskStyles(riskLevel);
  return <span className={`h-2.5 w-2.5 rounded-full ${styles.dot} ${className}`} aria-hidden="true" />;
}

export function CountBadge({
  count,
  status,
  className = "",
}: {
  count: number;
  status?: LeadStatus;
  className?: string;
}) {
  const tint = status ? STATUS_STYLES[status].badge : "bg-navavej-background text-navavej-gray-dark border-navavej-border";
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${tint} ${className}`}>
      {count}
    </span>
  );
}

