import pytest

from src.services.active_client import resolve_active_client
from src.services.prompt_selector import _PROMPTS_DIR, PromptTemplateSelector


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
