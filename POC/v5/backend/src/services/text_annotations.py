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


def get_line_sentiment(line: str) -> str:
    text = line.lower()
    if any(keyword in text for keyword in BAD_KEYWORDS):
        return "bad"
    if any(keyword in text for keyword in GOOD_KEYWORDS):
        return "good"
    return "neutral"


def annotate_reasoning_lines(reasoning_trace: str) -> list[dict[str, Any]]:
    lines = [
        re.sub(r"^[*-]\s*", "", line).strip()
        for line in (reasoning_trace or "").split("\n")
    ]
    normalized_lines = [line for line in lines if line and not POLICY_REASONING_REGEX.match(line)]

    return [
        {
            "text": line,
            "sentiment": get_line_sentiment(line),
        }
        for line in normalized_lines
    ]
