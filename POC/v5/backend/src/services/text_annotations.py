from __future__ import annotations

import re
from typing import Any


BAD_KEYWORDS = [
    "risk",
    "high",
    "critical",
    "abnormal",
    "failure",
    "warning",
    "elevated",
    "low",
    "decreased",
    "positive history",
    "presence of",
    "overdue",
    "gap",
    "urgent",
    "uncontrolled",
]

GOOD_KEYWORDS = [
    "normal",
    "stable",
    "good",
    "no history",
    "negative",
    "negative family",
    "compliant",
    "controlled",
    "within limits",
    "non-smoker",
    "clear",
]

# Curated list of human-readable clinical phrases to match in text.
# Sorted longest-first so more specific phrases win over their substrings.
CLINICAL_PHRASES: list[str] = sorted(
    [
        # Hypertension
        "Stage 2 Hypertension",
        "Stage 1 Hypertension",
        "Hypertensive Crisis",
        "Active Hypertension",
        "Worsening BP Trend",
        "Stage 1 HTN",
        # Dyslipidemia
        "Atherogenic Dyslipidemia",
        "Active Dyslipidemia",
        "Dyslipidemia",
        "Low HDL",
        "High LDL",
        "High Triglycerides",
        # Metabolic / endocrine
        "Metabolic Syndrome",
        "Prediabetes Confirmed",
        "Prediabetes",
        "Diabetes (Confirmed)",
        "Diabetes",
        "Hyperuricemia",
        # Cardiovascular risk
        "Very High ASCVD Risk",
        "Intermediate ASCVD Risk",
        "Family History of Premature CAD",
        # Kidney disease
        "Rapid CKD Progression",
        "CKD Stage G2",
        "Stage G1 (Normal)",
        "Stage G2 (Mild)",
        "Stage G3a (Mild-Mod)",
        "Stage G3b (Mod-Severe)",
        "Stage G4 (Severe)",
        "Stage G5 (Failure)",
        # Liver
        "Significant Liver Enzyme Elevation",
        "Fibroscan Indicated",
        # BMI
        "Obese (Asian)",
        "Overweight (Asian)",
        # Screenings and procedures
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
        # Package tiers
        "Premium",
        "Advanced",
    ],
    key=len,
    reverse=True,
)

# Matches BP composites (e.g. 135/87 mmHg, 135 / 87 mm Hg) and percentages.
# Does NOT match plain concentration values (mg/dL, mL/min, etc.) — those should
# only appear via the LLM's explicit highlight_terms.
_BP_UNIT_REGEX = re.compile(
    r"\b(\d+(?:\.\d+)?\s*/\s*\d+(?:\.\d+)?\s*(?:mmHg|mm\sHg)|\d+(?:\.\d+)?%)\b",
    re.IGNORECASE,
)

_QUOTE_CLEANUP_REGEX = re.compile(r"['\u2018\u2019\"\u201c\u201d]")

POLICY_REASONING_REGEX = re.compile(r"^policy reasoning\s*:\s*", re.IGNORECASE)


def _normalize_line_sentiment(line: str) -> str:
    text = line.lower()
    if any(keyword in text for keyword in BAD_KEYWORDS):
        return "risk"
    if any(keyword in text for keyword in GOOD_KEYWORDS):
        return "reassuring"
    return "neutral"


def _normalize_lines(lines: list[str] | None) -> list[str]:
    return [
        re.sub(r"^[*-]\s*", "", line).strip()
        for line in (lines or [])
        if re.sub(r"^[*-]\s*", "", line).strip()
    ]


def _strip_markdown_bold(text: str) -> str:
    """Remove **...** markers, keeping the inner text."""
    return re.sub(r"\*\*(.+?)\*\*", r"\1", text)


def find_highlight_terms(text: str) -> list[str]:
    """Return a deduplicated list of highlight terms found in *text*.

    Runs three passes in priority order:
      1. Curated CLINICAL_PHRASES (longest-first, case-insensitive)
      2. BP composite + percentage regex
      3. **...** bold markers (extracted and stripped from display text)

    Overlapping matches are resolved greedily by phrase length (longer wins).
    """
    clean = _quote_cleanup(text)
    clean = _strip_markdown_bold(clean)

    covered: list[tuple[int, int]] = []  # (start, end) of accepted spans
    found: list[str] = []

    def _overlaps(start: int, end: int) -> bool:
        return any(s < end and start < e for s, e in covered)

    # Pass 1 — clinical phrases (already sorted longest-first)
    for phrase in CLINICAL_PHRASES:
        for m in re.finditer(re.escape(phrase), clean, re.IGNORECASE):
            if not _overlaps(m.start(), m.end()):
                covered.append((m.start(), m.end()))
                found.append(m.group(0))

    # Pass 2 — BP composites and percentages
    for m in _BP_UNIT_REGEX.finditer(clean):
        if not _overlaps(m.start(), m.end()):
            covered.append((m.start(), m.end()))
            found.append(m.group(0))

    # Deduplicate while preserving first-found order
    seen: set[str] = set()
    result: list[str] = []
    for term in found:
        key = term.lower()
        if key not in seen:
            seen.add(key)
            result.append(term)
    return result


def _quote_cleanup(text: str) -> str:
    return _QUOTE_CLEANUP_REGEX.sub("", text)


def annotate_reasoning_lines_fallback(
    clinical_lines: list[str] | None,
    policy_reasoning: str = "",
) -> list[dict[str, Any]]:
    normalized_clinical_lines = _normalize_lines(clinical_lines)
    annotations: list[dict[str, Any]] = [
        {
            "text": line,
            "scope": "clinical_reasoning",
            "sentiment": _normalize_line_sentiment(line),
            "highlight_terms": find_highlight_terms(line),
        }
        for line in normalized_clinical_lines
    ]

    policy_lines = [
        POLICY_REASONING_REGEX.sub("", line).strip()
        for line in (policy_reasoning or "").split("\n")
        if POLICY_REASONING_REGEX.sub("", line).strip()
    ]
    annotations.extend(
        {
            "text": line,
            "scope": "policy_reasoning",
            "sentiment": "informational",
            "highlight_terms": find_highlight_terms(line),
        }
        for line in policy_lines
    )
    return annotations
