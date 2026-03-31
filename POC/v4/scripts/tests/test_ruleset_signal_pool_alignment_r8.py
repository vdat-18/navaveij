import json
from pathlib import Path


def _load_ruleset() -> dict:
    ruleset_path = (
        Path(__file__).resolve().parents[3]
        / "v3"
        / "assets"
        / "synthesis"
        / "rulesets"
        / "sample_ruleset_tier_config.json"
    )
    return json.loads(ruleset_path.read_text(encoding="utf-8"))


def _signal_pool(ruleset: dict, rule_id: str) -> list[str]:
    for rule in ruleset.get("tier_selection_rules", []):
        if rule.get("rule_id") != rule_id:
            continue
        for condition in rule.get("conditions", []):
            if condition.get("type") == "signal_count_threshold":
                return condition.get("signal_pool", [])
    return []


def test_gap_r8_premium_pool_contains_required_signals():
    ruleset = _load_ruleset()
    pool = _signal_pool(ruleset, "PREMIUM_MULTI_SIGNAL")
    assert "diabetes_confirmation_required" in pool
    assert "history_syncope" in pool


def test_gap_r8_advanced_pool_aligned_with_framework_membership():
    ruleset = _load_ruleset()
    pool = _signal_pool(ruleset, "ADVANCED_METABOLIC_OR_CVD")
    assert "fbs_upward_trend" in pool
    assert "diagnosis_fatty_liver" in pool
    assert "family_hx_early_heart_attack" not in pool
    assert "symptom_fatigue" not in pool
    assert "history_loss_of_consciousness" not in pool
    assert "occupational_risk_factory" not in pool


def test_gap_r8_signal_pools_have_no_duplicates():
    ruleset = _load_ruleset()
    for rule_id in ("PREMIUM_MULTI_SIGNAL", "ADVANCED_METABOLIC_OR_CVD"):
        pool = _signal_pool(ruleset, rule_id)
        assert len(pool) == len(set(pool))
