import json
from pathlib import Path
from unittest.mock import AsyncMock

from fastapi.testclient import TestClient

from src.api.main import app
from src.api.routes import contracts

client = TestClient(app)


def _first_patient_token() -> str:
    registry = json.loads(Path("assets/patient_registry.json").read_text(encoding="utf-8"))
    return registry[0]["patient_token"]


def _headers(role: str, scopes: str) -> dict[str, str]:
    return {
        "X-Auth-User-Id": "usr-test-0001",
        "X-Auth-Role": role,
        "X-Auth-Scopes": scopes,
    }


def test_monitoring_requires_auth_context():
    response = client.get("/api/monitoring-snapshot")
    assert response.status_code == 401


def test_recommendation_requires_auth_context():
    token = _first_patient_token()
    response = client.post("/api/recommend", json={"patient_token": token})
    assert response.status_code == 401


def test_monitoring_rejects_invalid_role():
    response = client.get(
        "/api/monitoring-snapshot",
        headers=_headers(role="physician", scopes="monitoring:read"),
    )
    assert response.status_code == 403


def test_monitoring_rejects_missing_scope():
    response = client.get(
        "/api/monitoring-snapshot",
        headers=_headers(role="sysadmin", scopes="recommendation:read"),
    )
    assert response.status_code == 403


def test_monitoring_allows_executive_with_scope():
    response = client.get(
        "/api/monitoring-snapshot",
        headers=_headers(role="executive", scopes="monitoring:read"),
    )
    assert response.status_code == 200


def test_recommendation_allows_physician_with_scope():
    token = _first_patient_token()
    contracts.orchestrator.generate_recommendation = AsyncMock(
        return_value={
            "ai_recommended_tier": "Advanced",
            "tier_deviation_justification": None,
            "reasoning_trace": "RBAC smoke test",
            "add_ons": [],
            "supporting_signals": [],
            "missing_signals": [],
            "communication_script": {
                "clinical_conclusion": "Clinical summary.",
                "health_summary": "Health summary.",
                "recommendation_explanation": "Recommendation explanation.",
                "add_on_highlights": [],
                "next_steps": "Next steps.",
            },
            "clinical_signals": {
                "rule_preliminary_tier": "Advanced",
                "applicable_signals": [],
                "signals_fired": [],
                "missing_signals": [],
                "risk_flags": [],
                "pipeline_run_id": "pipe_rbac_001",
            },
            "recommendation_source": "AI",
            "review_required": False,
            "security_metadata": {
                "rehydration_map": {},
                "masked_ai_output": {},
                "is_poc_demo": True,
            },
        }
    )
    response = client.post(
        "/api/recommend",
        json={"patient_token": token},
        headers=_headers(role="physician", scopes="recommendation:read"),
    )
    assert response.status_code == 200
