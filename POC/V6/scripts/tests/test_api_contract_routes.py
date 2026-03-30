import json
from pathlib import Path
from unittest.mock import ANY, AsyncMock

from fastapi.testclient import TestClient

from src.api.main import app
from src.api.routes import clinical, contracts

client = TestClient(app)


def _auth_headers(role: str = "admin", scopes: str = "recommendation:read,monitoring:read") -> dict[str, str]:
    return {
        "X-Auth-User-Id": "usr-test-0001",
        "X-Auth-Role": role,
        "X-Auth-Scopes": scopes,
    }


def _first_patient_token() -> str:
    registry_path = Path("assets/patient_registry.json")
    registry = json.loads(registry_path.read_text(encoding="utf-8"))
    return registry[0]["patient_token"]


def _first_patient_id() -> str:
    registry_path = Path("assets/patient_registry.json")
    registry = json.loads(registry_path.read_text(encoding="utf-8"))
    return registry[0]["patient_id"]


def test_recommend_contract_route_success():
    contracts.cache_service.clear()
    token = _first_patient_token()
    mock_result = {
        "ai_recommended_tier": "Advanced",
        "tier_deviation_justification": None,
        "reasoning_trace": "Contract route test trace",
        "add_ons": [{"item_code": "A001", "priority_level": "Yellow", "rationale": "Test rationale"}],
        "supporting_signals": ["signal_1"],
        "missing_signals": ["signal_missing_1"],
        "communication_script": {
            "clinical_conclusion": "Clinical summary.",
            "health_summary": "Health summary.",
            "recommendation_explanation": "Recommendation explanation.",
            "add_on_highlights": ["Highlight"],
            "next_steps": "Next steps.",
        },
        "clinical_signals": {
            "rule_preliminary_tier": "Advanced",
            "applicable_signals": ["signal_1", "signal_2"],
            "signals_fired": ["signal_1"],
            "missing_signals": ["signal_missing_1"],
            "risk_flags": [
                {
                    "flag_id": "signal_1",
                    "label": "High Risk Signal",
                    "severity": "High",
                    "guideline": "Test guideline",
                    "source_signals": ["signal_1"],
                }
            ],
            "pipeline_run_id": "pipe_test_001",
        },
        "recommendation_source": "AI",
        "review_required": False,
        "security_metadata": {
            "rehydration_map": {"tok_xxx": "Jane Doe"},
            "masked_ai_output": {"reasoning_trace": "masked"},
            "is_poc_demo": True,
        },
    }
    contracts.get_program_ruleset = lambda _patient_token, patient_id=None: {
        "ruleset_version": "v2026.03.1",
        "rule_preliminary_tier": "Advanced",
        "resolved_package": {
            "tier": "Advanced",
            "package_name": "Platinum — Men",
            "package_code": "PLAT_M",
            "price_thb": 8700,
            "age_band": "age_35_plus",
            "gender": "male",
        },
        "add_on_library": [
            {
                "item_code": "A001",
                "label": "Sample Add-on",
                "category": "cardiac",
                "trigger_signals": ["signal_1"],
                "navavej_product": {
                    "product_name": "Product A",
                    "product_code": "PROD_A",
                    "price_thb": 1200,
                },
            }
        ],
    }
    contracts.orchestrator.generate_recommendation = AsyncMock(return_value=mock_result)

    response = client.post("/api/recommend", json={"patient_token": token}, headers=_auth_headers(scopes="recommendation:read"))

    assert response.status_code == 200
    payload = response.json()
    assert payload["reasoning_trace"] == "Contract route test trace"
    assert payload["rule_preliminary_tier"] == "Advanced"
    assert payload["resolved_package"]["package_code"] == "PLAT_M"
    assert payload["confidence_tier"] in {"High", "Medium", "Low"}
    assert payload["recommendation_source"] in {"AI", "RuleBased"}
    assert payload["review_required"] is False
    assert payload["communication_script"]["opening"] == "Clinical summary."
    assert payload["add_ons"][0]["label"] == "Sample Add-on"
    assert payload["security_metadata"]["rehydration_map"]["tok_xxx"] == "Jane Doe"
    assert payload["security_metadata"]["masked_ai_output"]["reasoning_trace"] == "masked"
    assert payload["metadata"]["patient_token"] == token
    assert "request_id" in payload["metadata"]
    assert payload["metadata"]["cache_status"] in {"miss", "hit"}


def test_recommend_contract_route_cache_hit_skips_second_llm_call():
    contracts.cache_service.clear()
    token = _first_patient_token()
    mock_result = {
        "ai_recommended_tier": "Advanced",
        "tier_deviation_justification": None,
        "reasoning_trace": "Cache route test trace",
        "add_ons": [{"item_code": "A001", "priority_level": "Yellow", "rationale": "Test rationale"}],
        "supporting_signals": ["signal_1"],
        "missing_signals": [],
        "communication_script": {
            "clinical_conclusion": "Clinical summary.",
            "health_summary": "Health summary.",
            "recommendation_explanation": "Recommendation explanation.",
            "add_on_highlights": ["Highlight"],
            "next_steps": "Next steps.",
        },
        "clinical_signals": {
            "rule_preliminary_tier": "Advanced",
            "applicable_signals": ["signal_1"],
            "signals_fired": ["signal_1"],
            "missing_signals": [],
            "risk_flags": [],
            "pipeline_run_id": "pipe_cache_001",
        },
        "recommendation_source": "AI",
        "review_required": False,
        "security_metadata": {
            "rehydration_map": {"tok_cache": "Jane Doe"},
            "masked_ai_output": {"reasoning_trace": "masked-cache"},
            "is_poc_demo": True,
        },
    }
    contracts.get_clinical_signals = lambda _patient_token, patient_id=None: {
        "pipeline_run_id": "pipe_cache_001",
        "signals_fired": ["signal_1"],
        "missing_signals": [],
        "risk_flags": [],
    }
    contracts.get_program_ruleset = lambda _patient_token, patient_id=None: {
        "ruleset_version": "v2026.03.1",
        "rule_preliminary_tier": "Advanced",
        "resolved_package": {
            "tier": "Advanced",
            "package_name": "Platinum — Men",
            "package_code": "PLAT_M",
            "price_thb": 8700,
            "age_band": "age_35_plus",
            "gender": "male",
        },
        "add_on_library": [
            {
                "item_code": "A001",
                "label": "Sample Add-on",
                "category": "cardiac",
                "trigger_signals": ["signal_1"],
                "navavej_product": {
                    "product_name": "Product A",
                    "product_code": "PROD_A",
                    "price_thb": 1200,
                },
            }
        ],
    }
    contracts.orchestrator.generate_recommendation = AsyncMock(return_value=mock_result)

    first = client.post("/api/recommend", json={"patient_token": token}, headers=_auth_headers(scopes="recommendation:read"))
    second = client.post("/api/recommend", json={"patient_token": token}, headers=_auth_headers(scopes="recommendation:read"))

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["metadata"]["cache_status"] == "miss"
    assert second.json()["metadata"]["cache_status"] == "hit"
    assert contracts.orchestrator.generate_recommendation.await_count == 1


def test_recommend_contract_route_force_rule_based_passthrough_and_response_contract():
    contracts.cache_service.clear()
    token = _first_patient_token()
    mock_result = {
        "ai_recommended_tier": "Premium",
        "tier_deviation_justification": "Rule path selected by request",
        "reasoning_trace": "Rule path trace",
        "add_ons": [],
        "supporting_signals": ["signal_critical"],
        "missing_signals": [],
        "communication_script": {
            "clinical_conclusion": "Rule-based clinical summary.",
            "health_summary": "Rule-based health summary.",
            "recommendation_explanation": "Rule-based explanation.",
            "add_on_highlights": [],
            "next_steps": "Manual review required.",
        },
        "clinical_signals": {
            "rule_preliminary_tier": "Premium",
            "applicable_signals": ["signal_critical"],
            "signals_fired": ["signal_critical"],
            "missing_signals": [],
            "risk_flags": [],
            "pipeline_run_id": "pipe_rule_001",
        },
        "recommendation_source": "RuleBased",
        "review_required": True,
        "security_metadata": {
            "rehydration_map": {"tok_rule": "John Doe"},
            "masked_ai_output": {"reasoning_trace": "masked-rule"},
            "is_poc_demo": True,
        },
    }
    contracts.get_clinical_signals = lambda _patient_token, patient_id=None: {
        "pipeline_run_id": "pipe_rule_001",
        "signals_fired": ["signal_critical"],
        "missing_signals": [],
        "risk_flags": [],
    }
    contracts.get_program_ruleset = lambda _patient_token, patient_id=None: {
        "ruleset_version": "v2026.03.1",
        "rule_preliminary_tier": "Premium",
        "resolved_package": {
            "tier": "Premium",
            "package_name": "Diamond — Men",
            "package_code": "DIAMOND_M",
            "price_thb": 12500,
            "age_band": "age_35_plus",
            "gender": "male",
        },
        "add_on_library": [],
    }
    contracts.orchestrator.generate_recommendation = AsyncMock(return_value=mock_result)

    response = client.post(
        "/api/recommend",
        json={"patient_token": token, "force_rule_based": True},
        headers=_auth_headers(scopes="recommendation:read"),
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["recommendation_source"] == "RuleBased"
    assert payload["review_required"] is True
    assert payload["security_metadata"]["rehydration_map"]["tok_rule"] == "John Doe"
    assert payload["security_metadata"]["masked_ai_output"]["reasoning_trace"] == "masked-rule"
    contracts.orchestrator.generate_recommendation.assert_awaited_once_with(
        patient_id=_first_patient_id(),
        patient_token=token,
        force_rule_based=True,
        audit_context=ANY,
    )


def test_recommend_contract_route_cache_partitioned_by_force_rule_based():
    contracts.cache_service.clear()
    token = _first_patient_token()

    ai_result = {
        "ai_recommended_tier": "Advanced",
        "tier_deviation_justification": None,
        "reasoning_trace": "AI path",
        "add_ons": [{"item_id": "A001", "priority": "Yellow", "price_thb": 1200}],
        "supporting_signals": ["signal_1"],
        "missing_signals": [],
        "communication_script": {
            "clinical_conclusion": "AI summary.",
            "health_summary": "AI health summary.",
            "recommendation_explanation": "AI explanation.",
            "add_on_highlights": [],
            "next_steps": "AI next step.",
        },
        "clinical_signals": {
            "rule_preliminary_tier": "Advanced",
            "applicable_signals": ["signal_1"],
            "signals_fired": ["signal_1"],
            "missing_signals": [],
            "risk_flags": [],
            "pipeline_run_id": "pipe_partition_001",
        },
        "recommendation_source": "AI",
        "review_required": False,
        "security_metadata": {
            "rehydration_map": {"tok_ai": "Alice"},
            "masked_ai_output": {"reasoning_trace": "masked-ai"},
            "is_poc_demo": True,
        },
    }
    rule_result = {
        **ai_result,
        "reasoning_trace": "Rule path",
        "recommendation_source": "RuleBased",
        "review_required": True,
        "security_metadata": {
            "rehydration_map": {"tok_rule": "Bob"},
            "masked_ai_output": {"reasoning_trace": "masked-rule"},
            "is_poc_demo": True,
        },
    }
    contracts.get_clinical_signals = lambda _patient_token, patient_id=None: {
        "pipeline_run_id": "pipe_partition_001",
        "signals_fired": ["signal_1"],
        "missing_signals": [],
        "risk_flags": [],
    }
    contracts.get_program_ruleset = lambda _patient_token, patient_id=None: {
        "ruleset_version": "v2026.03.1",
        "rule_preliminary_tier": "Advanced",
        "resolved_package": {
            "tier": "Advanced",
            "package_name": "Platinum — Men",
            "package_code": "PLAT_M",
            "price_thb": 8700,
            "age_band": "age_35_plus",
            "gender": "male",
        },
        "add_on_library": [
            {"item_code": "A001", "navavej_product": {"price_thb": 1200}, "trigger_signals": ["signal_1"]}
        ],
    }
    contracts.orchestrator.generate_recommendation = AsyncMock(side_effect=[ai_result, rule_result])

    ai_response = client.post(
        "/api/recommend",
        json={"patient_token": token, "force_rule_based": False},
        headers=_auth_headers(scopes="recommendation:read"),
    )
    rule_response = client.post(
        "/api/recommend",
        json={"patient_token": token, "force_rule_based": True},
        headers=_auth_headers(scopes="recommendation:read"),
    )
    rule_cached_response = client.post(
        "/api/recommend",
        json={"patient_token": token, "force_rule_based": True},
        headers=_auth_headers(scopes="recommendation:read"),
    )

    assert ai_response.status_code == 200
    assert rule_response.status_code == 200
    assert rule_cached_response.status_code == 200
    assert ai_response.json()["metadata"]["cache_status"] == "miss"
    assert rule_response.json()["metadata"]["cache_status"] == "miss"
    assert rule_cached_response.json()["metadata"]["cache_status"] == "hit"
    assert ai_response.json()["recommendation_source"] == "AI"
    assert rule_response.json()["recommendation_source"] == "RuleBased"
    assert contracts.orchestrator.generate_recommendation.await_count == 2


def test_recommend_contract_route_preserves_orchestrator_source_and_review_precedence():
    contracts.cache_service.clear()
    token = _first_patient_token()
    low_confidence_ai_result = {
        "ai_recommended_tier": "Advanced",
        "tier_deviation_justification": None,
        "reasoning_trace": "AI remains authoritative despite low computed confidence.",
        "add_ons": [],
        "supporting_signals": [],
        "missing_signals": ["signal_1", "signal_2", "signal_3"],
        "communication_script": {
            "clinical_conclusion": "AI summary.",
            "health_summary": "AI health summary.",
            "recommendation_explanation": "AI explanation.",
            "add_on_highlights": [],
            "next_steps": "AI next step.",
        },
        "clinical_signals": {
            "rule_preliminary_tier": "Advanced",
            "applicable_signals": [],
            "signals_fired": [],
            "missing_signals": ["signal_1", "signal_2", "signal_3"],
            "risk_flags": [],
            "pipeline_run_id": "pipe_precedence_001",
        },
        "recommendation_source": "AI",
        "review_required": False,
        "security_metadata": {
            "rehydration_map": {"tok_prec": "N/A"},
            "masked_ai_output": {"reasoning_trace": "masked-precedence"},
            "is_poc_demo": True,
        },
    }
    contracts.get_clinical_signals = lambda _patient_token, patient_id=None: {
        "pipeline_run_id": "pipe_precedence_001",
        "signals_fired": [],
        "missing_signals": ["signal_1", "signal_2", "signal_3"],
        "risk_flags": [],
    }
    contracts.get_program_ruleset = lambda _patient_token, patient_id=None: {
        "ruleset_version": "v2026.03.1",
        "rule_preliminary_tier": "Advanced",
        "resolved_package": {
            "tier": "Advanced",
            "package_name": "Platinum — Men",
            "package_code": "PLAT_M",
            "price_thb": 8700,
            "age_band": "age_35_plus",
            "gender": "male",
        },
        "add_on_library": [],
    }
    contracts.orchestrator.generate_recommendation = AsyncMock(return_value=low_confidence_ai_result)

    response = client.post("/api/recommend", json={"patient_token": token}, headers=_auth_headers(scopes="recommendation:read"))
    assert response.status_code == 200
    payload = response.json()
    assert payload["confidence_tier"] == "Medium"
    assert payload["recommendation_source"] == "AI"
    assert payload["review_required"] is False


def test_recommend_contract_route_marks_unresolved_package_as_degraded():
    contracts.cache_service.clear()
    token = _first_patient_token()
    mock_result = {
        "ai_recommended_tier": "Advanced",
        "tier_deviation_justification": None,
        "reasoning_trace": "Package could not be resolved.",
        "add_ons": [],
        "supporting_signals": [],
        "missing_signals": [],
        "communication_script": {
            "clinical_conclusion": "Summary.",
            "health_summary": "Health summary.",
            "recommendation_explanation": "Explanation.",
            "add_on_highlights": [],
            "next_steps": "Next steps.",
        },
        "clinical_signals": {
            "rule_preliminary_tier": "Advanced",
            "applicable_signals": [],
            "signals_fired": [],
            "missing_signals": [],
            "risk_flags": [],
            "pipeline_run_id": "pipe_degraded_001",
        },
        "recommendation_source": "AI",
        "review_required": False,
        "security_metadata": {
            "rehydration_map": {"tok_degraded": "Jane Doe"},
            "masked_ai_output": {"reasoning_trace": "masked-degraded"},
            "is_poc_demo": True,
        },
    }
    contracts.get_clinical_signals = lambda _patient_token, patient_id=None: {
        "pipeline_run_id": "pipe_degraded_001",
        "signals_fired": [],
        "missing_signals": [],
        "risk_flags": [],
    }
    contracts.get_program_ruleset = lambda _patient_token, patient_id=None: {
        "ruleset_version": "v2026.03.1",
        "rule_preliminary_tier": "Advanced",
        "resolved_package": {},
        "package_resolution_map": {},
        "tier_selection_rules": [],
        "add_on_library": [],
    }
    contracts.orchestrator.generate_recommendation = AsyncMock(return_value=mock_result)

    response = client.post("/api/recommend", json={"patient_token": token}, headers=_auth_headers(scopes="recommendation:read"))

    assert response.status_code == 200
    payload = response.json()
    assert payload["resolved_package_status"] == "unresolved"
    assert payload["review_required"] is True
    assert "package_resolution_unresolved" in payload["metadata"]["degradation_reasons"]
    assert "ruleset_artifacts_missing" in payload["metadata"]["degradation_reasons"]


def test_recommend_contract_route_invalid_token():
    response = client.post(
        "/api/recommend",
        json={"patient_token": "tok_hmac_not_found"},
        headers=_auth_headers(scopes="recommendation:read"),
    )
    assert response.status_code == 404


def test_timeline_contract_route_exists():
    token = _first_patient_token()
    response = client.get(f"/api/timeline/{token}", headers=_auth_headers(scopes="recommendation:read"))

    assert response.status_code == 200
    payload = response.json()
    assert payload["patient_token"] == token
    assert "timeline_span" in payload
    assert "diagnoses" in payload
    assert "hospitalizations" in payload
    assert "significant_lab_events" in payload
    assert "screening_procedure_history" in payload
    assert "medication_changes" in payload
    assert "pipeline_run_id" in payload
    assert "computed_at" in payload
    assert isinstance(payload["diagnoses"], list)
    assert isinstance(payload["significant_lab_events"], list)


def test_biomarker_trends_route_exists():
    token = _first_patient_token()
    response = client.get(f"/api/biomarker-trends/{token}", headers=_auth_headers(scopes="recommendation:read"))
    assert response.status_code == 200
    payload = response.json()
    assert payload.get("patient_token") == token
    assert "bmi" in payload
    assert "blood_pressure" in payload
    assert "egfr" in payload
    assert "labs" in payload


def test_screening_gaps_route_exists():
    token = _first_patient_token()
    response = client.get(f"/api/screening-gaps/{token}", headers=_auth_headers(scopes="recommendation:read"))
    assert response.status_code == 200
    payload = response.json()
    assert payload.get("patient_token") == token
    assert "screening_gaps" in payload
    assert "vaccination_gaps" in payload


def test_monitoring_snapshot_contract_route_exists():
    response = client.get("/api/monitoring-snapshot", headers=_auth_headers(role="admin", scopes="monitoring:read"))

    assert response.status_code == 200
    payload = response.json()
    assert "snapshot_at" in payload
    assert "active_users_now" in payload
    assert "sessions_today" in payload
    assert "patient_records_accessed_today" in payload
    assert "ai_recommendations_generated_today" in payload
    assert "alert_counts" in payload
    assert "safety_validator_failures_today" in payload


def test_audit_logs_contract_route_filters():
    response = client.get(
        "/api/audit-logs",
        params={"action_type": "View"},
        headers=_auth_headers(role="admin", scopes="monitoring:read"),
    )

    assert response.status_code == 200
    payload = response.json()
    assert "total" in payload
    assert "entries" in payload
    for entry in payload["entries"]:
        assert entry["what"]["action_type"] == "View"


def test_access_monitoring_support_routes_exist():
    monitoring_headers = _auth_headers(role="admin", scopes="monitoring:read")
    assert client.get("/api/anomaly-alerts", headers=monitoring_headers).status_code == 200
    assert client.get("/api/rbac", headers=monitoring_headers).status_code == 200
    mapping_response = client.get("/api/mapping-codes", headers=monitoring_headers)
    assert mapping_response.status_code == 200
    mapping_payload = mapping_response.json()
    assert "mappings" in mapping_payload
    assert len(mapping_payload["mappings"]) > 0
    first_mapping = mapping_payload["mappings"][0]
    for key in [
        "mapping_id",
        "local_system",
        "local_code",
        "target_system",
        "target_code",
        "target_label",
        "mapping_type",
        "status",
    ]:
        assert key in first_mapping
    assert client.get("/api/master-programs", headers=monitoring_headers).status_code == 200


def test_legacy_route_still_available():
    response = client.get("/api/v1/clinical/audit", headers=_auth_headers(scopes="recommendation:read"))
    assert response.status_code == 200


def test_legacy_recommend_adapter_path_uses_id_input():
    patient_id = _first_patient_id()
    clinical.orchestrator.generate_recommendation = AsyncMock(
        return_value={"recommendation_hash": "hash_1", "ai_recommended_tier": "Advanced"}
    )
    response = client.post(
        "/api/v1/clinical/recommend",
        json={"patient_id": patient_id},
        headers=_auth_headers(scopes="recommendation:read"),
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["ai_recommended_tier"] == "Advanced"


def test_gap_r1_rule_agreement_mismatch_is_zero():
    ai_output = {
        "ai_recommended_tier": "Advanced",
        "tier_deviation_justification": None,
        "reasoning_trace": "trace",
        "add_ons": [],
        "supporting_signals": ["s1", "s2"],
        "missing_signals": ["s3", "s4"],
        "communication_script": {"clinical_conclusion": "ok"},
        "clinical_signals": {
            "applicable_signals": ["s1", "s2", "s3", "s4"],
            "signals_fired": ["s1"],
            "risk_flags": [],
            "pipeline_run_id": "pipe_r1_mismatch",
        },
        "review_required": False,
        "recommendation_source": "AI",
    }
    ruleset = {"rule_preliminary_tier": "Standard", "resolved_package": {}, "add_on_library": []}

    payload = contracts._normalize_stage2(
        patient_token="tok_test",
        ai_output=ai_output,
        ruleset=ruleset,
        latency_ms=1,
    )

    assert payload["confidence_score"] == 0.6
    assert payload["confidence_tier"] == "Medium"


def test_gap_r1_signal_coverage_uses_expected_minus_missing():
    ai_output = {
        "ai_recommended_tier": "Advanced",
        "tier_deviation_justification": None,
        "reasoning_trace": "trace",
        "add_ons": [],
        "supporting_signals": ["s1", "s2", "s3"],
        "missing_signals": ["s4"],
        "communication_script": {"clinical_conclusion": "ok"},
        "clinical_signals": {
            "applicable_signals": ["s1", "s2", "s3", "s4"],
            "signals_fired": ["s1"],
            "risk_flags": [],
            "pipeline_run_id": "pipe_r1_cov",
        },
        "review_required": False,
        "recommendation_source": "AI",
    }
    ruleset = {"rule_preliminary_tier": "Advanced", "resolved_package": {}, "add_on_library": []}

    payload = contracts._normalize_stage2(
        patient_token="tok_test",
        ai_output=ai_output,
        ruleset=ruleset,
        latency_ms=1,
    )

    assert payload["confidence_score"] == 0.9
    assert payload["confidence_tier"] == "High"


def test_gap_r1_data_completeness_uses_required_field_presence():
    ai_output = {
        "ai_recommended_tier": "Advanced",
        "tier_deviation_justification": None,
        "reasoning_trace": "",
        "add_ons": [],
        "supporting_signals": ["s1", "s2"],
        "missing_signals": [],
        "communication_script": {},
        "clinical_signals": {
            "applicable_signals": ["s1", "s2"],
            "signals_fired": ["s1", "s2"],
            "risk_flags": [],
            "pipeline_run_id": "pipe_r1_comp",
        },
        "review_required": False,
        "recommendation_source": "AI",
    }
    ruleset = {"rule_preliminary_tier": "Advanced", "resolved_package": {}, "add_on_library": []}

    payload = contracts._normalize_stage2(
        patient_token="tok_test",
        ai_output=ai_output,
        ruleset=ruleset,
        latency_ms=1,
    )

    assert payload["confidence_score"] == 0.84
    assert payload["confidence_tier"] == "High"


def test_gap_r3_stage1_fields_are_normalized_for_stage2_contract():
    ai_output = {
        "ai_recommended_tier": "Advanced",
        "tier_deviation_justification": None,
        "reasoning_trace": "trace",
        "add_ons": [
            {
                "item_id": "A001",
                "priority": "Yellow",
                "rationale": "Triggered by signal_1",
                "label": "Sample Add-on",
                "product_code": "PROD_A",
                "price_thb": 1200,
                "category": "cardiac",
            }
        ],
        "supporting_signals": ["signal_1"],
        "missing_signals": [],
        "communication_script": {
            "health_summary": "summary",
            "recommendation_rationale": "rationale",
            "addon_highlights": ["highlight"],
            "next_steps": "next",
        },
        "clinical_signals": {
            "rule_preliminary_tier": "Advanced",
            "applicable_signals": ["signal_1"],
            "signals_fired": ["signal_1"],
            "missing_signals": [],
            "risk_flags": [],
            "pipeline_run_id": "pipe_r3_001",
        },
        "recommendation_source": "AI",
        "review_required": False,
    }
    ruleset = {
        "rule_preliminary_tier": "Advanced",
        "resolved_package": {},
        "add_on_library": [
            {
                "item_code": "A001",
                "label": "Sample Add-on",
                "category": "cardiac",
                "trigger_signals": ["signal_1"],
                "navavej_product": {
                    "product_name": "Product A",
                    "product_code": "PROD_A",
                    "price_thb": 1200,
                },
            }
        ],
    }

    payload = contracts._normalize_stage2(
        patient_token="tok_test",
        ai_output=ai_output,
        ruleset=ruleset,
        latency_ms=1,
    )

    assert payload["add_ons"][0]["item_code"] == "A001"
    assert payload["add_ons"][0]["item_id"] == "A001"
    assert payload["add_ons"][0]["priority_level"] == "Yellow"
    assert payload["add_ons"][0]["priority"] == "Yellow"
    assert payload["add_ons"][0]["label"] == "Sample Add-on"
    assert payload["add_ons"][0]["category"] == "cardiac"
    assert payload["add_ons"][0]["product_code"] == "PROD_A"
    assert payload["add_ons"][0]["price_thb"] == 1200
    assert payload["communication_script"]["recommendation_explanation"] == "rationale"
    assert payload["communication_script"]["add_on_highlights"] == ["highlight"]


def test_gap_r4_validator_enforces_v2_v7_v9_v10():
    ai_output = {
        "add_ons": [{"item_id": "UNKNOWN", "price_thb": 9999}],
        "supporting_signals": ["invalid_signal"],
        "clinical_signals": {"signals_fired": ["signal_1"], "applicable_signals": ["signal_1"]},
    }
    ruleset = {
        "add_on_library": [
            {"item_code": "A001", "navavej_product": {"price_thb": 1200}},
        ]
    }
    failures = contracts._validate_stage1_output(
        ai_output=ai_output,
        ruleset=ruleset,
        clinical_signals={"signals_fired": ["signal_1"], "applicable_signals": ["signal_1"]},
    )
    assert "V2:item_id_not_in_ruleset" in failures
    assert "V7:supporting_signal_invalid" in failures

    ai_output_empty_addons = {
        "add_ons": [],
        "supporting_signals": ["signal_1"],
        "clinical_signals": {"signals_fired": ["signal_1"], "applicable_signals": ["signal_1"]},
    }
    failures_empty = contracts._validate_stage1_output(
        ai_output=ai_output_empty_addons,
        ruleset=ruleset,
        clinical_signals={"signals_fired": ["signal_1"], "applicable_signals": ["signal_1"]},
    )
    assert "V9:add_ons_empty_with_triggers" in failures_empty

    ai_output_price = {
        "add_ons": [{"item_id": "A001", "price_thb": 1300}],
        "supporting_signals": ["signal_1"],
        "clinical_signals": {"signals_fired": ["signal_1"], "applicable_signals": ["signal_1"]},
    }
    failures_price = contracts._validate_stage1_output(
        ai_output=ai_output_price,
        ruleset=ruleset,
        clinical_signals={"signals_fired": ["signal_1"], "applicable_signals": ["signal_1"]},
    )
    assert "V10:price_thb_mismatch" in failures_price


def test_gap_r4_validation_failure_triggers_rule_based_fallback():
    contracts.cache_service.clear()
    token = _first_patient_token()
    invalid_ai = {
        "ai_recommended_tier": "Advanced",
        "reasoning_trace": "invalid-ai",
        "add_ons": [{"item_id": "UNKNOWN", "price_thb": 9999, "rationale": "invalid"}],
        "supporting_signals": ["signal_1"],
        "missing_signals": [],
        "communication_script": {"health_summary": "h", "recommendation_rationale": "r", "addon_highlights": [], "next_steps": "n"},
        "clinical_signals": {
            "rule_preliminary_tier": "Advanced",
            "applicable_signals": ["signal_1"],
            "signals_fired": ["signal_1"],
            "missing_signals": [],
            "risk_flags": [],
            "pipeline_run_id": "pipe_r4_fail_001",
        },
        "recommendation_source": "AI",
        "review_required": False,
    }
    fallback_rule_based = {
        "ai_recommended_tier": "Advanced",
        "tier_deviation_justification": "fallback",
        "reasoning_trace": "rule-based fallback",
        "add_ons": [],
        "supporting_signals": ["signal_1"],
        "missing_signals": [],
        "communication_script": {
            "health_summary": "summary",
            "recommendation_rationale": "rule rationale",
            "addon_highlights": [],
            "next_steps": "next",
        },
        "clinical_signals": {
            "rule_preliminary_tier": "Advanced",
            "applicable_signals": ["signal_1"],
            "signals_fired": ["signal_1"],
            "missing_signals": [],
            "risk_flags": [],
            "pipeline_run_id": "pipe_r4_fail_001",
        },
        "recommendation_source": "RuleBased",
        "review_required": True,
    }
    contracts.get_clinical_signals = lambda _patient_token, patient_id=None: {
        "pipeline_run_id": "pipe_r4_fail_001",
        "signals_fired": ["signal_1"],
        "applicable_signals": ["signal_1"],
        "missing_signals": [],
        "risk_flags": [],
    }
    contracts.get_program_ruleset = lambda _patient_token, patient_id=None: {
        "ruleset_version": "v2026.03.1",
        "rule_preliminary_tier": "Advanced",
        "resolved_package": {},
        "add_on_library": [
            {"item_code": "A001", "navavej_product": {"price_thb": 1200}, "trigger_signals": ["signal_1"]}
        ],
    }
    contracts.orchestrator.generate_recommendation = AsyncMock(side_effect=[invalid_ai, fallback_rule_based])

    response = client.post("/api/recommend", json={"patient_token": token}, headers=_auth_headers(scopes="recommendation:read"))
    assert response.status_code == 200
    payload = response.json()
    assert payload["recommendation_source"] == "RuleBased"
    assert payload["review_required"] is True
    assert contracts.orchestrator.generate_recommendation.await_count == 2


def test_gap_r5_stage2_metadata_and_high_alert_completeness():
    ai_output = {
        "ai_recommended_tier": "Advanced",
        "tier_deviation_justification": None,
        "reasoning_trace": "trace",
        "add_ons": [],
        "supporting_signals": ["signal_1"],
        "missing_signals": ["signal_missing_1"],
        "communication_script": {"health_summary": "summary", "recommendation_rationale": "rationale", "addon_highlights": [], "next_steps": "next"},
        "clinical_signals": {
            "rule_preliminary_tier": "Advanced",
            "applicable_signals": ["signal_1", "signal_2"],
            "signals_fired": ["signal_1"],
            "missing_signals": ["signal_missing_1"],
            "risk_flags": [
                {"flag_id": "signal_critical", "label": "Critical Signal", "severity": "high", "guideline": "Guide", "source_signals": ["signal_1"]}
            ],
            "pipeline_run_id": "pipe_r5_001",
        },
        "recommendation_source": "AI",
        "review_required": False,
    }
    ruleset = {"rule_preliminary_tier": "Advanced", "resolved_package": {}, "add_on_library": []}

    payload = contracts._normalize_stage2(
        patient_token="tok_test",
        ai_output=ai_output,
        ruleset=ruleset,
        latency_ms=25,
    )

    assert payload["patient_high_alert"]["critical_signals"][0]["signal_id"] == "signal_critical"
    assert payload["patient_high_alert"]["missing_data_alerts"][0]["signal_id"] == "signal_missing_1"
    assert payload["metadata"]["active_client"] == "GeminiClient"
    assert payload["metadata"]["model_provider"] == "google-ai"
    assert payload["metadata"]["template_version"] == "gemini-v1"
    assert payload["metadata"]["latency_ms"] == 25


def test_gap_r6_low_confidence_without_source_is_ai_low_confidence():
    ai_output = {
        "ai_recommended_tier": "Advanced",
        "tier_deviation_justification": None,
        "reasoning_trace": "",
        "add_ons": [],
        "supporting_signals": [],
        "missing_signals": ["signal_1", "signal_2", "signal_3"],
        "communication_script": {"health_summary": "", "recommendation_rationale": "", "addon_highlights": [], "next_steps": ""},
        "clinical_signals": {
            "rule_preliminary_tier": "Advanced",
            "applicable_signals": [],
            "signals_fired": [],
            "missing_signals": ["signal_1", "signal_2", "signal_3"],
            "risk_flags": [],
            "pipeline_run_id": "pipe_r6_low_001",
        },
        "review_required": True,
    }
    payload = contracts._normalize_stage2(
        patient_token="tok_test",
        ai_output=ai_output,
        ruleset={"rule_preliminary_tier": "Advanced", "resolved_package": {}, "add_on_library": []},
        latency_ms=1,
    )
    assert payload["recommendation_source"] == "AI_LowConfidence"


def test_gap_r6b_stage2_prefers_workflow_resolved_metadata():
    ai_output = {
        "ai_recommended_tier": "Advanced",
        "tier_deviation_justification": None,
        "reasoning_trace": "trace",
        "add_ons": [],
        "supporting_signals": ["signal_1"],
        "missing_signals": [],
        "communication_script": {"health_summary": "summary", "recommendation_rationale": "rationale", "addon_highlights": [], "next_steps": "next"},
        "clinical_signals": {
            "rule_preliminary_tier": "Advanced",
            "applicable_signals": ["signal_1"],
            "signals_fired": ["signal_1"],
            "missing_signals": [],
            "risk_flags": [],
            "pipeline_run_id": "pipe_r6b_001",
        },
        "recommendation_source": "AI",
        "review_required": False,
        "metadata": {
            "active_client": "OpenAIClient",
            "model_id": "gpt-5.4-mini",
            "model_provider": "openai",
            "template_version": "openai-v1",
        },
    }

    payload = contracts._normalize_stage2(
        patient_token="tok_test",
        ai_output=ai_output,
        ruleset={"rule_preliminary_tier": "Advanced", "resolved_package": {}, "add_on_library": []},
        latency_ms=8,
    )

    assert payload["metadata"]["active_client"] == "OpenAIClient"
    assert payload["metadata"]["model_id"] == "gpt-5.4-mini"
    assert payload["metadata"]["model_provider"] == "openai"
    assert payload["metadata"]["template_version"] == "openai-v1"


def test_gap_r7_recommend_route_passes_audit_context_to_orchestrator():
    contracts.cache_service.clear()
    token = _first_patient_token()
    mock_result = {
        "ai_recommended_tier": "Advanced",
        "tier_deviation_justification": None,
        "reasoning_trace": "trace",
        "add_ons": [],
        "supporting_signals": ["signal_1"],
        "missing_signals": [],
        "communication_script": {
            "health_summary": "summary",
            "recommendation_rationale": "rationale",
            "addon_highlights": [],
            "next_steps": "next",
        },
        "clinical_signals": {
            "rule_preliminary_tier": "Advanced",
            "applicable_signals": ["signal_1"],
            "signals_fired": ["signal_1"],
            "missing_signals": [],
            "risk_flags": [],
            "pipeline_run_id": "pipe_r7_ctx_001",
        },
        "recommendation_source": "AI",
        "review_required": False,
    }
    contracts.get_clinical_signals = lambda _patient_token, patient_id=None: {
        "pipeline_run_id": "pipe_r7_ctx_001",
        "signals_fired": ["signal_1"],
        "applicable_signals": ["signal_1"],
        "missing_signals": [],
        "risk_flags": [],
    }
    contracts.get_program_ruleset = lambda _patient_token, patient_id=None: {
        "ruleset_version": "v2026.03.1",
        "rule_preliminary_tier": "Advanced",
        "resolved_package": {},
        "add_on_library": [],
    }
    contracts.orchestrator.generate_recommendation = AsyncMock(return_value=mock_result)

    response = client.post("/api/recommend", json={"patient_token": token}, headers=_auth_headers(scopes="recommendation:read"))
    assert response.status_code == 200
    kwargs = contracts.orchestrator.generate_recommendation.await_args.kwargs
    assert "audit_context" in kwargs
    assert kwargs["audit_context"]["user_id"] == "usr-test-0001"
    assert kwargs["audit_context"]["user_role"] == "admin"
    assert kwargs["audit_context"]["action_type"] == "GenerateRecommendation"


def test_gap_r8_recommend_route_surfaces_resolved_metadata_from_orchestrator():
    contracts.cache_service.clear()
    token = _first_patient_token()
    mock_result = {
        "ai_recommended_tier": "Advanced",
        "tier_deviation_justification": None,
        "reasoning_trace": "trace",
        "add_ons": [],
        "supporting_signals": ["signal_1"],
        "missing_signals": [],
        "communication_script": {
            "health_summary": "summary",
            "recommendation_rationale": "rationale",
            "addon_highlights": [],
            "next_steps": "next",
        },
        "clinical_signals": {
            "rule_preliminary_tier": "Advanced",
            "applicable_signals": ["signal_1"],
            "signals_fired": ["signal_1"],
            "missing_signals": [],
            "risk_flags": [],
            "pipeline_run_id": "pipe_r8_meta_001",
        },
        "recommendation_source": "AI",
        "review_required": False,
        "metadata": {
            "active_client": "OpenAIClient",
            "model_id": "gpt-5.4-mini",
            "model_provider": "openai",
            "template_version": "openai-v1",
        },
    }
    contracts.get_clinical_signals = lambda _patient_token, patient_id=None: {
        "pipeline_run_id": "pipe_r8_meta_001",
        "signals_fired": ["signal_1"],
        "applicable_signals": ["signal_1"],
        "missing_signals": [],
        "risk_flags": [],
    }
    contracts.get_program_ruleset = lambda _patient_token, patient_id=None: {
        "ruleset_version": "v2026.03.1",
        "rule_preliminary_tier": "Advanced",
        "resolved_package": {},
        "add_on_library": [],
    }
    contracts.orchestrator.generate_recommendation = AsyncMock(return_value=mock_result)

    response = client.post("/api/recommend", json={"patient_token": token}, headers=_auth_headers(scopes="recommendation:read"))

    assert response.status_code == 200
    payload = response.json()
    assert payload["metadata"]["active_client"] == "OpenAIClient"
    assert payload["metadata"]["model_id"] == "gpt-5.4-mini"
    assert payload["metadata"]["model_provider"] == "openai"
    assert payload["metadata"]["template_version"] == "openai-v1"


def test_gap_r9_recommend_route_rule_based_retry_keeps_resolved_metadata():
    contracts.cache_service.clear()
    token = _first_patient_token()
    invalid_ai = {
        "ai_recommended_tier": "Advanced",
        "tier_deviation_justification": None,
        "reasoning_trace": "trace",
        "add_ons": [{"item_code": "UNKNOWN", "priority_level": "Yellow", "rationale": "bad"}],
        "supporting_signals": ["signal_1"],
        "missing_signals": [],
        "communication_script": {
            "health_summary": "summary",
            "recommendation_rationale": "rationale",
            "addon_highlights": [],
            "next_steps": "next",
        },
        "clinical_signals": {
            "rule_preliminary_tier": "Advanced",
            "applicable_signals": ["signal_1"],
            "signals_fired": ["signal_1"],
            "missing_signals": [],
            "risk_flags": [],
            "pipeline_run_id": "pipe_r9_meta_001",
        },
        "recommendation_source": "AI",
        "review_required": False,
    }
    fallback_rule_based = {
        "ai_recommended_tier": "Advanced",
        "tier_deviation_justification": "fallback",
        "reasoning_trace": "fallback trace",
        "add_ons": [],
        "supporting_signals": ["signal_1"],
        "missing_signals": [],
        "communication_script": {
            "health_summary": "summary",
            "recommendation_rationale": "rationale",
            "addon_highlights": [],
            "next_steps": "next",
        },
        "clinical_signals": {
            "rule_preliminary_tier": "Advanced",
            "applicable_signals": ["signal_1"],
            "signals_fired": ["signal_1"],
            "missing_signals": [],
            "risk_flags": [],
            "pipeline_run_id": "pipe_r9_meta_001",
        },
        "recommendation_source": "RuleBased",
        "review_required": True,
        "metadata": {
            "active_client": "AnthropicClient",
            "model_id": "claude-haiku-4-5",
            "model_provider": "anthropic",
            "template_version": "anthropic-v1",
        },
    }
    contracts.get_clinical_signals = lambda _patient_token, patient_id=None: {
        "pipeline_run_id": "pipe_r9_meta_001",
        "signals_fired": ["signal_1"],
        "applicable_signals": ["signal_1"],
        "missing_signals": [],
        "risk_flags": [],
    }
    contracts.get_program_ruleset = lambda _patient_token, patient_id=None: {
        "ruleset_version": "v2026.03.1",
        "rule_preliminary_tier": "Advanced",
        "resolved_package": {},
        "add_on_library": [],
    }
    contracts.orchestrator.generate_recommendation = AsyncMock(side_effect=[invalid_ai, fallback_rule_based])

    response = client.post("/api/recommend", json={"patient_token": token}, headers=_auth_headers(scopes="recommendation:read"))

    assert response.status_code == 200
    payload = response.json()
    assert payload["recommendation_source"] == "RuleBased"
    assert payload["metadata"]["active_client"] == "AnthropicClient"
    assert payload["metadata"]["model_id"] == "claude-haiku-4-5"
    assert payload["metadata"]["model_provider"] == "anthropic"
    assert payload["metadata"]["template_version"] == "anthropic-v1"


def test_gap_r10_system_config_uses_resolved_identity_without_fallback_chain():
    response = client.get("/api/system-config", headers=_auth_headers(scopes="monitoring:read"))

    assert response.status_code == 200
    payload = response.json()
    assert payload["active_client"] == "GeminiClient"
    assert payload["template_version"] == "gemini-v1"
    assert {item["name"] for item in payload["all_clients"]} == {
        "GeminiClient",
        "OpenAIClient",
        "AnthropicClient",
        "OpenRouterClient",
        "LocalHostedClient",
    }
    assert sum(1 for item in payload["all_clients"] if item["status"] == "active") == 1
