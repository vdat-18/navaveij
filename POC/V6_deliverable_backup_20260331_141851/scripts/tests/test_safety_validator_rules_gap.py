from src.services.safety import SafetyRuleValidator


def _raw_context(
    *,
    gender: str,
    age: int,
    signals_fired: list[str],
    add_on_library: list[dict],
) -> dict:
    return {
        "get_hard_constraints": {"patient_demographics": {"gender": gender, "age": age}},
        "get_clinical_signals": {"signals_fired": signals_fired},
        "get_program_ruleset": {"add_on_library": add_on_library},
    }


def test_safety_validator_removes_gender_ineligible_add_on():
    validator = SafetyRuleValidator()
    ai_output = {
        "add_ons": [{"item_id": "MAMMO001", "priority": "Yellow", "rationale": "screening"}],
    }
    context = _raw_context(
        gender="male",
        age=45,
        signals_fired=[],
        add_on_library=[
            {"item_code": "MAMMO001", "gender_constraint": "female", "status": "active"},
        ],
    )

    result = validator.validate_and_filter(ai_output, context)

    assert result["filtered_add_ons"] == []
    assert len(result["conflict_events"]) == 1
    assert result["conflict_events"][0]["item_id"] == "MAMMO001"
    assert "gender_ineligible" in result["conflict_events"][0]["violation_reason"]


def test_safety_validator_removes_contraindicated_add_on():
    validator = SafetyRuleValidator()
    ai_output = {
        "add_ons": [{"item_id": "CT001", "priority": "Orange", "rationale": "rule trigger"}],
    }
    context = _raw_context(
        gender="female",
        age=50,
        signals_fired=["pregnancy_positive"],
        add_on_library=[
            {
                "item_code": "CT001",
                "status": "active",
                "safety_contraindication_signals": ["pregnancy_positive"],
            },
        ],
    )

    result = validator.validate_and_filter(ai_output, context)

    assert result["filtered_add_ons"] == []
    assert len(result["conflict_events"]) == 1
    assert result["conflict_events"][0]["violation_reason"] == "contraindication_signal_triggered"


def test_safety_validator_keeps_eligible_add_on():
    validator = SafetyRuleValidator()
    ai_output = {
        "add_ons": [{"item_id": "AON001", "priority": "Yellow", "rationale": "eligible"}],
    }
    context = _raw_context(
        gender="female",
        age=36,
        signals_fired=["signal_1"],
        add_on_library=[
            {
                "item_code": "AON001",
                "status": "active",
                "gender_constraint": "female",
                "age_min": 35,
                "age_max": 65,
                "safety_contraindication_signals": ["contra_signal_x"],
            },
        ],
    )

    result = validator.validate_and_filter(ai_output, context)

    assert len(result["filtered_add_ons"]) == 1
    assert result["filtered_add_ons"][0]["item_id"] == "AON001"
    assert result["conflict_events"] == []
