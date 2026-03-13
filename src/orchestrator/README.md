# Navaveij Inference Orchestrator

The Inference Orchestrator is the central "brain" of the Navaveij Health Checkup Recommendation system. It coordinates the data flow between clinical tools, privacy layers, and AI models.

## Overview

This component implements a **Hybrid ReAct Loop** that ensures all clinical recommendations are based on verified medical signals while maintaining strict patient privacy.

### Key Capabilities

- **PII Masking & Rehydration**: Automatically pseudonymizes sensitive data (Name, DOB, MRN) before sending it to Cloud AI providers, and restores it for the final report.
- **Baseline Orchestration**: Automatically executes a mandatory set of MCP tools to gather a "5-Dimensional" view of the patient's health.
- **Pluggable AI Gateway**: Supports multiple LLM providers (OpenAI, Anthropic, etc.) through a unified interface.
- **MCP Integration**: Connects seamlessly to the local Clinical MCP Server via `stdio` transport.

## Project Structure

- `agents/orchestrator.py`: The core engine managing the reasoning loop.
- `privacy/`:
    - `masking.py`: Logic for converting sensitive data into UUID tokens.
    - `rehydration.py`: Logic for restoring tokens to original values.
- `gateway.py`: Unified API wrapper for LLM providers.
- `validation/`: (In-progress) Rules for output verification and clinical safety.
- `logger/`: (In-progress) Implements immutable, hash-chained audit logging.

## Usage

### Prerequisites

- Ensure the [Clinical MCP Server](../mcp_server/README.md) is configured.
- Environment variables:
    - `NAVAVEIJ_MODEL_PROVIDER` (default: `openai`)
    - `NAVAVEIJ_MODEL_ID` (default: `gpt-4o`)
    - `OPENAI_API_KEY` (required if using OpenAI)

### Installation

```bash
uv sync
```

### Running the Orchestrator (Integration Test)

To verify the end-to-end flow (MCP -> Masking -> Mock AI -> Rehydration), run the following command from the project root:

```bash
PYTHONPATH=. uv run python test_orchestrator.py
```

## How It Works (The 3-Step Loop)

1.  **Phase 1 — Discovery**: The orchestrator connects to the MCP Server and calls `get_patient_context`, `get_hard_constraints`, `get_clinical_signals`, etc.
2.  **Phase 2 — Transformation**: The `PIIMasker` identifies fields like `birth_date` and replaces them with tokens (e.g., `tok_123456`).
3.  **Phase 3 — Recommendation**: The cleaned data is sent to the LLM. The LLM's response is then "rehydrated" by the `PIIRehydrator` to produce the final dashboard-ready JSON.

## Coding Standards

- **Ruff**: Enforced 120-character line limit.
- **Validation**: Strict Pydantic v2 schemas.
- **Logging**: Structured logs via `loguru`.
