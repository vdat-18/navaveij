"""Subprocess-backed LLM client health checks."""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

from src.services.active_client import resolve_active_client

PROJECT_ROOT = Path(__file__).resolve().parents[3]
BACKEND_ROOT = PROJECT_ROOT / "backend"

_DEFAULT_TIMEOUT_SECONDS = 30


def _error_result(client_name: str, error_message: str) -> dict[str, object]:
    return {
        "client_name": client_name,
        "status": "error",
        "provider": None,
        "model_id": None,
        "template_version": None,
        "latency_ms": None,
        "error_message": error_message,
    }


def _pythonpath_with_backend() -> str:
    parts = [str(BACKEND_ROOT), str(PROJECT_ROOT)]
    existing = os.environ.get("PYTHONPATH")
    if existing:
        parts.append(existing)
    return os.pathsep.join(parts)


async def _run_child_health_check(client_name: str) -> dict[str, object]:
    os.environ["AI_ACTIVE_CLIENT"] = client_name
    load_dotenv(PROJECT_ROOT / ".env")

    from baml_client.async_client import b  # Imported after env hydration and client selection.
    from src.services.prompt_selector import get_prompt_selector

    resolved_client = resolve_active_client(client_name)
    selector = get_prompt_selector(client_name)
    started_at = time.monotonic()
    await b.HealthPing()
    return {
        "client_name": client_name,
        "status": "ok",
        "provider": resolved_client.provider,
        "model_id": resolved_client.model_id,
        "template_version": selector.version,
        "latency_ms": int((time.monotonic() - started_at) * 1000),
        "error_message": None,
    }


async def run_health_check(client_name: str, timeout_seconds: int = _DEFAULT_TIMEOUT_SECONDS) -> dict[str, object]:
    try:
        resolve_active_client(client_name)
    except ValueError as exc:
        message = str(exc)
        if "Unsupported AI_ACTIVE_CLIENT" in message:
            message = message.replace("Unsupported AI_ACTIVE_CLIENT", "Unsupported client")
        return _error_result(client_name, message)

    env = os.environ.copy()
    env["AI_ACTIVE_CLIENT"] = client_name
    env["PYTHONPATH"] = _pythonpath_with_backend()
    process = await asyncio.create_subprocess_exec(
        sys.executable,
        "-m",
        "src.services.health_check",
        "--child",
        "--client",
        client_name,
        cwd=str(PROJECT_ROOT),
        env=env,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    try:
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=timeout_seconds)
    except asyncio.TimeoutError:
        process.kill()
        await process.communicate()
        return _error_result(client_name, f"health check timed out after {timeout_seconds} seconds")

    stdout_lines = [line for line in stdout.decode("utf-8").splitlines() if line.strip()]
    if not stdout_lines:
        stderr_text = stderr.decode("utf-8").strip()
        return _error_result(
            client_name,
            stderr_text.splitlines()[-1] if stderr_text else "health check subprocess did not return structured output",
        )

    try:
        payload = json.loads(stdout_lines[-1])
    except json.JSONDecodeError:
        return _error_result(client_name, "health check subprocess did not return structured output")

    if payload.get("status") == "ok":
        return payload

    if payload.get("error_message"):
        return payload

    return _error_result(client_name, str(payload.get("error", "health check failed")))


def _run_child(client_name: str) -> int:
    try:
        payload = asyncio.run(_run_child_health_check(client_name))
    except Exception as exc:  # pragma: no cover - exercised through parent contract
        print(json.dumps(_error_result(client_name, str(exc))))
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
    raise SystemExit("health_check.py is a library entry point; use --child or import run_health_check()")


if __name__ == "__main__":
    raise SystemExit(main())
