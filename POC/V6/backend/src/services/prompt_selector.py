"""Prompt Template Selector — loads the per-model YAML template file at startup."""

from datetime import datetime, timezone
from pathlib import Path

import yaml

from src.services.active_client import ResolvedActiveClient, resolve_active_client

_PROMPTS_DIR = Path(__file__).parents[3] / "baml_src" / "prompts"
_runtime_prompt_overrides: dict[str, dict[str, str]] = {}


def _load_prompt_registry(registry_key: str) -> dict[str, str]:
    template_path = _PROMPTS_DIR / f"{registry_key}.yaml"
    with template_path.open(encoding="utf-8") as handle:
        return yaml.safe_load(handle) or {}


def _base_version(registry_key: str) -> str:
    return _load_prompt_registry(registry_key).get("version", f"{registry_key}-v1")


def set_runtime_prompt_override(registry_key: str, template_key: str, text: str) -> None:
    """Store one runtime prompt override and auto-stamp the runtime version."""
    overrides = _runtime_prompt_overrides.setdefault(registry_key, {})
    overrides[template_key] = text
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    overrides["version"] = f"{_base_version(registry_key)}+runtime-{timestamp}"


def set_runtime_prompt_version(registry_key: str, version: str) -> None:
    """Store an explicit runtime version override."""
    _runtime_prompt_overrides.setdefault(registry_key, {})["version"] = version


def reset_runtime_prompt_overrides(registry_key: str) -> None:
    """Clear all runtime overrides for a registry key."""
    _runtime_prompt_overrides.pop(registry_key, None)


class PromptTemplateSelector:
    """Singleton that loads model-specific prompt templates from YAML at startup."""

    def __init__(self, resolved_client: ResolvedActiveClient) -> None:
        self.client_name = resolved_client.client_name
        self.provider = resolved_client.provider
        self.model_id = resolved_client.model_id
        data = _load_prompt_registry(resolved_client.prompt_registry_key)
        self._templates: dict[str, str] = data
        self.version: str = data.get("version", f"{resolved_client.prompt_registry_key}-v1")
        overrides = _runtime_prompt_overrides.get(resolved_client.prompt_registry_key, {})
        for key, value in overrides.items():
            if key == "version":
                self.version = value
            else:
                self._templates[key] = value

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
