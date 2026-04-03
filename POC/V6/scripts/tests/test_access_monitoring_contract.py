import hashlib
import json

import pytest
from fastapi.testclient import TestClient

from src.api.main import app
from src.api.routes import contracts

client = TestClient(app)


def _auth_headers(role: str = "sysadmin", scopes: str = "monitoring:read") -> dict[str, str]:
    return {
        "X-Auth-User-Id": "usr-test-0001",
        "X-Auth-Role": role,
        "X-Auth-Scopes": scopes,
    }


def _hash_from_entry(entry: dict) -> str:
    payload = {
        "prev_entry_hash": entry.get("prev_entry_hash"),
        "who": entry.get("who", {}),
        "when": entry.get("when", {}),
        "where": entry.get("where", {}),
        "what": entry.get("what", {}),
        "why": entry.get("why", {}),
        "retention_expiry": entry.get("retention_expiry"),
    }
    payload_json = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload_json.encode("utf-8")).hexdigest()


def test_screen3_endpoints_allow_sysadmin_and_executive_roles():
    admin_headers = _auth_headers(role="sysadmin")
    dpo_headers = _auth_headers(role="executive")
    for endpoint in [
        "/api/monitoring-snapshot",
        "/api/anomaly-alerts",
        "/api/audit-logs",
        "/api/rbac",
        "/api/mapping-codes",
        "/api/master-programs",
    ]:
        assert client.get(endpoint, headers=admin_headers).status_code == 200
        assert client.get(endpoint, headers=dpo_headers).status_code == 200


def test_screen3_endpoints_reject_non_admin_roles():
    headers = _auth_headers(role="sales")
    response = client.get("/api/monitoring-snapshot", headers=headers)
    assert response.status_code == 403


def test_screen3_endpoints_reject_missing_auth_context():
    response = client.get("/api/monitoring-snapshot")
    assert response.status_code == 401


def test_screen3_endpoints_reject_missing_scope():
    response = client.get("/api/monitoring-snapshot", headers=_auth_headers(role="sysadmin", scopes="recommendation:read"))
    assert response.status_code == 403


def test_audit_entry_hash_matches_recomputed_value():
    response = client.get("/api/audit-logs", headers=_auth_headers(role="sysadmin"))
    assert response.status_code == 200
    payload = response.json()
    assert "entries" in payload
    assert len(payload["entries"]) > 0
    entry = payload["entries"][0]
    recomputed = _hash_from_entry(entry)
    assert recomputed == entry["sha256_hash"]


def test_admin_alias_routes_exist():
    headers = _auth_headers(role="sysadmin")
    assert client.get("/api/admin/monitoring/snapshot", headers=headers).status_code == 200
    assert client.get("/api/admin/audit-logs/search", headers=headers).status_code == 200
    assert client.get("/api/admin/anomaly-alerts", headers=headers).status_code == 200
    assert client.get("/api/admin/rbac", headers=headers).status_code == 200
    assert client.get("/api/admin/mapping-codes", headers=headers).status_code == 200
    assert client.get("/api/admin/master-programs", headers=headers).status_code == 200


def test_mapping_codes_include_core_terminology_systems():
    response = client.get("/api/mapping-codes", headers=_auth_headers(role="sysadmin"))
    assert response.status_code == 200
    payload = response.json()
    systems = {entry["target_system"] for entry in payload["mappings"]}
    assert "LOINC" in systems
    assert "SNOMED_CT" in systems
    assert "ICD10" in systems
    assert "CPT" in systems


@pytest.mark.usefixtures("monkeypatch")
def test_audit_logs_preserve_llm_request_runtime_identity(monkeypatch):
    raw_entry = {
        "timestamp": "2026-03-30T08:00:00+00:00",
        "who": {"user_id": "usr-test-0001", "user_role": "sysadmin"},
        "where": {
            "service_id": "recommendation-engine-api",
            "client_ip": "sha256_client_ip",
            "request_id": "req-scope3-001",
        },
        "what": {
            "event": "LLM_REQUEST",
            "function_name": "AnalyzeClinicalRisks",
            "active_client": "OpenAIClient",
            "model_id": "gpt-5.4-mini",
            "template_version": "openai-v1",
            "prompt_template_key": "analyze_clinical_risks",
            "latency_ms": 17,
            "input_trace_masked": {
                "system_prompt": "prompt::analyze",
                "clinical_signals": {"signals_fired": ["bp_elevated"]},
            },
            "output_trace_masked": {
                "severity_assessment": "Moderate risk requiring monitoring.",
            },
        },
        "how": {
            "model_provider": "openai",
            "model_id": "gpt-5.4-mini",
        },
        "why": {
            "patient_id": "id_scope3_001",
            "request_context": {
                "action_type": "LLMRequest",
                "request_id": "req-scope3-001",
            },
        },
    }
    monkeypatch.setattr(contracts, "_read_audit_logs", lambda: [raw_entry])

    response = client.get("/api/audit-logs", headers=_auth_headers(role="sysadmin"))

    assert response.status_code == 200
    payload = response.json()
    entry = payload["entries"][0]
    assert entry["what"]["action_type"] == "LLMRequest"
    assert entry["what"]["active_client"] == "OpenAIClient"
    assert entry["what"]["model_provider"] == "openai"
    assert entry["what"]["model_id"] == "gpt-5.4-mini"
    assert entry["what"]["template_version"] == "openai-v1"
    assert entry["what"]["function_name"] == "AnalyzeClinicalRisks"
    assert entry["what"]["prompt_template_key"] == "analyze_clinical_risks"
    assert entry["what"]["input_trace_masked"] == {
        "system_prompt": "prompt::analyze",
        "clinical_signals": {"signals_fired": ["bp_elevated"]},
    }
    assert entry["what"]["output_trace_masked"] == {
        "severity_assessment": "Moderate risk requiring monitoring.",
    }


def test_system_config_contract_exposes_only_resolved_client_registry():
    response = client.get("/api/system-config", headers=_auth_headers(role="sysadmin"))

    assert response.status_code == 200
    payload = response.json()
    assert payload["active_client"] == "GeminiClient"
    assert payload["template_version"] == "gemini-v1"
    assert {client_info["name"] for client_info in payload["all_clients"]} == {
        "GeminiClient",
        "OpenAIClient",
        "AnthropicClient",
        "OpenRouterClient",
        "LocalHostedClient",
    }
