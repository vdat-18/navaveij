"use client";

import { PreRunnedRecommendation } from "@/types/leads";
import { renderHighlightedText, severityToStyles } from "@/shared/recommendationTextFormatting";
import { RiskBadge } from "@/components/leads/LeadBadges";

interface ReadOnlyRecommendationViewProps {
  data: PreRunnedRecommendation;
}

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export function ReadOnlyRecommendationView({ data }: ReadOnlyRecommendationViewProps) {
  const recommendation = data.recommendation;
  const communicationScript = recommendation.communication_script;
  const priorityAddOns = communicationScript?.priority_add_ons ?? [];
  const topFindings = communicationScript?.top_findings ?? [];
  const nextActions = communicationScript?.next_actions ?? [];
  const reasoningLines = recommendation.reasoning_trace_annotated ?? [];
  const criticalSignals = Array.isArray(recommendation.patient_high_alert)
    ? recommendation.patient_high_alert
    : recommendation.patient_high_alert?.critical_signals ?? [];
  const packageName = recommendation.resolved_package?.name || recommendation.resolved_package?.package_name || recommendation.ai_recommended_tier;
  const packagePrice = recommendation.resolved_package?.price_thb;
  const confidencePct = typeof recommendation.confidence_score === "number"
    ? Math.round(recommendation.confidence_score * 100)
    : null;

  const getSentimentBorder = (sentiment: string) => {
    if (sentiment === "risk") return "border-l-red-400";
    if (sentiment === "reassuring") return "border-l-green-400";
    if (sentiment === "informational") return "border-l-sky-400";
    return "border-l-gray-300";
  };

  return (
    <div className="space-y-4 rounded-2xl border border-navavej-border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 rounded-2xl border border-navavej-teal/10 bg-navavej-teal/[0.03] p-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-navavej-teal">Pre-run recommendation</p>
          <h3 className="text-xl font-black text-navavej-navy">{data.patient_name}</h3>
          <p className="text-sm text-navavej-gray-dark">{data.scenario_label}</p>
          <p className="text-sm leading-6 text-navavej-gray-dark">{data.ai_lead_summary}</p>
        </div>
        <div className="min-w-[240px]">
          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
            <RiskBadge riskLevel={recommendation.overall_risk_level} />
            <span className="inline-flex items-center rounded-full border border-navavej-border bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-navavej-gray-dark">
              {recommendation.ai_recommended_tier}
            </span>
            {typeof confidencePct === "number" ? (
              <span className="inline-flex items-center rounded-full border border-navavej-border bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-navavej-gray-dark">
                {confidencePct}% confidence
              </span>
            ) : null}
          </div>

          <div className="mt-3 rounded-xl border border-navavej-border bg-white p-3">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-navavej-gray">Generated</p>
            <p className="mt-1 text-sm font-semibold text-navavej-navy">{formatDateTime(data.generated_at)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-navavej-border bg-white p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-navavej-teal">Recommendation summary</p>
          <div className="mt-3 space-y-3 text-sm leading-6 text-navavej-gray-dark">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-navavej-gray">Headline</p>
              <p className="mt-1 font-semibold text-navavej-navy">
                {renderHighlightedText(
                  communicationScript?.summary_headline ?? recommendation.overall_risk_level,
                  "informational",
                  communicationScript?.summary_headline_highlights ?? []
                )}
              </p>
            </div>

            {topFindings.length > 0 ? (
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-navavej-gray">Key Findings</p>
                <div className="mt-2 space-y-2">
                  {topFindings.map((finding, index) => (
                    <div key={`${finding.text}-${index}`} className="rounded-xl border border-navavej-border bg-navavej-background p-3">
                      {renderHighlightedText(finding.text, "informational", finding.highlight_terms ?? [])}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-navavej-gray">Program justification</p>
              <p className="mt-1">
                {renderHighlightedText(
                  communicationScript?.program_justification ?? recommendation.reasoning_trace,
                  "neutral",
                  communicationScript?.program_justification_highlights ?? []
                )}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-navavej-gray">Reasoning trace</p>
              <div className="mt-2 space-y-2">
                {reasoningLines.length > 0 ? reasoningLines.map((line, index) => (
                  <div
                    key={`${line.text}-${index}`}
                    className={`rounded-xl border border-navavej-border border-l-4 bg-navavej-background p-3 text-sm text-navavej-gray-dark ${getSentimentBorder(line.sentiment)}`}
                  >
                    {renderHighlightedText(line.text, line.sentiment, line.highlight_terms ?? [])}
                  </div>
                )) : (
                  <div className="rounded-xl border border-navavej-border bg-navavej-background p-3 text-sm text-navavej-gray-dark">
                    {recommendation.reasoning_trace}
                  </div>
                )}
              </div>
            </div>

            {nextActions.length > 0 ? (
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-navavej-gray">Suggested Next Steps</p>
                <div className="mt-2 space-y-2">
                  {nextActions.map((action, index) => (
                    <div key={`${action.text}-${index}`} className="rounded-xl border border-navavej-border bg-navavej-background p-3">
                      {renderHighlightedText(action.text, "informational", action.highlight_terms ?? [])}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-navavej-border bg-white p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-navavej-teal">Resolved package</p>
            <p className="mt-2 text-lg font-black text-navavej-navy">{packageName}</p>
            {typeof packagePrice === "number" ? (
              <p className="mt-1 text-sm font-semibold text-navavej-gray-dark">฿{packagePrice.toLocaleString()}</p>
            ) : null}
            {recommendation.tier_deviation_justification ? (
              <p className="mt-3 text-sm leading-6 text-navavej-gray-dark">{recommendation.tier_deviation_justification}</p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-navavej-border bg-white p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-navavej-teal">Priority add-ons</p>
            <div className="mt-3 space-y-2">
              {priorityAddOns.length > 0 ? priorityAddOns.map((item, index) => {
                const styles = severityToStyles(item.severity ?? "neutral");
                return (
                  <div key={`${item.label}-${index}`} className={`flex items-center justify-between rounded-xl border px-3 py-2 ${styles.container}`}>
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${styles.dot}`} />
                      <span className={`text-sm font-semibold ${styles.text}`}>{item.label}</span>
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-[0.14em] text-navavej-gray">{item.severity ?? "neutral"}</span>
                  </div>
                );
              }) : (
                <p className="text-sm text-navavej-gray-dark">No priority add-ons were flagged for this pre-run patient.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-navavej-border bg-white p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-navavej-teal">Risk summary</p>
            <p className="mt-2 text-sm leading-6 text-navavej-gray-dark">{recommendation.risk_summary?.description ?? "No risk summary available."}</p>
            {criticalSignals.length > 0 ? (
              <div className="mt-3 space-y-2">
                {criticalSignals.map((signal, index) => (
                  <div key={`${signal.signal_id ?? signal.label}-${index}`} className="rounded-xl border border-navavej-red/20 bg-navavej-red/[0.03] p-3">
                    <p className="text-sm font-black text-navavej-red">{signal.label}</p>
                    {signal.clinical_note ? <p className="mt-1 text-sm text-navavej-gray-dark">{signal.clinical_note}</p> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
