import json
from pathlib import Path

from src.mcp_server.tools.program_ruleset import get_program_ruleset
from src.mcp_server.utils import (
    PACKAGE_RESOLUTION_PATH,
    RULESET_TIER_CONFIG_PATH,
    load_package_resolution_map,
    load_ruleset_add_on_items,
    load_ruleset_tier_config,
)

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def _first_patient_token() -> str:
    registry_path = PROJECT_ROOT / "assets/patient_registry.json"
    registry = json.loads(registry_path.read_text(encoding="utf-8"))
    return registry[0]["patient_token"]


def test_ruleset_paths_resolve_to_v6_local_assets():
    expected_dir = (PROJECT_ROOT / "assets/synthesis/rulesets").resolve()

    assert RULESET_TIER_CONFIG_PATH.parent.resolve() == expected_dir
    assert PACKAGE_RESOLUTION_PATH.parent.resolve() == expected_dir
    assert RULESET_TIER_CONFIG_PATH.exists()
    assert PACKAGE_RESOLUTION_PATH.exists()


def test_ruleset_sources_load_from_available_paths():
    tier_config = load_ruleset_tier_config()
    add_ons = load_ruleset_add_on_items()
    package_map = load_package_resolution_map()
    assert len(tier_config.get("tier_selection_rules", [])) > 0
    assert len(add_ons) > 0
    assert len(package_map) > 0


def test_program_ruleset_includes_loaded_reference_data():
    payload = get_program_ruleset(_first_patient_token())
    assert len(payload.get("tier_selection_rules", [])) > 0
    assert len(payload.get("package_resolution_map", {})) > 0
    assert payload.get("resolved_package", {}).get("package_code")
