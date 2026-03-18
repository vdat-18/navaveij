"""Deterministic Rule Engine for Program Tier Selection."""

import json
from pathlib import Path
from typing import Any

from loguru import logger

# Resolve base path (backend/src/services/rules.py -> parent(3) is backend, parent(4) is root)
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
RULESET_TIER_CONFIG_PATH = BASE_DIR / "assets/synthesis/rulesets/sample_ruleset_tier_config.json"


class RuleEvaluator:
    """Evaluates Clinical Signals against programmed rules to determine a recommendation tier."""

    def __init__(self, signals_fired: list[str]):
        """Initialize with the patient's active clinical signals."""
        self.signals_fired = set(signals_fired)
        self.ruleset = self._load_ruleset()

    def _load_ruleset(self) -> dict:
        """Load the deterministic tier selection ruleset."""
        if not RULESET_TIER_CONFIG_PATH.exists():
            logger.error(f"Rule Config NOT found: {RULESET_TIER_CONFIG_PATH}")
            return {"tier_selection_rules": []}

        try:
            with open(RULESET_TIER_CONFIG_PATH, encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load Ruleset: {e}")
            return {"tier_selection_rules": []}

    def evaluate(self) -> dict[str, Any]:
        """Evaluate signals against rules in order of priority.

        Returns:
            {
                "rule_tier": str,
                "applied_rule_id": str,
                "applied_condition": str,
                "signals_matched": list[str]
            }
        """
        rules = self.ruleset.get("tier_selection_rules", [])
        # Rules are normally sorted by priority in the JSON; sort just in case.
        sorted_rules = sorted(rules, key=lambda x: x.get("priority", 999))

        for rule in sorted_rules:
            rule_id = rule.get("rule_id", "UNKNOWN")
            tier = rule.get("tier", "Standard")
            logic = rule.get("match_logic", "ANY")
            conditions = rule.get("conditions", [])

            logger.debug(f"Evaluating rule: {rule_id} (Tier: {tier}, Logic: {logic})")

            # Default match for low-risk
            if logic == "DEFAULT":
                return {
                    "rule_tier": tier,
                    "applied_rule_id": rule_id,
                    "applied_condition": "Fallback default",
                    "signals_matched": [],
                }

            # Strategy: ANY (matches if any condition matches)
            if logic == "ANY":
                for cond in conditions:
                    matched_ids = self._evaluate_condition(cond)
                    if matched_ids:
                        return {
                            "rule_tier": tier,
                            "applied_rule_id": rule_id,
                            "applied_condition": cond.get("description", "Condition match"),
                            "signals_matched": list(matched_ids),
                        }

            # Strategy: COUNT_THRESHOLD (matches if count of pool signals is met)
            elif logic == "COUNT_THRESHOLD":
                for cond in conditions:
                    if cond.get("type") == "signal_count_threshold":
                        pool = set(cond.get("signal_pool", []))
                        min_count = cond.get("min_count", 0)
                        intersection = self.signals_fired.intersection(pool)

                        if len(intersection) >= min_count:
                            return {
                                "rule_tier": tier,
                                "applied_rule_id": rule_id,
                                "applied_condition": cond.get("description", f"Count >= {min_count}"),
                                "signals_matched": list(intersection),
                            }

        # Final Fallback
        return {
            "rule_tier": "Standard",
            "applied_rule_id": "FINAL_FALLBACK",
            "applied_condition": "No rules matched",
            "signals_matched": [],
        }

    def _evaluate_condition(self, condition: dict) -> set[str]:
        """Evaluate a single condition object.
        Supports simple 'signal_active' and combined 'and_signal_active'.
        """
        cond_type = condition.get("type")
        signals_to_check = set(condition.get("signal_ids", []))

        if cond_type == "signal_active":
            # Basic match (OR within the signal_ids list)
            main_match = self.signals_fired.intersection(signals_to_check)

            if main_match:
                # If there's a required AND condition (AND across the list)
                and_signals = condition.get("and_signal_active")
                if and_signals:
                    # ALL signals in and_signal_active must be present
                    required_and = set(and_signals)
                    if required_and.issubset(self.signals_fired):
                        return main_match.union(required_and)
                    else:
                        return set()  # AND condition failed

                return main_match

        return set()
