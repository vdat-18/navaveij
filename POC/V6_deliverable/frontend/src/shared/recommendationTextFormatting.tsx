"use client";

import React from "react";

import { cn } from "@/shared/utils";
import type { AnnotatedReasoningLine, HighlightSeverity } from "@/types/recommendation";

export type LineSentiment = "risk" | "reassuring" | "neutral" | "informational";
export type { HighlightSeverity, AnnotatedReasoningLine };

export const QUOTE_CLEANUP_REGEX = /['"''""]/g;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ---------------------------------------------------------------------------
// Severity → CSS mapping (presentational — stays in FE)
// ---------------------------------------------------------------------------

/**
 * Map a severity string from the API to Tailwind CSS classes for add-on chips.
 * String parsing (e.g. "Label (Red)") has moved to the backend; this function
 * only handles the already-parsed severity value.
 */
export const severityToStyles = (severity: HighlightSeverity) => {
  switch (severity) {
    case "critical":
      return {
        container: "border-navavej-red/15 bg-navavej-red/[0.03]",
        dot: "bg-navavej-red",
        text: "text-navavej-red/90",
      };
    case "caution":
      return {
        container: "border-orange-300/40 bg-orange-50/60",
        dot: "bg-orange-500",
        text: "text-orange-700",
      };
    case "moderate":
      return {
        container: "border-amber-300/40 bg-amber-50/60",
        dot: "bg-amber-500",
        text: "text-amber-800",
      };
    default:
      return {
        container: "border-navavej-border/60 bg-white",
        dot: "bg-navavej-teal",
        text: "text-navavej-gray-dark",
      };
  }
};

// ---------------------------------------------------------------------------
// Span-based highlight renderer
// ---------------------------------------------------------------------------

export interface HighlightSpan {
  start: number;
  end: number;
  /** Actual text slice that will appear inside the chip. */
  display: string;
  /**
   * Source priority — lower value wins when spans overlap.
   * 0 = explicitly supplied term (highest)
   */
  priority: number;
}

/**
 * Collect every potential highlight span in `text` from the provided terms.
 * Returns unfiltered spans; call `deduplicateSpans` to resolve overlaps.
 *
 * All highlight rules now live in the backend — the FE only applies the
 * `highlight_terms` array supplied by the API.
 */
export const collectHighlightSpans = (
  text: string,
  highlightTerms: string[],
): HighlightSpan[] => {
  const spans: HighlightSpan[] = [];

  const uniqueTerms = Array.from(
    new Set(highlightTerms.map((t) => t.trim()).filter(Boolean)),
  );
  for (const term of uniqueTerms) {
    for (const match of text.matchAll(new RegExp(escapeRegExp(term), "gi"))) {
      spans.push({
        start: match.index,
        end: match.index + match[0].length,
        display: match[0],
        priority: 0,
      });
    }
  }

  return spans;
};

/**
 * Given a list of potentially overlapping spans, return a non-overlapping
 * subset ordered by start position.
 *
 * Conflict resolution (earlier in the sort wins):
 *  1. Earlier start position
 *  2. Lower priority value
 *  3. Longer match (more specific phrase wins over its substring)
 */
export const deduplicateSpans = (spans: HighlightSpan[]): HighlightSpan[] => {
  spans.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return (b.end - b.start) - (a.end - a.start); // longer first
  });

  const accepted: HighlightSpan[] = [];
  let lastEnd = 0;
  for (const span of spans) {
    if (span.start >= lastEnd) {
      accepted.push(span);
      lastEnd = span.end;
    }
  }
  return accepted;
};

export const renderHighlightedText = (
  text: string | string[] | null | undefined,
  sentiment?: LineSentiment,
  highlightTerms: string[] = [],
) => {
  if (!text) return null;

  if (Array.isArray(text)) {
    return text.map((item, index) => (
      <span key={index}>
        {renderHighlightedText(item, sentiment, [])}
        {index < text.length - 1 ? " " : ""}
      </span>
    ));
  }

  let content = typeof text === "string" ? text : String(text);

  // Strip curly/smart quotes.
  content = content.replace(QUOTE_CLEANUP_REGEX, "");

  // Strip markdown bold markers (safety net — backend should already strip).
  content = content.replace(/\*\*(.+?)\*\*/g, "$1");

  // Collect and deduplicate highlight spans from API-supplied terms only.
  const spans = deduplicateSpans(collectHighlightSpans(content, highlightTerms));

  // Chip colour classes driven by the line's sentiment.
  const textColorClass =
    sentiment === "risk"
      ? "text-navavej-red"
      : sentiment === "reassuring"
        ? "text-emerald-700"
        : sentiment === "informational"
          ? "text-sky-700"
          : "text-navavej-teal";
  const bgColorClass =
    sentiment === "risk"
      ? "bg-navavej-red/10 border-navavej-red/20"
      : sentiment === "reassuring"
        ? "bg-emerald-50 border-emerald-100"
        : sentiment === "informational"
          ? "bg-sky-50 border-sky-100"
          : "bg-navavej-teal/10 border-navavej-teal/20";

  // Build React nodes: interleave plain-text spans with highlight chips.
  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  for (const span of spans) {
    if (cursor < span.start) {
      nodes.push(
        <span key={`t-${cursor}`} className="align-baseline">
          {content.slice(cursor, span.start)}
        </span>,
      );
    }

    const inner = span.display;
    if (inner.trim().endsWith(":")) {
      // Section label (e.g. "CLINICAL FINDINGS:") — uppercase header style.
      nodes.push(
        <strong
          key={`h-${span.start}`}
          className={cn("font-black tracking-tight align-baseline uppercase text-[11px]", textColorClass)}
        >
          {inner}
        </strong>,
      );
    } else {
      nodes.push(
        <strong
          key={`h-${span.start}`}
          className={cn(
            "font-black px-1.5 py-0.5 rounded-md border inline-flex items-center shadow-[0_1px_2px_rgba(0,0,0,0.05)] whitespace-nowrap leading-none align-baseline",
            textColorClass,
            bgColorClass,
          )}
        >
          {inner}
        </strong>,
      );
    }

    cursor = span.end;
  }

  if (cursor < content.length) {
    nodes.push(
      <span key={`t-${cursor}`} className="align-baseline">
        {content.slice(cursor)}
      </span>,
    );
  }

  return nodes;
};
