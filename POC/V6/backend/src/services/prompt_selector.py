"""Prompt Template Selector — loads the per-model YAML template file at startup."""

import yaml
from pathlib import Path

from shared.settings import settings

_CLIENT_TO_FILE: dict[str, str] = {
    "GeminiClient":      "gemini",
    "OpenAIClient":      "openai",
    "AnthropicClient":   "anthropic",
    "OpenRouterClient":  "openrouter",
    "LocalHostedClient": "local",
}

_PROMPTS_DIR = Path(__file__).parents[3] / "baml_src" / "prompts"


class PromptTemplateSelector:
    """Singleton that loads model-specific prompt templates from YAML at startup."""

    def __init__(self) -> None:
        model_key = _CLIENT_TO_FILE.get(settings.ai_active_client, "gemini")
        template_path = _PROMPTS_DIR / f"{model_key}.yaml"
        with template_path.open() as f:
            data = yaml.safe_load(f)
        self._templates: dict[str, str] = data
        self.version: str = data.get("version", f"{model_key}-v1")

    def get(self, fn_name: str) -> str:
        """Return the system prompt string for the given BAML function name."""
        if fn_name not in self._templates:
            raise KeyError(f"No prompt template found for function '{fn_name}' in model registry")
        return self._templates[fn_name]


# Module-level singleton — instantiated once when the module is first imported.
prompt_selector = PromptTemplateSelector()
