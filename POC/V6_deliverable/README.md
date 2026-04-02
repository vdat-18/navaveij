# Navavej ROC (Recommendation & Orchestration Center) — v5

> **v5** merges the best of two parallel POC branches (v2 & v4). See `_project_management/_merging_v2_n_v4/plan.md` for the full diff analysis and rationale.
>
> | From v4 (base) | From v2 (ported) |
> |----------------|------------------|
> | Role-based UX — physician/nurse get no sidebar, `PatientSearchEntry`, `ClinicalDrawer` | `overall_risk_level` now returned by backend (was a silent bug in v4) |
> | Enriched patient registry (age/gender/MRN/ethnicity) | `risk_summary` object in API response (description, source, fallback flag) |
> | Refined BAML prompt formatting | Confidence % + confidence tier label displayed in HUD |
> | Compact 4-column Intelligence HUD | "Risk Summary" popover button on the gauge |
> | | `LoadingSteps.tsx` + `PackageSealBadge.tsx` as standalone reusable components |

# Navavej ROC (Recommendation & Orchestration Center) 🏥

![Navavej ROC Logo](https://navavej.com/wp-content/themes/navavej/assets/images/logo.png)

Welcome to the **Navavej ROC**, an enterprise-grade AI Clinical Decision Support System (CDSS) designed for **Navavej International Hospital**. 

This platform empowers physicians to provide personalized, data-driven health checkup strategies by combining advanced AI reasoning (LLMs) with strict clinical rulesets and an immutable audit trail.

---

## 🚀 Key Features

### 1. Clinical AI Reasoning HUD
- **Neural Reasoning Trace**: Transparent AI thought process explainability for doctors.
- **Smart Tier Selection**: Automatic mapping to Standard (Gold), Advanced (Platinum), or Premium (Diamond) packages based on risk profile.
- **Risk Indicator HUD**: Real-time visualization of entity risk levels (High/Moderate/Low).

### 2. Biomarker Evolution Trends 📈
- **Interactive Charts**: Powered by Recharts, visualizing 3-year historical trends for Blood Pressure (SBP/DBP) and BMI.
- **Micro-Trend Analysis**: Automatic detection of increasing/decreasing velocities in clinical signals.

### 3. Physician Governance & Immutable Audit Log 🛡️
- **Immutable Ledger**: Every decision is hashed using SHA-256 and chained to previous records for absolute data integrity.
- **Approval Workflow**: Physicians can record "Approve/Reject" decisions with custom clinical notes.
- **Governance Dashboard**: A dedicated administrative view to search and verify historical clinical traces.

### 4. Privacy-First Architecture
- **PII Masking**: Automatic pseudonymization of patient identity before cloud-AI processing.
- **HMAC Tokens**: Security-first tokenization for cross-system data exchange.

### 5. Resilient LLM Client Layer
- **Pluggable Multi-Provider Runtime**: `AI_ACTIVE_CLIENT` selects the active BAML client (`GeminiClient`, `OpenAIClient`, `AnthropicClient`, `OpenRouterClient`, `LocalHostedClient`) without code changes.
- **Bounded Latency**: `LLM_TIMEOUT_MS` caps each LLM HTTP call; worst-case end-to-end pipeline completes in ≤42s.
- **Deterministic Output**: Per-call timeout ensures the backend always resolves before the frontend's 60s limit, eliminating inconsistent AI/rule-based cache races.

---

## 🏗️ System Architecture

- **Frontend**: Next.js 15+, Tailwind CSS, Framer Motion, Recharts, Lucide Icons.
- **Backend API**: Python 3.10+, FastAPI, Loguru.
- **Intelligence Layer**: BAML (Structured LLM prompting), Model Context Protocol (MCP), provider-native client configuration for Gemini, OpenAI, Anthropic, OpenRouter, and local hosted models.
- **Data Governance**: SHA-256 Hash Chaining Auditor.

---

## 🛠️ Getting Started

### Prerequisites
- Python 3.10+ and `uv` package manager.
- Node.js 18+ and `npm`.
- Provider-native LLM env vars — see `.env.example`:
  - Gemini: `GOOGLE_API_KEY`, `GEMINI_MODEL`
  - OpenAI: `OPENAI_API_KEY`, `OPENAI_MODEL`
  - Anthropic: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`
  - OpenRouter: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_BASE_URL`
  - Local hosted: `LOCALHOSTED_BASE_URL`, `LOCALHOSTED_API_KEY`, `LOCALHOSTED_MODEL`

### 1. Backend Setup & Run
```bash
# Install dependencies
uv sync

# Generate BAML client
baml-cli generate

# Start the API Server
PYTHONPATH=.:./backend uv run python -m src.api.main
```
*API will be available at `http://localhost:8000`*

### 2. Frontend Setup & Run
```bash
# From the repo root
npm run frontend:install
npm run dev
```
*Web dashboard will be available at `http://localhost:3000`*

If you prefer working directly inside the app, the frontend lives in `frontend/` and the equivalent commands are:

```bash
cd frontend
npm install
npm run dev
```

---

## 📂 Repository Structure

- `backend/src/`: Core Python logic (API, Orchestrator, MCP).
- `baml_src/`: BAML prompt templates, LLM schema definitions, and provider-native client configuration.
- `baml_client/`: Auto-generated BAML client for Python (at root).
- `frontend/`: Next.js frontend application.
- `scripts/`: Integration tests, helper scripts, and pipeline profile tests.
- `assets/`: Clinical Signal Store (JSON database).
- `assets/synthesis/rulesets/`: V6-local ruleset bundle. Production must include tier config, package resolution, add-on catalog, and promotions files.
- `doc_outputs/`: Ruleset configurations and clinical samples.
- `logs/audit.jsonl`: The immutable ledger of all clinical decisions.

---

## 🛡️ Governance & Security
This system adheres to the **"Let it crash"** error policy for fail-fast reliability and uses **SHA-256 Hash Chaining** in the `AuditLogger` to ensure that once a clinical decision is recorded, it is permanent and tamper-proof.

---

*Developed with ❤️ for the future of clinical excellence at Navavej International Hospital.*
