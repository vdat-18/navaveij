from src.api.routes.patients import load_registry
from src.api.routes import contracts
from src.mcp_server.utils import (
    load_package_resolution_map,
    load_ruleset_add_on_items,
    load_ruleset_tier_config,
    load_signal_store_record,
    resolve_patient_token,
)
from src.services.cache import TTLCacheService


def test_ttl_cache_service_get_set_cycle():
    cache = TTLCacheService()
    cache.set("k1", {"v": 1}, ttl_seconds=60)
    hit, value = cache.get("k1")
    assert hit is True
    assert value == {"v": 1}


def test_ttl_cache_service_immediate_expiry():
    cache = TTLCacheService()
    cache.set("k2", {"v": 2}, ttl_seconds=0)
    hit, value = cache.get("k2")
    assert hit is False
    assert value is None


def test_phase2_loader_caches_return_contract_data():
    tier_config = load_ruleset_tier_config()
    add_ons = load_ruleset_add_on_items()
    package_map = load_package_resolution_map()
    registry = load_registry()
    first_token = registry[0]["patient_token"]
    first_patient_id = registry[0]["patient_id"]
    resolved_token = resolve_patient_token(first_patient_id)
    signal_record = load_signal_store_record(patient_token=first_token)
    assert len(tier_config.get("tier_selection_rules", [])) > 0
    assert len(add_ons) > 0
    assert len(package_map) > 0
    assert len(registry) > 0
    assert resolved_token == first_token
    assert signal_record is not None


def test_recommendation_cache_key_partitions_by_resolved_runtime_identity():
    base_kwargs = {
        "patient_token": "tok_scope3",
        "signal_store_pipeline_run_id": "pipe_scope3",
        "ruleset_version": "v2026.03.1",
        "force_rule_based": False,
    }

    gemini_key = contracts._recommendation_cache_key(
        **base_kwargs,
        active_client="GeminiClient",
        model_id="gemini-2.5-flash",
        template_version="gemini-v1",
    )
    openai_key = contracts._recommendation_cache_key(
        **base_kwargs,
        active_client="OpenAIClient",
        model_id="gpt-5.4-mini",
        template_version="openai-v1",
    )
    template_bump_key = contracts._recommendation_cache_key(
        **base_kwargs,
        active_client="GeminiClient",
        model_id="gemini-2.5-flash",
        template_version="gemini-v2",
    )
    repeated_key = contracts._recommendation_cache_key(
        **base_kwargs,
        active_client="GeminiClient",
        model_id="gemini-2.5-flash",
        template_version="gemini-v1",
    )

    assert gemini_key != openai_key
    assert gemini_key != template_bump_key
    assert gemini_key == repeated_key
