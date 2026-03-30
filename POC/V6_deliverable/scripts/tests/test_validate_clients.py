import importlib.util
import json
import sys
from pathlib import Path
from types import SimpleNamespace


MODULE_PATH = Path(__file__).resolve().parents[1] / "validate_clients.py"
SPEC = importlib.util.spec_from_file_location("validate_clients_under_test", MODULE_PATH)
validate_clients = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules.setdefault("validate_clients_under_test", validate_clients)
SPEC.loader.exec_module(validate_clients)


def test_client_model_labels_use_provider_native_env_keys(monkeypatch):
    monkeypatch.setenv("GEMINI_MODEL", "gemini-2.5-flash")
    monkeypatch.setenv("OPENAI_MODEL", "gpt-5.4-mini")
    monkeypatch.setenv("ANTHROPIC_MODEL", "claude-haiku-4-5")
    monkeypatch.setenv("OPENROUTER_MODEL", "openai/gpt-oss-120b")
    monkeypatch.setenv("LOCALHOSTED_MODEL", "llama-3.3-70b-instruct")

    assert validate_clients._client_model_labels() == {
        "GeminiClient": "gemini-2.5-flash",
        "OpenAIClient": "gpt-5.4-mini",
        "AnthropicClient": "claude-haiku-4-5",
        "OpenRouterClient": "openai/gpt-oss-120b",
        "LocalHostedClient": "llama-3.3-70b-instruct",
    }


def test_run_parent_spawns_each_named_client(monkeypatch, capsys):
    calls: list[list[str]] = []

    def _fake_run(command, **_kwargs):
        calls.append(command)
        payload = {
            "client": command[-1],
            "ok": True,
            "provider": "openai",
            "model_id": "model-x",
            "template_version": "template-x",
            "latency_ms": 12,
        }
        return SimpleNamespace(returncode=0, stdout=json.dumps(payload) + "\n", stderr="")

    monkeypatch.setattr(validate_clients.subprocess, "run", _fake_run)

    assert validate_clients._run_parent() == 0

    assert [command[-1] for command in calls] == validate_clients._CLIENTS
    output = capsys.readouterr().out
    assert "GeminiClient" in output
    assert "LocalHostedClient" in output
    assert "All clients validated successfully." in output


def test_run_parent_treats_malformed_child_output_as_failure(monkeypatch, capsys):
    def _fake_run(_command, **_kwargs):
        return SimpleNamespace(returncode=0, stdout="not-json\n", stderr="")

    monkeypatch.setattr(validate_clients.subprocess, "run", _fake_run)

    assert validate_clients._run_parent() == 1
    output = capsys.readouterr().out
    assert "validation subprocess did not return structured output" in output


def test_run_parent_returns_nonzero_when_child_fails(monkeypatch, capsys):
    def _fake_run(command, **_kwargs):
        payload = {"client": command[-1], "ok": False, "error": "provider down"}
        return SimpleNamespace(returncode=1, stdout=json.dumps(payload) + "\n", stderr="")

    monkeypatch.setattr(validate_clients.subprocess, "run", _fake_run)

    assert validate_clients._run_parent() == 1
    output = capsys.readouterr().out
    assert "provider down" in output


def test_run_child_emits_structured_error_payload(monkeypatch, capsys):
    async def _raise(*_args, **_kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr(validate_clients, "_run_child_validation", _raise)

    assert validate_clients._run_child("GeminiClient") == 1
    payload = json.loads(capsys.readouterr().out.strip())
    assert payload == {"client": "GeminiClient", "ok": False, "error": "boom"}


def test_run_child_validation_returns_structured_identity_payload(monkeypatch):
    async def _fake_analyze(**_kwargs):
        return None

    class _FakeBaml:
        AnalyzeClinicalRisks = staticmethod(_fake_analyze)

    monkeypatch.setitem(sys.modules, "baml_client.async_client", SimpleNamespace(b=_FakeBaml()))
    monkeypatch.setenv("AI_ACTIVE_CLIENT", "GeminiClient")
    monkeypatch.setattr(
        validate_clients,
        "time",
        SimpleNamespace(monotonic=lambda: 100.0),
    )
    monkeypatch.setitem(
        sys.modules,
        "src.services.active_client",
        SimpleNamespace(
            resolve_active_client=lambda client_name: SimpleNamespace(
                client_name=client_name,
                provider="google-ai",
                model_id="gemini-3-flash-preview",
            )
        ),
    )
    monkeypatch.setitem(
        sys.modules,
        "src.services.prompt_selector",
        SimpleNamespace(get_prompt_selector=lambda _client_name: SimpleNamespace(version="gemini-v1")),
    )

    payload = validate_clients.asyncio.run(validate_clients._run_child_validation("GeminiClient"))

    assert payload["client"] == "GeminiClient"
    assert payload["ok"] is True
    assert payload["provider"] == "google-ai"
    assert payload["model_id"] == "gemini-3-flash-preview"
    assert payload["template_version"] == "gemini-v1"
