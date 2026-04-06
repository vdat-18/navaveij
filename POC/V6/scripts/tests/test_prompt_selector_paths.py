import pytest

from src.services.active_client import resolve_active_client
from src.services.prompt_selector import (
    _PROMPTS_DIR,
    PromptTemplateSelector,
    reset_runtime_prompt_overrides,
    set_runtime_prompt_override,
    set_runtime_prompt_version,
)


def test_prompt_selector_uses_v6_local_prompt_directory():
    assert _PROMPTS_DIR.exists()
    assert _PROMPTS_DIR.name == "prompts"
    assert _PROMPTS_DIR.parent.name == "baml_src"
    assert _PROMPTS_DIR.parent.parent.name == "V6"


def test_prompt_selector_loads_template_for_resolved_client():
    resolved = resolve_active_client("OpenAIClient")
    selector = PromptTemplateSelector(resolved)

    assert selector.version == "openai-v1"
    assert selector.get("analyze_clinical_risks")


def test_prompt_selector_rejects_invalid_active_client():
    with pytest.raises(ValueError, match="Unsupported AI_ACTIVE_CLIENT"):
        resolve_active_client("claude-haiku-4.5")


def test_prompt_selector_layers_runtime_template_override():
    resolved = resolve_active_client("OpenAIClient")
    reset_runtime_prompt_overrides(resolved.prompt_registry_key)

    try:
        set_runtime_prompt_override(
            resolved.prompt_registry_key,
            "analyze_clinical_risks",
            "runtime prompt body",
        )

        selector = PromptTemplateSelector(resolved)

        assert selector.get("analyze_clinical_risks") == "runtime prompt body"
        assert selector.version.startswith("openai-v1+runtime-")
    finally:
        reset_runtime_prompt_overrides(resolved.prompt_registry_key)


def test_prompt_selector_uses_explicit_runtime_version_override():
    resolved = resolve_active_client("OpenAIClient")
    reset_runtime_prompt_overrides(resolved.prompt_registry_key)

    try:
        set_runtime_prompt_version(resolved.prompt_registry_key, "demo-edit-v3")

        selector = PromptTemplateSelector(resolved)

        assert selector.version == "demo-edit-v3"
    finally:
        reset_runtime_prompt_overrides(resolved.prompt_registry_key)


def test_prompt_selector_reset_restores_yaml_defaults():
    resolved = resolve_active_client("OpenAIClient")
    reset_runtime_prompt_overrides(resolved.prompt_registry_key)

    try:
        baseline = PromptTemplateSelector(resolved)
        original_prompt = baseline.get("analyze_clinical_risks")

        set_runtime_prompt_override(
            resolved.prompt_registry_key,
            "analyze_clinical_risks",
            "runtime prompt body",
        )
        reset_runtime_prompt_overrides(resolved.prompt_registry_key)

        restored = PromptTemplateSelector(resolved)

        assert restored.version == "openai-v1"
        assert restored.get("analyze_clinical_risks") == original_prompt
    finally:
        reset_runtime_prompt_overrides(resolved.prompt_registry_key)
