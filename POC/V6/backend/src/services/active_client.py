"""Active-client resolution for the clinical LLM stack."""

from dataclasses import dataclass

from shared.settings import settings


@dataclass(frozen=True)
class ResolvedActiveClient:
    """Validated runtime identity for the selected clinical client."""

    client_name: str
    provider: str
    model_id: str
    prompt_registry_key: str


_ACTIVE_CLIENTS: dict[str, ResolvedActiveClient] = {
    "GeminiClient": ResolvedActiveClient(
        client_name="GeminiClient",
        provider="google-ai",
        model_id=settings.gemini_model,
        prompt_registry_key="gemini",
    ),
    "OpenAIClient": ResolvedActiveClient(
        client_name="OpenAIClient",
        provider="openai",
        model_id=settings.openai_model,
        prompt_registry_key="openai",
    ),
    "AnthropicClient": ResolvedActiveClient(
        client_name="AnthropicClient",
        provider="anthropic",
        model_id=settings.anthropic_model,
        prompt_registry_key="anthropic",
    ),
    "OpenRouterClient": ResolvedActiveClient(
        client_name="OpenRouterClient",
        provider="openai-generic",
        model_id=settings.openrouter_model,
        prompt_registry_key="openrouter",
    ),
    "LocalHostedClient": ResolvedActiveClient(
        client_name="LocalHostedClient",
        provider="openai-generic",
        model_id=settings.localhosted_model,
        prompt_registry_key="local",
    ),
}


def resolve_active_client(active_client: str | None = None) -> ResolvedActiveClient:
    """Return the validated runtime client identity for clinical inference."""
    candidate = active_client or settings.ai_active_client
    try:
        return _ACTIVE_CLIENTS[candidate]
    except KeyError as exc:
        valid = " | ".join(_ACTIVE_CLIENTS)
        raise ValueError(
            f"Unsupported AI_ACTIVE_CLIENT '{candidate}'. Expected one of: {valid}"
        ) from exc
