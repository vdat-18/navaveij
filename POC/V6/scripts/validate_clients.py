"""Per-client connectivity smoke test using one child process per client."""

import argparse
import asyncio
import json
import os
import subprocess
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

load_dotenv(PROJECT_ROOT / ".env")

_CLIENTS = [
    "GeminiClient",
    "OpenAIClient",
    "AnthropicClient",
    "OpenRouterClient",
    "LocalHostedClient",
]

_DUMMY_SYSTEM_PROMPT = (
    "You are a test assistant. Return a minimal valid JSON response matching the requested output schema."
)
_DUMMY_SIGNALS = '{"signals_fired": [], "risk_flags": []}'
_DUMMY_TRENDS = '{"biomarkers": []}'
_DUMMY_CONSTRAINTS = '{"patient_demographics": {"age": 40, "gender": "M"}, "hard_constraints": []}'
_DUMMY_RULESET = '{"tier_selection_rules": [], "add_on_library": [], "package_resolution_map": {}}'

_COL_CLIENT = 18
_COL_MODEL = 30


def _client_model_labels() -> dict[str, str]:
    return {
        "GeminiClient": os.getenv("GEMINI_MODEL", "gemini-3-flash-preview"),
        "OpenAIClient": os.getenv("OPENAI_MODEL", "gpt-5.4-mini"),
        "AnthropicClient": os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5"),
        "OpenRouterClient": os.getenv("OPENROUTER_MODEL", "openai/gpt-oss-120b"),
        "LocalHostedClient": os.getenv("LOCALHOSTED_MODEL", "llama-3.3-70b-instruct"),
    }


async def _run_child_validation(client_name: str) -> dict[str, object]:
    os.environ["AI_ACTIVE_CLIENT"] = client_name

    from baml_client.async_client import b  # Imported after env hydration and client selection.

    started_at = time.monotonic()
    await b.AnalyzeClinicalRisks(
        system_prompt=_DUMMY_SYSTEM_PROMPT,
        clinical_signals=_DUMMY_SIGNALS,
        biomarker_trends=_DUMMY_TRENDS,
        hard_constraints=_DUMMY_CONSTRAINTS,
        program_ruleset=_DUMMY_RULESET,
    )
    return {
        "client": client_name,
        "ok": True,
        "latency_ms": int((time.monotonic() - started_at) * 1000),
    }


def _run_parent() -> int:
    print("\nNavaveij Client Connectivity Validation")
    print("=" * 60)

    any_failed = False
    model_labels = _client_model_labels()

    for client_name in _CLIENTS:
        command = [sys.executable, __file__, "--child", "--client", client_name]
        result = subprocess.run(
            command,
            cwd=str(PROJECT_ROOT),
            capture_output=True,
            text=True,
            env=os.environ.copy(),
            check=False,
        )

        client_col = client_name.ljust(_COL_CLIENT)
        model_col = f"({model_labels.get(client_name, '?')})".ljust(_COL_MODEL)

        payload: dict[str, object] | None = None
        stdout_lines = [line for line in result.stdout.splitlines() if line.strip()]
        if stdout_lines:
            try:
                payload = json.loads(stdout_lines[-1])
            except json.JSONDecodeError:
                payload = None

        if result.returncode == 0 and payload and payload.get("ok") is True:
            print(f"  {client_col} {model_col} ✓ OK ({payload['latency_ms']}ms)")
            continue

        any_failed = True
        error = ""
        if payload:
            error = str(payload.get("error", "unknown error"))
        elif result.stderr.strip():
            error = result.stderr.strip().splitlines()[-1]
        else:
            error = "validation subprocess did not return structured output"
        print(f"  {client_col} {model_col} ✗ FAIL — {error[:80]}")

    print("=" * 60)
    if any_failed:
        print("  Some clients failed. Check API keys and connectivity above.\n")
        return 1
    print("  All clients validated successfully.\n")
    return 0


def _run_child(client_name: str) -> int:
    try:
        payload = asyncio.run(_run_child_validation(client_name))
    except Exception as exc:
        print(json.dumps({"client": client_name, "ok": False, "error": str(exc)}))
        return 1

    print(json.dumps(payload))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--child", action="store_true")
    parser.add_argument("--client")
    args = parser.parse_args()

    if args.child:
        if not args.client:
            raise SystemExit("--client is required with --child")
        return _run_child(args.client)
    return _run_parent()


if __name__ == "__main__":
    raise SystemExit(main())
