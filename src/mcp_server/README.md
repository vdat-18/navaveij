# Navaveij Clinical MCP Server

This server provides a standardized, read-only interface to pre-computed clinical signals and medical rules for the Navaveij Health Checkup Recommendation system.

## Overview

The MCP Server acts as a secure data bridge between raw patient data/clinical rules and the AI inference engine. It adheres to the **Model Context Protocol (MCP)** and enforces the **Least Privilege** principle.

## Project Structure

- `server.py`: Main entry point and tool registration.
- `utils.py`: Utility functions for data handling (e.g., loading sample JSON).
- `tools/`: Individual tool implementations.
  - `hard_constraints.py`: Gender/Age-specific medical constraints.
  - `clinical_signals.py`: Risk alerts and abnormality triggers.
  - `biomarker_trends.py`: Historical data and velocity (BMI, Glucose).
  - `program_ruleset.py`: Business rules for checkup tier selection.

## Core Tools

| Tool | Purpose | Key Inputs | Output Example |
| --- | --- | --- | --- |
| `get_hard_constraints` | Non-negotiable medical rules | `patient_id` | `["Exclude Mammogram", ...]` |
| `get_clinical_signals` | Risk flags and alerts | `patient_id` | `{"prediabetes_alert": True, ...}` |
| `get_biomarker_trends` | Historical trend analysis | `patient_id` | `{"bmi_trend": [...], "note": "..."}` |
| `get_program_ruleset` | Package mapping logic | None | `{"Premium": "Recommended for high-risk..."}` |

## Usage

### Prerequisites
- Python 3.10+
- [uv](https://docs.astral.sh/uv/) (Recommended)
- Dependencies: `mcp`, `loguru`, `pydantic`

### Installation
```bash
uv sync
```

### Running the Server
To run the server in `stdio` transport mode (standard for local testing):
```bash
# Using module mode (Recommended)
PYTHONPATH=. uv run python -m src.mcp_server.server

# Or using script mode
PYTHONPATH=. uv run python src/mcp_server/server.py
```

### Testing with MCP Inspector
The best way to test the tools visually is using the official MCP Inspector:
```bash
PYTHONPATH=. npx -y @modelcontextprotocol/inspector uv run python src/mcp_server/server.py
```
After running, open the provided URL in your browser and click **Connect**.

## Coding Standards

- **Formatting**: Checked and formatted via [Ruff](https://beta.ruff.rs/docs/).
- **Validation**: Inputs and outputs are strictly validated using **Pydantic v2** models in `src/shared/schemas.py`.
- **Logging**: Uses `loguru` for structured audit logs. No `print` statements allowed.
- **Docstrings**: Concise Google-style docstrings for all classes and functions.

## Data Source
Currently configured to use normalized patient data from:
`doc_outputs/architecture/AI/Recommendation Engine/v3/samples/sample_patient_checkup.json`
