"""Tests for GET /api/master-add-ons endpoint normalization."""

import sys
from unittest.mock import MagicMock, patch

# Stub heavy dependencies that are unavailable in the test environment
# (baml_client version mismatch; orchestrator imports clinical workflow which needs baml)
for _mod in (
    "baml_client",
    "baml_client.async_client",
    "baml_client.sync_client",
    "baml_client.types",
    "baml_client.globals",
    "src.services.workflows.clinical",
    "src.services.orchestrator",
):
    sys.modules.setdefault(_mod, MagicMock())

import pytest  # noqa: E402

SAMPLE_RAW = [
    {
        "item_code": "colonoscopy",
        "label": "Colonoscopy",
        "category": "cancer_screening",
        "status": "draft",
        "gender_constraint": None,
        "age_min": 45,
        "age_max": 85,
        "trigger_signals": ["colonoscopy_screening_gap"],
        "navavej_product": {"price_thb": 9500},
    },
    {
        "item_code": "psa_test",
        "label": "PSA Test",
        "category": "cancer_screening",
        "status": "active",
        "gender_constraint": "male",
        "age_min": 50,
        "age_max": 70,
        "trigger_signals": ["psa_screening_gap"],
        "navavej_product": None,
    },
]


@pytest.mark.asyncio
async def test_master_add_ons_normalises_items():
    """Endpoint flattens navavej_product.price_thb and retains all fields."""
    from src.api.routes.contracts import master_add_ons
    from src.api.security import AuthContext

    auth = AuthContext(user_id="test", role="admin", scopes={"monitoring:read"})

    with patch("src.api.routes.contracts.load_ruleset_add_on_items", return_value=SAMPLE_RAW):
        result = await master_add_ons(_auth=auth)

    items = result["add_ons"]
    assert len(items) == 2

    colonoscopy = next(i for i in items if i["item_code"] == "colonoscopy")
    assert colonoscopy["label"] == "Colonoscopy"
    assert colonoscopy["category"] == "cancer_screening"
    assert colonoscopy["price_thb"] == 9500
    assert colonoscopy["gender_constraint"] is None
    assert colonoscopy["trigger_signals"] == ["colonoscopy_screening_gap"]
    assert colonoscopy["age_min"] == 45
    assert colonoscopy["age_max"] == 85

    psa = next(i for i in items if i["item_code"] == "psa_test")
    assert psa["price_thb"] is None  # navavej_product is None → no price
    assert psa["gender_constraint"] == "male"


@pytest.mark.asyncio
async def test_master_add_ons_empty_when_no_ruleset():
    """Endpoint returns empty list when ruleset loader returns nothing."""
    from src.api.routes.contracts import master_add_ons
    from src.api.security import AuthContext

    auth = AuthContext(user_id="test", role="admin", scopes={"monitoring:read"})

    with patch("src.api.routes.contracts.load_ruleset_add_on_items", return_value=[]):
        result = await master_add_ons(_auth=auth)

    assert result["add_ons"] == []
