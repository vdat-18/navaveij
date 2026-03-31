"""Prompt Template Selector — loads the per-model YAML template file at startup."""

import yaml
from pathlib import Path

from src.services.active_client import ResolvedActiveClient, resolve_active_client

_PROMPTS_DIR = Path(__file__).parents[3] / "baml_src" / "prompts"


class PromptTemplateSelector:
    """Singleton that loads model-specific prompt templates from YAML at startup."""

    def __init__(self, resolved_client: ResolvedActiveClient) -> None:
        self.client_name = resolved_client.client_name
        self.provider = resolved_client.provider
        self.model_id = resolved_client.model_id
        template_path = _PROMPTS_DIR / f"{resolved_client.prompt_registry_key}.yaml"
        with template_path.open() as f:
            data = yaml.safe_load(f)
        self._templates: dict[str, str] = data
        self.version: str = data.get("version", f"{resolved_client.prompt_registry_key}-v1")

    def get(self, fn_name: str) -> str:
        """Return the system prompt string for the given BAML function name."""
        if fn_name not in self._templates:
            raise KeyError(f"No prompt template found for function '{fn_name}' in model registry")
        return self._templates[fn_name]


def get_prompt_selector(active_client: str | None = None) -> PromptTemplateSelector:
    """Build a selector for the requested or configured active client."""
    return PromptTemplateSelector(resolve_active_client(active_client))


# Module-level singleton — validated on import and shared across the app runtime.
prompt_selector = get_prompt_selector()
