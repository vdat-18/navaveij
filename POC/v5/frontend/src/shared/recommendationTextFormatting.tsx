"use client";

import React from "react";

import { CLINICAL_DICTIONARY } from "@/shared/clinical-dictionary";
import { cn } from "@/shared/utils";

export type LineSentiment = "good" | "bad" | "neutral";
export type HighlightSeverity = "critical" | "caution" | "moderate" | "neutral";

export interface AnnotatedReasoningLine {
  text: string;
  sentiment: LineSentiment;
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
  htn: "Hypertension",
};

export const QUOTE_CLEANUP_REGEX = /['"‘’“”]/g;
export const UNIT_HIGHLIGHT_REGEX = /\b(\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?\s*(?:mg\/dL|mmol\/L|mmHg|mm\sHg|kg\/m²|kg\/m2|mL\/min|years|days|weeks|months|%))\b/gi;
export const SNAKE_CASE_CLINICAL_TOKEN_REGEX = /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g;
export const BOLD_MARKER_REGEX = /(\*\*.*?\*\*)/g;
export const HIGHLIGHT_SEVERITY_REGEX = /\s*\((red|orange|yellow)\)\s*$/i;

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

export const renderHighlightedText = (
  text: string | string[] | null | undefined,
  sentiment?: LineSentiment,
) => {
  if (!text) return null;

  if (Array.isArray(text)) {
    return text.map((item, index) => (
      <span key={index}>
        {renderHighlightedText(item, sentiment)}
        {index < text.length - 1 ? " " : ""}
      </span>
    ));
  }

  let content = typeof text === "string" ? text : String(text);

  content = content.replace(QUOTE_CLEANUP_REGEX, "");
  content = content.replace(UNIT_HIGHLIGHT_REGEX, (match) => `**${match}**`);

  const dictKeys = Object.keys(CLINICAL_DICTIONARY).sort((a, b) => b.length - a.length);
  dictKeys.forEach((key) => {
    const regex = new RegExp(`\\b${key}\\b`, "g");
    if (content.includes(key)) {
      content = content.replace(regex, `**${CLINICAL_DICTIONARY[key]}**`);
    }
  });

  content = content.replace(SNAKE_CASE_CLINICAL_TOKEN_REGEX, (token) => `**${normalizeClinicalToken(token)}**`);
  content = content.replace(/\*{3,}/g, "**");
  content = content.replace(/\*\*\s*\*\*/g, "");
  content = content.replace(/\*+([^*]+):\*+/g, "**$1:**");

  const boldMarkerCount = (content.match(/\*\*/g) || []).length;
  if (boldMarkerCount % 2 !== 0) {
    content = content.replace(/\*\*/g, "");
  }

  const textColorClass = sentiment === "bad" ? "text-navavej-red" : sentiment === "good" ? "text-emerald-700" : "text-navavej-teal";
  const bgColorClass = sentiment === "bad" ? "bg-navavej-red/10 border-navavej-red/20" : sentiment === "good" ? "bg-emerald-50 border-emerald-100" : "bg-navavej-teal/10 border-navavej-teal/20";

  return content.split(BOLD_MARKER_REGEX).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const inner = part.slice(2, -2);
      if (inner.trim().endsWith(":")) {
        return (
          <strong key={index} className={cn("font-black tracking-tight align-baseline uppercase text-[11px]", textColorClass)}>
            {inner}
          </strong>
        );
      }

      return (
        <strong
          key={index}
          className={cn(
            "font-black px-1.5 py-0.5 rounded-md border inline-flex items-center shadow-[0_1px_2px_rgba(0,0,0,0.05)] whitespace-nowrap leading-none align-baseline",
            textColorClass,
            bgColorClass,
          )}
        >
          {inner}
        </strong>
      );
    }

    return <span key={index} className="align-baseline">{part}</span>;
  });
};
