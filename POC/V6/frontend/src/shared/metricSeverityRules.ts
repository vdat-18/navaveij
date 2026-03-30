import metricSeverityRules from "@/data/metric_severity_rules.json";

export type MetricRuleDirection = "high_is_bad" | "low_is_bad";

export type MetricRule = {
  label: string;
  loinc: string;
  unit: string;
  direction: MetricRuleDirection;
  thresholds: {
    normal_max?: number;
    borderline_max?: number;
    normal_min?: number;
    borderline_min?: number;
  };
};

export function getMetricRule(metricId: string): MetricRule | null {
  const metrics = (metricSeverityRules as { metrics?: Record<string, MetricRule> }).metrics;
  return metrics?.[metricId] ?? null;
}
