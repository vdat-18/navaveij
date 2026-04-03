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


# In-memory override — set via PATCH /system-config/active-client, resets on server restart.
_runtime_active_client: str | None = None

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
_SUPPORTED_CLIENT_NAMES: tuple[str, ...] = tuple(_ACTIVE_CLIENTS.keys())


def set_runtime_active_client(client_name: str) -> None:
    """Override the active client in-memory (no .env write, resets on server restart)."""
    global _runtime_active_client
    if client_name not in _ACTIVE_CLIENTS:
        valid = " | ".join(_ACTIVE_CLIENTS)
        raise ValueError(f"Unsupported client '{client_name}'. Expected one of: {valid}")
    _runtime_active_client = client_name


def resolve_active_client(active_client: str | None = None) -> ResolvedActiveClient:
    """Return the validated runtime client identity for clinical inference."""
    candidate = active_client or _runtime_active_client or settings.ai_active_client
    try:
        return _ACTIVE_CLIENTS[candidate]
    except KeyError as exc:
        valid = " | ".join(_ACTIVE_CLIENTS)
        raise ValueError(
            f"Unsupported AI_ACTIVE_CLIENT '{candidate}'. Expected one of: {valid}"
        ) from exc


def get_supported_client_names() -> list[str]:
    """Return the configured named client identifiers in stable order."""
    return list(_SUPPORTED_CLIENT_NAMES)
