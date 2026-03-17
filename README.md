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

---

## 🏗️ System Architecture

- **Frontend**: Next.js 15+, Tailwind CSS, Framer Motion, Recharts, Lucide Icons.
- **Backend API**: Python 3.10+, FastAPI, Loguru.
- **Intelligence Layer**: BAML (Structured LLM prompting), Model Context Protocol (MCP).
- **Data Governance**: SHA-256 Hash Chaining Auditor.

---

## 🛠️ Getting Started

### Prerequisites
- Python 3.10+ and `uv` package manager.
- Node.js 18+ and `npm`.
- OpenAI or compatible LLM API Key (configured in `.env`).

### 1. Backend Setup & Run
```bash
# Install dependencies
uv sync

# Generate BAML client
baml-cli generate

# Start the API Server
PYTHONPATH=. uv run python src/api/main.py
```
*API will be available at `http://localhost:8000`*

### 2. Frontend Setup & Run
```bash
cd web

# Install dependencies
npm install

# Start development server
npm run dev
```
*Web dashboard will be available at `http://localhost:3000`*

---

## 📂 Repository Structure

- `web/`: Next.js frontend application.
- `src/api/`: FastAPI routes and endpoint definitions.
- `src/orchestrator/`: The "Brain" - manager, workflows, and audit logging.
- `src/mcp_server/`: Clinical data bridge adhering to the Model Context Protocol.
- `src/synthesis/`: Hybrid AI clinical data generator for testing.
- `baml_src/`: BAML prompt templates and LLM schema definitions.
- `logs/audit.jsonl`: The immutable ledger of all clinical decisions.

---

## 🛡️ Governance & Security
This system adheres to the **"Let it crash"** error policy for fail-fast reliability and uses **SHA-256 Hash Chaining** in the `AuditLogger` to ensure that once a clinical decision is recorded, it is permanent and tamper-proof.

---

*Developed with ❤️ for the future of clinical excellence at Navavej International Hospital.*
