from src.services.prompt_selector import _PROMPTS_DIR, prompt_selector


def test_prompt_selector_uses_v6_local_prompt_directory():
    assert _PROMPTS_DIR.exists()
    assert _PROMPTS_DIR.name == "prompts"
    assert _PROMPTS_DIR.parent.name == "baml_src"
    assert _PROMPTS_DIR.parent.parent.name == "V6"


def test_prompt_selector_loads_current_client_template():
    assert prompt_selector.version
    assert isinstance(prompt_selector.version, str)
