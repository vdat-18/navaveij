import asyncio
import json
from types import SimpleNamespace

from fastapi.testclient import TestClient

from src.api.main import app
from src.api.routes import contracts
from src.services import active_client, health_check

client = TestClient(app)


def _auth_headers(
    role: str = "sysadmin",
    scopes: str = "recommendation:read,recommendation:write,monitoring:read",
) -> dict[str, str]:
    return {
        "X-Auth-User-Id": "usr-sysadmin-00001",
        "X-Auth-Role": role,
        "X-Auth-Scopes": scopes,
    }


def test_run_health_check_returns_structured_error_for_unknown_client():
    result = asyncio.run(health_check.run_health_check("UnknownClient"))

    assert result == {
        "client_name": "UnknownClient",
        "status": "error",
        "provider": None,
        "model_id": None,
        "template_version": None,
        "latency_ms": None,
        "error_message": "Unsupported client 'UnknownClient'. Expected one of: GeminiClient | OpenAIClient | AnthropicClient | OpenRouterClient | LocalHostedClient",
    }


def test_run_health_check_returns_structured_error_for_malformed_child_output(monkeypatch):
    async def _fake_exec(*_args, **_kwargs):
        class _Process:
            returncode = 0

            async def communicate(self):
                return (b"not-json\n", b"")

        return _Process()

    monkeypatch.setattr(health_check.asyncio, "create_subprocess_exec", _fake_exec)

    result = asyncio.run(health_check.run_health_check("GeminiClient"))

    assert result["client_name"] == "GeminiClient"
    assert result["status"] == "error"
    assert result["error_message"] == "health check subprocess did not return structured output"


def test_run_health_check_does_not_mutate_parent_runtime_active_client(monkeypatch):
    async def _fake_exec(*_args, **_kwargs):
        payload = {
            "client_name": "OpenAIClient",
            "status": "ok",
            "provider": "openai",
            "model_id": "gpt-5.4-mini",
            "template_version": "openai-v1",
            "latency_ms": 12,
            "error_message": None,
        }

        class _Process:
            returncode = 0

            async def communicate(self):
                return (json.dumps(payload).encode("utf-8") + b"\n", b"")

        return _Process()

    active_client.set_runtime_active_client("GeminiClient")
    monkeypatch.setattr(health_check.asyncio, "create_subprocess_exec", _fake_exec)

    result = asyncio.run(health_check.run_health_check("OpenAIClient"))

    assert result["status"] == "ok"
    assert active_client.resolve_active_client().client_name == "GeminiClient"
    active_client._runtime_active_client = None


def test_system_config_health_check_endpoint_returns_service_payload(monkeypatch):
    async def _fake_health_check(client_name: str):
        assert client_name == "OpenAIClient"
        return {
            "client_name": client_name,
            "status": "ok",
            "provider": "openai",
            "model_id": "gpt-5.4-mini",
            "template_version": "openai-v1",
            "latency_ms": 18,
            "error_message": None,
        }

    monkeypatch.setattr(contracts, "run_health_check", _fake_health_check)

    response = client.post(
        "/api/system-config/health-check",
        json={"client_name": "OpenAIClient"},
        headers=_auth_headers(),
    )

    assert response.status_code == 200
    assert response.json() == {
        "client_name": "OpenAIClient",
        "status": "ok",
        "provider": "openai",
        "model_id": "gpt-5.4-mini",
        "template_version": "openai-v1",
        "latency_ms": 18,
        "error_message": None,
    }


def test_system_config_health_check_endpoint_rejects_missing_monitoring_scope():
    response = client.post(
        "/api/system-config/health-check",
        json={"client_name": "OpenAIClient"},
        headers=_auth_headers(scopes="recommendation:read"),
    )

    assert response.status_code == 403

