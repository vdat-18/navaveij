import json

from src.services.audit import AuditLogger
from shared.settings import settings


def test_gap_r7_audit_logger_writes_five_dimensions(tmp_path, monkeypatch):
    log_path = tmp_path / "audit.jsonl"
    monkeypatch.setattr(settings, "audit_log_path", str(log_path))

    logger = AuditLogger()
    logger.log_recommendation(
        patient_id="id_001",
        patient_token="tok_hmac_001",
        masked_context={"ctx": "masked"},
        ai_output={"ai_recommended_tier": "Advanced", "reasoning_trace": "masked trace"},
        model_id="gpt-test",
        user_id="usr-1",
        user_role="physician",
        client_ip="127.0.0.1",
        request_id="req-001",
        action_type="GenerateRecommendation",
        latency_ms=120,
    )

    lines = log_path.read_text(encoding="utf-8").strip().splitlines()
    payload = json.loads(lines[-1])

    assert payload["who"]["user_id"] == "usr-1"
    assert payload["who"]["user_role"] == "physician"
    assert payload["where"]["service_id"] == "recommendation-engine-api"
    assert payload["where"]["client_ip"] == "127.0.0.1"
    assert payload["what"]["latency_ms"] == 120
    assert payload["why"]["request_context"]["request_id"] == "req-001"
    assert payload["why"]["request_context"]["action_type"] == "GenerateRecommendation"
