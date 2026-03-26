"use client";

import React from "react";

import { CLINICAL_DICTIONARY } from "@/shared/clinical-dictionary";
import { cn } from "@/shared/utils";
import type { AnnotatedReasoningLine } from "@/types/recommendation";

export type LineSentiment = "risk" | "reassuring" | "neutral" | "informational";
export type HighlightSeverity = "critical" | "caution" | "moderate" | "neutral";

export type { AnnotatedReasoningLine };

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
  htn: "Hypertension",
};

export const QUOTE_CLEANUP_REGEX = /['"''""]/g;
// Narrowed to blood pressure composite values (e.g. 135/87 mmHg) and percentages only.
// Generic concentration values (mg/dL, mL/min, kg/m2, etc.) are too broad to auto-highlight
// and should come from the LLM's per-line highlight_terms instead.
export const UNIT_HIGHLIGHT_REGEX = /\b(\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?\s*(?:mmHg|mm\sHg)|\d+(?:\.\d+)?%)\b/gi;
export const HIGHLIGHT_SEVERITY_REGEX = /\s*\((red|orange|yellow)\)\s*$/i;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Unified list of human-readable clinical terms to highlight in prose text (case-insensitive).
// Includes the former HIGHLIGHT_PHRASES and all MEANINGFUL_DISPLAY_TERMS so that
// both LLM-written prose and dictionary-substituted identifiers are covered by a single pass.
// Sorted longest-first so longer, more specific phrases win over their substrings in the
// deduplication step (e.g. "Atherogenic Dyslipidemia" wins over "Dyslipidemia").
const CLINICAL_TERMS: string[] = [
  // Hypertension
  "Stage 2 Hypertension",
  "Stage 1 Hypertension",
  "Hypertensive Crisis",
  "Active Hypertension",
  "Worsening BP Trend",
  "Stage 1 HTN",
  // Dyslipidemia
  "Atherogenic Dyslipidemia",
  "Active Dyslipidemia",
  "Dyslipidemia",
  "Low HDL",
  "High LDL",
  "High Triglycerides",
  // Metabolic / endocrine
  "Metabolic Syndrome",
  "Prediabetes Confirmed",
  "Prediabetes",
  "Diabetes (Confirmed)",
  "Diabetes",
  "Hyperuricemia",
  // Cardiovascular risk
  "Very High ASCVD Risk",
  "Intermediate ASCVD Risk",
  "Family History of Premature CAD",
  // Kidney disease
  "Rapid CKD Progression",
  "CKD Stage G2",
  "Stage G1 (Normal)",
  "Stage G2 (Mild)",
  "Stage G3a (Mild-Mod)",
  "Stage G3b (Mod-Severe)",
  "Stage G4 (Severe)",
  "Stage G5 (Failure)",
  // Liver
  "Significant Liver Enzyme Elevation",
  "Fibroscan Indicated",
  // BMI
  "Obese (Asian)",
  "Overweight (Asian)",
  // Screenings and procedures
  "Eligible for Low-dose CT Lung Screening",
  "CT Coronary Artery Calcium Scoring",
  "Coronary Calcium Scoring",
  "Exercise Stress Test",
  "Kidney Disease Screening",
  "Carotid Ultrasound",
  "Colonoscopy Gap",
  "Colonoscopy",
  "Mammogram Gap",
  "Mammogram",
  "DEXA Scan Gap",
  "DEXA Scan",
  "Shingles Vaccine Gap",
  "Shingles Vaccine",
  "Pneumococcal Vaccine Gap",
  "Influenza Vaccine",
  "Flu Vaccine Gap",
  "Flu Vaccine",
  // Package tiers
  "Premium",
  "Advanced",
].sort((a, b) => b.length - a.length);

// Values from CLINICAL_DICTIONARY that should be highlighted when a matching
// snake_case key is substituted into the text.
const MEANINGFUL_DISPLAY_TERMS = new Set<string>([
  // Hypertension
  "Stage 2 Hypertension",
  "Stage 1 HTN",
  "Active Hypertension",
  "Hypertensive Crisis",
  "Worsening BP Trend",
  // Metabolic
  "Prediabetes Confirmed",
  "Diabetes (Confirmed)",
  "Active Dyslipidemia",
  "Hyperuricemia",
  // Cardiovascular risk
  "Very High ASCVD Risk",
  "Intermediate ASCVD Risk",
  "Family History of Premature CAD",
  // Kidney
  "Rapid CKD Progression",
  "Stage G1 (Normal)",
  "Stage G2 (Mild)",
  "Stage G3a (Mild-Mod)",
  "Stage G3b (Mod-Severe)",
  "Stage G4 (Severe)",
  "Stage G5 (Failure)",
  // Liver
  "Significant Liver Enzyme Elevation",
  "Fibroscan Indicated",
  // Screening gaps (shown when snake_case identifiers appear in consultation text)
  "Colonoscopy Gap",
  "Mammogram Gap",
  "DEXA Scan Gap",
  "Shingles Vaccine Gap",
  "Pneumococcal Vaccine Gap",
  "Flu Vaccine Gap",
  "Eligible for Low-dose CT Lung Screening",
  // BMI
  "Obese (Asian)",
  "Overweight (Asian)",
  // Package tiers
  "Premium",
  "Advanced",
]);

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

// Suppress unused-variable warning — normalizeClinicalToken is kept for potential callers.
void normalizeClinicalToken;

export const splitConsultationSentences = (value: string) => {
  const sentences = value
    .split(/\.(?!\d)(?=\s+[A-Z0-9]|$)|(?:\n|^)\s*-\s+/g)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 2);

  const combined: string[] = [];
  for (let index = 0; index < sentences.length; index += 1) {
    const current = sentences[index];
    const previous = combined[combined.length - 1];

    if (
      previous
      && (
        /^\s*[a-z0-9]/.test(current)
        || /\s(e\.g|i\.e|mg|dl|ml|dr|vs)$/i.test(previous)
        || previous.endsWith("(")
      )
    ) {
      combined[combined.length - 1] = `${previous}${previous.endsWith(".") ? "" : "."} ${current}`;
    } else {
      combined.push(current);
    }
  }

  return combined.map((sentence) => (
    sentence.endsWith(".") || sentence.endsWith("!") || sentence.endsWith("?")
      ? sentence
      : `${sentence}.`
  ));
};

export const parseHighlightSeverity = (highlight: string) => {
  const match = highlight.match(HIGHLIGHT_SEVERITY_REGEX);
  const normalized = match?.[1].toLowerCase();
  const severity: HighlightSeverity =
    normalized === "red"
      ? "critical"
      : normalized === "orange"
        ? "caution"
        : normalized === "yellow"
          ? "moderate"
          : "neutral";

  const label = match ? highlight.replace(match[0], "").trim() : highlight.trim();

  const styles =
    severity === "critical"
      ? {
        container: "border-navavej-red/15 bg-navavej-red/[0.03]",
        dot: "bg-navavej-red",
        text: "text-navavej-red/90",
      }
      : severity === "caution"
        ? {
          container: "border-orange-300/40 bg-orange-50/60",
          dot: "bg-orange-500",
          text: "text-orange-700",
        }
        : severity === "moderate"
          ? {
            container: "border-amber-300/40 bg-amber-50/60",
            dot: "bg-amber-500",
            text: "text-amber-800",
          }
          : {
            container: "border-navavej-border/60 bg-white",
            dot: "bg-navavej-teal",
            text: "text-navavej-gray-dark",
          };

  return { label, severity, styles };
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
   * 0 = LLM-supplied term (highest)
   * 1 = unit regex (BP composite / percentage)
   * 2 = CLINICAL_TERMS list
   */
  priority: number;
}

/**
 * Collect every potential highlight span in `text`.
 * Returns unfiltered spans; call `deduplicateSpans` to resolve overlaps.
 */
export const collectHighlightSpans = (
  text: string,
  highlightTerms: string[],
  scope: "clinical_reasoning" | "policy_reasoning" | undefined,
): HighlightSpan[] => {
  const spans: HighlightSpan[] = [];

  // Step 1 — LLM-supplied terms (case-insensitive, priority 0).
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

  // Step 2 — BP composites and percentages (skip for policy_reasoning).
  if (scope !== "policy_reasoning") {
    for (const match of text.matchAll(new RegExp(UNIT_HIGHLIGHT_REGEX.source, "gi"))) {
      spans.push({
        start: match.index,
        end: match.index + match[0].length,
        display: match[0],
        priority: 1,
      });
    }
  }

  // Step 3 — Curated clinical terms (priority 2; sorted longest-first so longer
  // phrases are preferred over their substrings during deduplication).
  for (const term of CLINICAL_TERMS) {
    for (const match of text.matchAll(new RegExp(escapeRegExp(term), "gi"))) {
      spans.push({
        start: match.index,
        end: match.index + match[0].length,
        display: match[0],
        priority: 2,
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
 *  2. Lower priority value (LLM > unit > clinical term)
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
  scope: "clinical_reasoning" | "policy_reasoning" | undefined = undefined,
) => {
  if (!text) return null;

  if (Array.isArray(text)) {
    return text.map((item, index) => (
      <span key={index}>
        {renderHighlightedText(item, sentiment, [], scope)}
        {index < text.length - 1 ? " " : ""}
      </span>
    ));
  }

  let content = typeof text === "string" ? text : String(text);

  // Pre-processing A — strip curly/smart quotes.
  content = content.replace(QUOTE_CLEANUP_REGEX, "");

  // Pre-processing B — extract any **...**-marked terms from LLM prose.
  // These are treated as additional explicit highlight_terms; the markers are
  // stripped so the text is clean for the span-based pass below.
  const extractedTerms: string[] = [];
  content = content.replace(/\*\*(.+?)\*\*/g, (_, inner: string) => {
    extractedTerms.push(inner.trim());
    return inner;
  });
  const allExplicitTerms = [...highlightTerms, ...extractedTerms];

  // Pre-processing C — dictionary substitution for snake_case identifiers.
  // Must happen before span collection so the readable display values are
  // present in the text and can be matched by CLINICAL_TERMS.
  const dictKeys = Object.keys(CLINICAL_DICTIONARY)
    .filter((key) => key.includes("_"))
    .sort((a, b) => b.length - a.length);
  for (const key of dictKeys) {
    const display = CLINICAL_DICTIONARY[key];
    if (content.includes(key) && MEANINGFUL_DISPLAY_TERMS.has(display)) {
      content = content.replace(new RegExp(`\\b${escapeRegExp(key)}\\b`, "g"), display);
    }
  }

  // Collect and deduplicate highlight spans.
  const spans = deduplicateSpans(collectHighlightSpans(content, allExplicitTerms, scope));

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
