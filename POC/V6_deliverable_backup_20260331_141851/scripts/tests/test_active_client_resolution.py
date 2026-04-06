import pytest

from src.services.active_client import resolve_active_client
from shared.settings import settings


@pytest.mark.parametrize(
    ("client_name", "provider", "model_id", "prompt_registry_key"),
    [
        ("OpenAIClient", "openai", "gpt-5.4-mini", "openai"),
        ("AnthropicClient", "anthropic", "claude-haiku-4-5", "anthropic"),
        ("OpenRouterClient", "openai-generic", "openai/gpt-oss-120b", "openrouter"),
        ("LocalHostedClient", "openai-generic", "llama-3.3-70b-instruct", "local"),
    ],
)
def test_resolve_active_client_returns_expected_mapping(
    client_name: str,
    provider: str,
    model_id: str,
    prompt_registry_key: str,
):
    resolved = resolve_active_client(client_name)

    assert resolved.client_name == client_name
    assert resolved.provider == provider
    assert resolved.model_id == model_id
    assert resolved.prompt_registry_key == prompt_registry_key


def test_resolve_active_client_uses_google_ai_provider_for_gemini():
    resolved = resolve_active_client("GeminiClient")

    assert resolved.client_name == "GeminiClient"
    assert resolved.provider == "google-ai"
    assert getattr(settings, "gemini_model", None) is not None
    assert resolved.model_id == settings.gemini_model
    assert resolved.prompt_registry_key == "gemini"


def test_resolve_active_client_rejects_invalid_name():
    with pytest.raises(ValueError, match="Unsupported AI_ACTIVE_CLIENT"):
        resolve_active_client("claude-haiku-4.5")
