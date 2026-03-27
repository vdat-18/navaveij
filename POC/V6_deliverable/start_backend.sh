#!/usr/bin/env bash
set -e

echo "========================================"
echo "  Navavej ROC — Backend"
echo "========================================"
echo ""
echo "Make sure .env is configured (copy from .env.example and fill in your API keys)."
echo ""

# Install / sync Python dependencies
uv sync

# Start the API server (MCP server is launched automatically as a subprocess)
PYTHONPATH=.:./backend uv run python -m src.api.main
