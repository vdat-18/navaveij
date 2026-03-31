import json
from pathlib import Path

from src.mcp_server.utils import resolve_package


def _package_map() -> dict:
    package_path = (
        Path(__file__).resolve().parents[2]
        / "assets"
        / "synthesis"
        / "rulesets"
        / "sample_package_resolution.json"
    )
    return json.loads(package_path.read_text(encoding="utf-8"))


def test_standard_male_age_25_resolves_to_gold():
    resolved = resolve_package("Standard", "male", 25, _package_map())
    assert resolved is not None
    assert resolved["package_code"] == "GOLD_ANY"


def test_standard_male_age_38_resolves_to_platinum_men():
    resolved = resolve_package("Standard", "male", 38, _package_map())
    assert resolved is not None
    assert resolved["package_code"] == "PLAT_M"


def test_standard_female_age_25_resolves_to_gold():
    resolved = resolve_package("Standard", "female", 25, _package_map())
    assert resolved is not None
    assert resolved["package_code"] == "GOLD_ANY"


def test_standard_female_age_38_resolves_to_platinum_women():
    resolved = resolve_package("Standard", "female", 38, _package_map())
    assert resolved is not None
    assert resolved["package_code"] == "PLAT_F"


def test_advanced_and_premium_age_any_paths_still_resolve():
    advanced = resolve_package("Advanced", "female", 50, _package_map())
    premium = resolve_package("Premium", "male", 60, _package_map())

    assert advanced is not None
    assert premium is not None
    assert advanced["package_code"] == "PLAT_F"
    assert premium["package_code"] == "DIAM_M"
