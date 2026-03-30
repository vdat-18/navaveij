"""
validate_clients.py — Per-client connectivity smoke-test.

For each named BAML client, makes a minimal AnalyzeClinicalRisks call with
dummy data and reports ✓ OK or ✗ FAIL with the error message.

Usage:
    uv run python scripts/validate_clients.py

Exit code: 0 if all pass, 1 if any fail.
"""

import asyncio
import os
import sys
import time
from pathlib import Path

# Ensure the project root is on the Python path
sys.path.insert(0, str(Path(__file__).parents[1]))

_CLIENTS = [
    ("GeminiClient",      "gemini-3-flash-preview"),
    ("OpenAIClient",      "gpt-5.4-mini"),
    ("AnthropicClient",   "claude-haiku-4-5"),
    ("OpenRouterClient",  "openai/gpt-oss-120b"),
    ("LocalHostedClient", "llama-3.3-70b-instruct"),
]

_DUMMY_SYSTEM_PROMPT = (
    "You are a test assistant. Return a minimal valid JSON response matching the requested output schema."
)
_DUMMY_SIGNALS   = '{"signals_fired": [], "risk_flags": []}'
_DUMMY_TRENDS    = '{"biomarkers": []}'
_DUMMY_CONSTRAINTS = '{"patient_demographics": {"age": 40, "gender": "M"}, "hard_constraints": []}'
_DUMMY_RULESET   = '{"tier_selection_rules": [], "add_on_library": [], "package_resolution_map": {}}'

_COL_CLIENT = 18
_COL_MODEL  = 30


async def _test_client(client_name: str, model_label: str) -> tuple[bool, int, str]:
    """Override AI_ACTIVE_CLIENT, attempt a minimal BAML call, return (ok, ms, error)."""
    os.environ["AI_ACTIVE_CLIENT"] = client_name

    # Re-import baml_client each time so it picks up the env override.
    # BAML resolves the active client at call time via the fallback chain,
    # but we short-circuit by temporarily setting each client as the only option
    # through the env var read by shared.settings.
    try:
        from baml_client.async_client import b  # type: ignore

        t0 = time.monotonic()
        await b.AnalyzeClinicalRisks(
            system_prompt=_DUMMY_SYSTEM_PROMPT,
            clinical_signals=_DUMMY_SIGNALS,
            biomarker_trends=_DUMMY_TRENDS,
            hard_constraints=_DUMMY_CONSTRAINTS,
            program_ruleset=_DUMMY_RULESET,
        )
        elapsed_ms = int((time.monotonic() - t0) * 1000)
        return True, elapsed_ms, ""
    except Exception as exc:
        elapsed_ms = int((time.monotonic() - t0) * 1000) if "t0" in dir() else 0
        return False, elapsed_ms, str(exc)


async def main() -> int:
    print("\nNavaveij Client Connectivity Validation")
    print("=" * 60)
    any_failed = False

    for client_name, model_label in _CLIENTS:
        ok, ms, error = await _test_client(client_name, model_label)
        client_col = client_name.ljust(_COL_CLIENT)
        model_col  = f"({model_label})".ljust(_COL_MODEL)
        if ok:
            print(f"  {client_col} {model_col} \u2713 OK ({ms}ms)")
        else:
            short_err = error.split("\n")[0][:80]
            print(f"  {client_col} {model_col} \u2717 FAIL \u2014 {short_err}")
            any_failed = True

    print("=" * 60)
    if any_failed:
        print("  Some clients failed. Check API keys and connectivity above.\n")
        return 1
    print("  All clients validated successfully.\n")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
