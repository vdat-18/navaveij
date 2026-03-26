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
            "highlight_terms": [],
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
            "highlight_terms": [],
        }
        for line in policy_lines
    )
    return annotations
