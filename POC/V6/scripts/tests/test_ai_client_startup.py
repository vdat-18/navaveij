from types import SimpleNamespace

import pytest

from src.api import main


def test_warm_configured_ai_clients_initializes_every_supported_client(monkeypatch):
    client_names = ["GeminiClient", "OpenAIClient", "AnthropicClient"]
    resolved_calls: list[str] = []
    selector_calls: list[str] = []
    handle_calls: list[str] = []

    monkeypatch.setattr(main, "get_supported_client_names", lambda: client_names)
    monkeypatch.setattr(
        main,
        "resolve_active_client",
        lambda client_name=None: resolved_calls.append(client_name) or SimpleNamespace(client_name=client_name),
    )
    monkeypatch.setattr(
        main,
        "get_prompt_selector",
        lambda client_name: selector_calls.append(client_name) or SimpleNamespace(version=f"{client_name}-v1"),
    )
    monkeypatch.setattr(main, "_initialize_client_handle", lambda client_name: handle_calls.append(client_name))

    main._warm_configured_ai_clients()

    assert resolved_calls == client_names
    assert selector_calls == client_names
    assert handle_calls == client_names


def test_warm_configured_ai_clients_logs_and_continues_for_non_active_failures(monkeypatch):
    warnings: list[str] = []
    client_names = ["GeminiClient", "OpenAIClient"]

    monkeypatch.setattr(main, "get_supported_client_names", lambda: client_names)
    monkeypatch.setattr(main, "resolve_active_client", lambda client_name=None: SimpleNamespace(client_name=client_name))
    monkeypatch.setattr(main, "get_prompt_selector", lambda client_name: SimpleNamespace(version=f"{client_name}-v1"))
    monkeypatch.setattr(main.settings, "ai_active_client", "GeminiClient")
    monkeypatch.setattr(
        main,
        "_initialize_client_handle",
        lambda client_name: (_ for _ in ()).throw(RuntimeError("OpenAI failed")) if client_name == "OpenAIClient" else None,
    )
    monkeypatch.setattr(main.logger, "warning", lambda message: warnings.append(message))

    main._warm_configured_ai_clients()

    assert any("OpenAIClient" in message for message in warnings)


def test_warm_configured_ai_clients_raises_for_initial_active_client_failure(monkeypatch):
    monkeypatch.setattr(main, "get_supported_client_names", lambda: ["GeminiClient", "OpenAIClient"])
    monkeypatch.setattr(main, "resolve_active_client", lambda client_name=None: SimpleNamespace(client_name=client_name))
    monkeypatch.setattr(main, "get_prompt_selector", lambda client_name: SimpleNamespace(version=f"{client_name}-v1"))
    monkeypatch.setattr(main.settings, "ai_active_client", "GeminiClient")
    monkeypatch.setattr(
        main,
        "_initialize_client_handle",
        lambda client_name: (_ for _ in ()).throw(RuntimeError("Gemini failed")) if client_name == "GeminiClient" else None,
    )

    with pytest.raises(RuntimeError, match="Gemini failed"):
        main._warm_configured_ai_clients()


def test_log_system_config_contract_routes_lists_health_check_path(monkeypatch):
    messages: list[str] = []

    class _Route:
        def __init__(self, path: str, methods: set[str]):
            self.path = path
            self.methods = methods

    fake_app = SimpleNamespace(
        routes=[
            _Route("/health", {"GET"}),
            _Route("/api/system-config", {"GET"}),
            _Route("/api/system-config/active-client", {"PATCH"}),
            _Route("/api/system-config/health-check", {"POST"}),
        ]
    )

    monkeypatch.setattr(main.logger, "info", lambda message: messages.append(message))

    main._log_system_config_contract_routes(fake_app)

    assert any("/api/system-config/health-check [POST]" in message for message in messages)
