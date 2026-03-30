# Navavej ROC (Recommendation & Orchestration Centre) — V6 POC

The **Navavej ROC** is an enterprise-grade AI Clinical Decision Support System (CDSS) built for Navavej International Hospital. It combines LLM-based clinical reasoning with deterministic rulesets to generate personalised health checkup recommendations, with a complete physician governance layer and immutable audit trail.

---

## Prerequisites

| Requirement | Version | Install |
|-------------|---------|---------|
| Python | 3.10+ | [python.org](https://www.python.org/downloads/) |
| `uv` (Python package manager) | latest | [docs.astral.sh/uv](https://docs.astral.sh/uv/getting-started/installation/) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org/) |
| npm | bundled with Node.js | — |

---

## Quick Start

> **TL;DR — local dev:** configure `.env`, then run `./start_backend.sh` (Terminal 1) and `./start_frontend.sh` (Terminal 2).

### Step 1 — Configure environment

Copy `.env.example` to `.env` and fill in your API credentials:

```bash
cp .env.example .env
```

At minimum, set `AI_ACTIVE_CLIENT` and the corresponding credentials for that client (see [Environment Configuration](#environment-configuration) below).

### Step 2 — Start the backend (Terminal 1)

```bash
./start_backend.sh
```

Or manually:

```bash
uv sync
PYTHONPATH=.:./backend uv run python -m src.api.main
```

API available at `http://localhost:8000`

### Step 3 — Start the frontend (Terminal 2)

```bash
./start_frontend.sh
```

Or manually:

```bash
cd frontend
npm install
npm run dev
```

Dashboard available at `http://localhost:3000`

---

## Environment Configuration

### AI Client Selection

```env
AI_ACTIVE_CLIENT=GPT4o   # GPT4o | Claude35Sonnet | LocalLlama | NavaveijClient
```

Set the active client and provide credentials only for the selected provider:

| Client | Required keys |
|--------|---------------|
| `GPT4o` | `OPENAI_API_KEY` |
| `Claude35Sonnet` | `ANTHROPIC_API_KEY` |
| `LocalLlama` | None (Ollama at `localhost:11434`) |
| `NavaveijClient` | `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` |

Optionally set `OPENROUTER_API_KEY` + `OPENROUTER_MODEL` as a fallback provider.

### LLM Tuning

| Variable | Description | Default |
|----------|-------------|---------|
| `LLM_TIMEOUT_MS` | Max ms per LLM call | `20000` |
| `LLM_ANNOTATION_MODEL` | Smaller model for annotation task | `gpt-4o-mini` |

### Authentication Mode

```env
API_AUTH_MODE=smart_on_fhir_demo  # poc_claims | smart_on_fhir_demo | disabled
```

- `smart_on_fhir_demo` — validates mock Bearer JWT from the `/login` consent screen (recommended for demo)
- `poc_claims` — injects static claims from `API_AUTH_DEFAULT_*` env vars (simplest for local testing)
- `disabled` — no auth enforcement

Set the default identity for `poc_claims` mode:

```env
API_AUTH_DEFAULT_ROLE=admin   # admin | physician | nurse | pharmacist | dpo
```

### Caching

All cache TTLs are in seconds. Set `CACHE_ENABLED=false` to disable entirely.

---

## Project Structure

```
backend/       FastAPI API server, orchestrator, MCP server, services
baml_src/      BAML prompt templates and LLM client definitions
baml_client/   Pre-generated Python BAML bindings (do not edit manually)
frontend/      Next.js 16 web dashboard
shared/        Shared Python settings and utilities
assets/        Patient registry and clinical signal store (JSON)
logs/          Audit ledger — audit.jsonl grows here at runtime
```

---

## Key Features

### 1. Clinical AI Reasoning HUD
- **Neural Reasoning Trace**: Transparent AI thought process for physician review.
- **Smart Tier Selection**: Automatic mapping to Standard (Gold), Advanced (Platinum), or Premium (Diamond) packages based on patient risk profile.
- **Risk Indicator HUD**: Real-time visualisation of entity risk levels (High / Moderate / Low).

### 2. Biomarker Evolution Trends
- **Interactive Charts**: 3-year historical trends for Blood Pressure (SBP/DBP) and BMI, powered by Recharts.
- **Micro-Trend Analysis**: Automatic detection of increasing/decreasing velocity in clinical signals.

### 3. Physician Governance & Immutable Audit Log
- **Immutable Ledger**: Every decision is hashed using SHA-256 and chained to previous records.
- **Approval Workflow**: Physicians can record Approve/Reject decisions with clinical notes.
- **Governance Dashboard**: Admin view to search and verify historical clinical traces.

### 4. Privacy-First Architecture
- **PII Masking**: Automatic pseudonymisation of patient identity before cloud-AI processing.
- **HMAC Tokens**: Security-first tokenisation for cross-system data exchange.

### 5. Resilient LLM Client Layer
- **Multi-Provider Fallback**: Primary LLM with automatic failover to OpenRouter.
- **Bounded Latency**: `LLM_TIMEOUT_MS` caps each LLM call; worst-case pipeline completes in ≤42s.
- **Pluggable AI**: Switch providers by changing `AI_ACTIVE_CLIENT` in `.env` — no code deployment needed.

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, Framer Motion, Recharts, Lucide Icons |
| Backend | Python 3.10+, FastAPI, Uvicorn, Loguru |
| Intelligence | BAML (structured LLM prompting), Model Context Protocol (MCP) |
| Data Governance | SHA-256 Hash Chaining Auditor |

---

## Notes

- **MCP Server**: The Model Context Protocol server is launched automatically by the backend as a subprocess. No separate terminal is needed.
- **BAML client**: `baml_client/` contains pre-generated Python bindings and is ready to use as-is. If you modify prompt templates in `baml_src/`, re-run `baml-cli generate` to regenerate it.
- **Audit log**: `logs/audit.jsonl` starts empty and grows as recommendations are generated and approved.
- **Patient data**: Three demo patients are pre-loaded in `assets/patient_registry.json` with full clinical signal histories in `assets/synthesis/generated/`.
