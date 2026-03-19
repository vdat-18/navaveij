"""BAML Recommendation Pipeline — Sequential Profile Test.

Runs AnalyzeClinicalRisks → MatchAndCompose in strict sequence for each
clinical scenario and reports per-step and total wall-clock durations in a
single summary table at the end of the session.

Usage:
    uv run pytest scripts/tests/test_baml_recommendation_profile.py -v -s
"""

import json
import os
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = PROJECT_ROOT / "backend"

for path in (str(PROJECT_ROOT), str(BACKEND_ROOT)):
    if path not in sys.path:
        sys.path.insert(0, path)

from dotenv import load_dotenv

load_dotenv(PROJECT_ROOT / ".env")

from baml_client.async_client import b  # noqa: E402
from src.mcp_server.tools.program_ruleset import get_program_ruleset  # noqa: E402

# ---------------------------------------------------------------------------
# Scenario definitions
# ---------------------------------------------------------------------------

SCENARIOS = [
    ("MetabolicSyndromeRisk",    "id_1a2b3c4d",   "tok_hmac_1a2b3c4d"),
    ("HealthyRoutineCheckup",    "id_1aa1b504",    "tok_hmac_1aa1b504"),
    ("UncontrolledHypertension", "id_d4f2b7e6",    "tok_hmac_d4f2b7e6"),
    ("SeniorCancerScreeningGap", "id_24d93799",    "tok_hmac_24d93799"),
]

FIXTURE_BASE = PROJECT_ROOT / "assets" / "synthesis" / "generated"

# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class StepResult:
    name: str
    duration_ms: int
    success: bool
    error: str | None = None


@dataclass
class ScenarioProfile:
    scenario: str
    steps: list[StepResult] = field(default_factory=list)

    @property
    def total_ms(self) -> int:
        return sum(s.duration_ms for s in self.steps)

    @property
    def passed(self) -> bool:
        return all(s.success for s in self.steps)


# ---------------------------------------------------------------------------
# Session-level collector fixture
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def profile_collector() -> list[ScenarioProfile]:
    """Accumulates ScenarioProfile objects across all parametrized tests."""
    return []


@pytest.fixture(scope="session", autouse=True)
def print_profile_summary(profile_collector: list[ScenarioProfile]):
    """Prints the aggregated timing table once after all tests complete."""
    yield
    if not profile_collector:
        return

    # Sort by scenario name order defined in SCENARIOS
    order = {name: i for i, (name, _, _) in enumerate(SCENARIOS)}
    profiles = sorted(profile_collector, key=lambda p: order.get(p.scenario, 99))

    primary = os.getenv("LLM_MODEL", "?")
    fallback = os.getenv("OPENROUTER_MODEL", "?")

    print("\n")
    print("=" * 76)
    print("  BAML RECOMMENDATION PIPELINE — PROFILE SUMMARY")
    print(f"  primary : {primary}  (TrollLLM)")
    print(f"  fallback: {fallback}  (OpenRouter)")
    print("=" * 76)
    print(f"  {'Scenario':<32} {'Agent 1 (ms)':>14} {'Agent 2 (ms)':>14} {'Total (ms)':>12}")
    print("-" * 76)
    for p in profiles:
        a1 = next((s for s in p.steps if s.name == "AnalyzeClinicalRisks"), None)
        a2 = next((s for s in p.steps if s.name == "MatchAndCompose"), None)
        a1_str = f"{a1.duration_ms:,}" if a1 and a1.success else ("ERR" if a1 else "—")
        a2_str = f"{a2.duration_ms:,}" if a2 and a2.success else ("ERR" if a2 else "—")
        total_str = f"{p.total_ms:,}" if p.passed else "FAILED"
        status = "✅" if p.passed else "❌"
        print(f"  {status} {p.scenario:<30} {a1_str:>14} {a2_str:>14} {total_str:>12}")
    print("=" * 76)
    passed = sum(1 for p in profiles if p.passed)
    print(f"  {passed}/{len(profiles)} scenarios passed\n")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_fixture(scenario: str) -> dict:
    path = FIXTURE_BASE / scenario / "record_000.json"
    return json.loads(path.read_text(encoding="utf-8"))


def _is_external_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return any(k in msg for k in ("503", "broken pipe", "connection", "service unavailable", "timeout"))


# ---------------------------------------------------------------------------
# Parametrized profile test — one test per scenario
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.parametrize("scenario,patient_id,patient_token", SCENARIOS, ids=[s[0] for s in SCENARIOS])
async def test_recommendation_pipeline_profile(
    scenario: str,
    patient_id: str,
    patient_token: str,
    profile_collector: list[ScenarioProfile],
):
    """Run the full two-agent recommendation pipeline sequentially and assert timing."""
    fixture = _load_fixture(scenario)
    ruleset = get_program_ruleset(patient_token, patient_id)

    clinical_signals = json.dumps(fixture["clinical_signals"], indent=2)
    biomarker_trends = json.dumps(fixture["biomarker_trends"], indent=2)
    hard_constraints = json.dumps(fixture["hard_constraints"], indent=2)
    program_ruleset  = json.dumps(ruleset, indent=2)

    profile = ScenarioProfile(scenario=scenario)
    profile_collector.append(profile)

    timeout_budget_ms = int(os.getenv("LLM_TIMEOUT_MS", "20000")) + 5000

    # ── Agent 1: AnalyzeClinicalRisks ──────────────────────────────────────
    t0 = time.monotonic()
    try:
        risk_profile = await b.AnalyzeClinicalRisks(
            clinical_signals=clinical_signals,
            biomarker_trends=biomarker_trends,
            hard_constraints=hard_constraints,
            program_ruleset=program_ruleset,
        )
        a1_ms = int((time.monotonic() - t0) * 1000)
        profile.steps.append(StepResult("AnalyzeClinicalRisks", a1_ms, True))
    except Exception as exc:
        a1_ms = int((time.monotonic() - t0) * 1000)
        profile.steps.append(StepResult("AnalyzeClinicalRisks", a1_ms, False, str(exc)))
        if _is_external_error(exc):
            pytest.xfail(f"[{scenario}] Agent 1 — external LLM error: {exc}")
        raise

    # ── Agent 2: MatchAndCompose ────────────────────────────────────────────
    t1 = time.monotonic()
    try:
        result = await b.MatchAndCompose(
            risk_profile=risk_profile,
            program_ruleset=program_ruleset,
        )
        a2_ms = int((time.monotonic() - t1) * 1000)
        profile.steps.append(StepResult("MatchAndCompose", a2_ms, True))
    except Exception as exc:
        a2_ms = int((time.monotonic() - t1) * 1000)
        profile.steps.append(StepResult("MatchAndCompose", a2_ms, False, str(exc)))
        if _is_external_error(exc):
            pytest.xfail(f"[{scenario}] Agent 2 — external LLM error: {exc}")
        raise

    # ── Assertions ─────────────────────────────────────────────────────────
    assert risk_profile.suggested_tier in ("Standard", "Advanced", "Premium"), \
        f"Agent 1 returned unexpected tier: {risk_profile.suggested_tier}"
    assert result.ai_recommended_tier in ("Standard", "Advanced", "Premium"), \
        f"Agent 2 returned unexpected tier: {result.ai_recommended_tier}"
    assert result.communication_script is not None, \
        "Agent 2 returned no communication_script"

    assert a1_ms <= timeout_budget_ms, \
        f"Agent 1 took {a1_ms}ms — exceeded budget of {timeout_budget_ms}ms"
    assert a2_ms <= timeout_budget_ms, \
        f"Agent 2 took {a2_ms}ms — exceeded budget of {timeout_budget_ms}ms"
