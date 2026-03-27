"""BAML Recommendation Pipeline — Parallel Profile Test.

Runs AnalyzeClinicalRisks → (MatchPolicy ∥ WriteNarrative) for each clinical scenario
and reports per-step wall-clock durations in a single summary table at the end.

Each parallel agent's completion time is measured from a shared start (t1) via inner
async wrappers, so both columns reflect real individual latencies even though the calls
run concurrently.

Usage:
    uv run pytest scripts/tests/test_baml_recommendation_profile.py -v -s
"""

import asyncio
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
        """Wall-clock total: Agent 1 (sequential) + max(Agent 2a, 2b) (parallel)."""
        a1  = next((s for s in self.steps if s.name == "AnalyzeClinicalRisks"), None)
        a2a = next((s for s in self.steps if s.name == "MatchPolicy"), None)
        a2b = next((s for s in self.steps if s.name == "WriteNarrative"), None)
        a1_ms  = a1.duration_ms  if a1  and a1.success  else 0
        a2a_ms = a2a.duration_ms if a2a and a2a.success else 0
        a2b_ms = a2b.duration_ms if a2b and a2b.success else 0
        return a1_ms + max(a2a_ms, a2b_ms)

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
    print("=" * 92)
    print("  BAML RECOMMENDATION PIPELINE — PROFILE SUMMARY (parallel Agent 2a/2b)")
    print(f"  primary : {primary}  (TrollLLM)")
    print(f"  fallback: {fallback}  (OpenRouter)")
    print("=" * 92)
    print(f"  {'Scenario':<32} {'Agent 1 (ms)':>14} {'2a Policy (ms)':>16} {'2b Narr (ms)':>14} {'Total (ms)':>12}")
    print("-" * 92)
    for p in profiles:
        a1  = next((s for s in p.steps if s.name == "AnalyzeClinicalRisks"), None)
        a2a = next((s for s in p.steps if s.name == "MatchPolicy"), None)
        a2b = next((s for s in p.steps if s.name == "WriteNarrative"), None)
        a1_str  = f"{a1.duration_ms:,}"  if a1  and a1.success  else ("ERR" if a1  else "—")
        a2a_str = f"{a2a.duration_ms:,}" if a2a and a2a.success else ("ERR" if a2a else "—")
        a2b_str = f"{a2b.duration_ms:,}" if a2b and a2b.success else ("ERR" if a2b else "—")
        total_str = f"{p.total_ms:,}" if p.passed else "FAILED"
        status = "✅" if p.passed else "❌"
        print(f"  {status} {p.scenario:<30} {a1_str:>14} {a2a_str:>16} {a2b_str:>14} {total_str:>12}")
    print("=" * 92)
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
    """Run the full pipeline (Agent 1 → parallel Agent 2a/2b) and assert timing."""
    fixture = _load_fixture(scenario)
    ruleset = get_program_ruleset(patient_token, patient_id)

    clinical_signals = json.dumps(fixture["clinical_signals"], indent=2)
    biomarker_trends = json.dumps(fixture["biomarker_trends"], indent=2)
    hard_constraints = json.dumps(fixture["hard_constraints"], indent=2)
    program_ruleset  = json.dumps(ruleset, indent=2)

    profile = ScenarioProfile(scenario=scenario)
    profile_collector.append(profile)

    timeout_budget_ms = int(os.getenv("LLM_TIMEOUT_MS", "20000")) + 5000

    # ── Agent 1: AnalyzeClinicalRisks ─────────────────────────────────────
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

    # ── Agent 2a + 2b in parallel: MatchPolicy + WriteNarrative ──────────
    # Each inner coroutine records its own completion time from a shared t1,
    # giving accurate individual latencies despite running concurrently.
    t1 = time.monotonic()
    a2a_ms_holder: list[int] = [0]
    a2b_ms_holder: list[int] = [0]

    async def _timed_policy():
        result = await b.MatchPolicy(
            risk_profile=risk_profile,
            program_ruleset=program_ruleset,
        )
        a2a_ms_holder[0] = int((time.monotonic() - t1) * 1000)
        return result

    async def _timed_narr():
        result = await b.WriteNarrative(risk_profile=risk_profile)
        a2b_ms_holder[0] = int((time.monotonic() - t1) * 1000)
        return result

    policy_result, narrative = await asyncio.gather(
        _timed_policy(),
        _timed_narr(),
        return_exceptions=True,
    )
    a2a_ms = a2a_ms_holder[0]
    a2b_ms = a2b_ms_holder[0]

    if isinstance(policy_result, Exception):
        profile.steps.append(StepResult("MatchPolicy", a2a_ms, False, str(policy_result)))
        if _is_external_error(policy_result):
            pytest.xfail(f"[{scenario}] Agent 2a — external LLM error: {policy_result}")
        raise policy_result
    else:
        profile.steps.append(StepResult("MatchPolicy", a2a_ms, True))

    if isinstance(narrative, Exception):
        profile.steps.append(StepResult("WriteNarrative", a2b_ms, False, str(narrative)))
        if _is_external_error(narrative):
            pytest.xfail(f"[{scenario}] Agent 2b — external LLM error: {narrative}")
        raise narrative
    else:
        profile.steps.append(StepResult("WriteNarrative", a2b_ms, True))

    # ── Assertions ────────────────────────────────────────────────────────
    assert risk_profile.suggested_tier in ("Standard", "Advanced", "Premium"), \
        f"Agent 1 returned unexpected tier: {risk_profile.suggested_tier}"
    assert policy_result.ai_recommended_tier in ("Standard", "Advanced", "Premium"), \
        f"Agent 2a returned unexpected tier: {policy_result.ai_recommended_tier}"
    assert policy_result.policy_script is not None, \
        "Agent 2a returned no policy_script"
    assert narrative.summary_headline, \
        "Agent 2b returned empty summary_headline"
    assert narrative.next_actions, \
        "Agent 2b returned empty next_actions"

    assert a1_ms <= timeout_budget_ms, \
        f"Agent 1 took {a1_ms}ms — exceeded budget of {timeout_budget_ms}ms"
    assert a2a_ms <= timeout_budget_ms, \
        f"Agent 2a took {a2a_ms}ms — exceeded budget of {timeout_budget_ms}ms"
    assert a2b_ms <= timeout_budget_ms, \
        f"Agent 2b took {a2b_ms}ms — exceeded budget of {timeout_budget_ms}ms"
