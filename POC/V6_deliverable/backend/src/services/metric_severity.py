import json
from dataclasses import dataclass
from pathlib import Path

from loguru import logger


@dataclass(frozen=True)
class MetricThresholds:
    normal_max: float | None = None
    borderline_max: float | None = None
    normal_min: float | None = None
    borderline_min: float | None = None


@dataclass(frozen=True)
class MetricRule:
    label: str
    loinc: str
    unit: str
    direction: str
    thresholds: MetricThresholds


@dataclass(frozen=True)
class MetricSeverityResult:
    severity: str
    interpretation: str
    threshold_crossed: str


_RULES_PATH = Path(__file__).resolve().parents[3] / "assets/synthesis/rulesets/metric_severity_rules.json"
_cached_mtime_ns: int | None = None
_cached_rules: dict[str, MetricRule] | None = None


def _parse_thresholds(raw: dict) -> MetricThresholds:
    return MetricThresholds(
        normal_max=raw.get("normal_max"),
        borderline_max=raw.get("borderline_max"),
        normal_min=raw.get("normal_min"),
        borderline_min=raw.get("borderline_min"),
    )


def load_metric_rules() -> dict[str, MetricRule]:
    global _cached_mtime_ns, _cached_rules

    if not _RULES_PATH.exists():
        return {}

    mtime_ns = _RULES_PATH.stat().st_mtime_ns
    if _cached_rules is not None and _cached_mtime_ns == mtime_ns:
        return _cached_rules

    try:
        raw = json.loads(_RULES_PATH.read_text(encoding="utf-8"))
        metrics = raw.get("metrics", {})
        rules: dict[str, MetricRule] = {}
        for metric_id, metric in metrics.items():
            thresholds = _parse_thresholds(metric.get("thresholds", {}))
            rules[metric_id] = MetricRule(
                label=str(metric.get("label", "")),
                loinc=str(metric.get("loinc", "")),
                unit=str(metric.get("unit", "")),
                direction=str(metric.get("direction", "")),
                thresholds=thresholds,
            )
        _cached_rules = rules
        _cached_mtime_ns = mtime_ns
        return rules
    except Exception as exc:
        logger.warning(f"Failed to load metric severity rules: {exc}")
        _cached_rules = {}
        _cached_mtime_ns = mtime_ns
        return {}


def evaluate_metric_severity(metric_id: str, value: float | int | None) -> MetricSeverityResult:
    if not isinstance(value, (int, float)):
        return MetricSeverityResult(severity="unknown", interpretation="", threshold_crossed="")

    rules = load_metric_rules()
    rule = rules.get(metric_id)
    if not rule:
        return MetricSeverityResult(severity="unknown", interpretation="", threshold_crossed="")

    t = rule.thresholds

    if rule.direction == "high_is_bad":
        if t.normal_max is not None and value <= t.normal_max:
            return MetricSeverityResult(severity="normal", interpretation="N", threshold_crossed="normal")
        if t.borderline_max is not None and value <= t.borderline_max:
            return MetricSeverityResult(severity="borderline", interpretation="A", threshold_crossed="borderline")
        return MetricSeverityResult(severity="abnormal", interpretation="H", threshold_crossed="above_high")

    if rule.direction == "low_is_bad":
        if t.normal_min is not None and value >= t.normal_min:
            return MetricSeverityResult(severity="normal", interpretation="N", threshold_crossed="normal")
        if t.borderline_min is not None and value >= t.borderline_min:
            return MetricSeverityResult(severity="borderline", interpretation="A", threshold_crossed="borderline")
        return MetricSeverityResult(severity="abnormal", interpretation="L", threshold_crossed="below_low")

    return MetricSeverityResult(severity="unknown", interpretation="", threshold_crossed="")
