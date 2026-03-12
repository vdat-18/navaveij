# Component Inventory & Solution Approach — Recommendation Platform (v3)

**Scope:** The AI Recommendation Platform — the runtime inference layer that sits between the pre-computed Data Stores (upstream) and the Output Layer (downstream). This document defines every component, its role, interfaces, technology choice, and the approach used to solve each major architectural concern.

***

## Upstream / Downstream Boundary

```
[Data Stores]          →  [Recommendation Platform]  →  [Output Layer]
Signal Store                SMART on FHIR Auth             ROC Dashboard
Ruleset Store               MCP Server                     Personalized Checkup Plan
Model Config Store          PII Masking                    SalesAdmin Review
Prompt Template Vault       Inference Orchestrator         Feedback Store
                            AI Gateway
                            Prompt Template Selector
                            AI Model
                            Output Schema Validator
                            + Confidence Calibrator
                            Audit Logger
                            Safety Rule Validator
                            Graceful Degradation
                            PII Rehydration
```

The Data Stores layer is populated **offline** by the Data Pipeline (FHIR Transform → Feature Engineering → Clinical Signal Engine). The Recommendation Platform is **query-time only** — it reads pre-computed data; it never writes to source systems.

***

## 1. Component Inventory

| #  | Component                                           | Role                                                                                                                                       | Key Inputs                                                                                                                                                                                                     | Key Outputs                                                                                                                                          | Technology                                                                                                                                                                             | TOR / POC Criterion                  |
| -- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 1  | **SMART on FHIR Auth**                              | Validates requester scope before any data is retrieved                                                                                     | Auth token + requested FHIR resource scope                                                                                                                                                                     | Access grant / deny + scoped session token                                                                                                           | OAuth 2.0 with FHIR scope extensions (e.g. Keycloak); resource-level permission enforcement                                                                                            | TOR §5.1 / Security 20%              |
| 2  | **MCP Server**                                      | Controlled read-only interface to pre-computed signals and rules; enforces Least Privilege                                                 | Tool call requests from Inference Orchestrator                                                                                                                                                                 | Clinical signals, biomarker trends, hard constraints, program ruleset                                                                                | Model Context Protocol server; read-only DB adapter per tool; initial 4 tools — server designed for extension                                                                          | TOR §4.2 / Hybrid+MCP 35%            |
| 3  | **PII Masking**                                     | Pseudonymizes PII fields in MCP output before context reaches the AI                                                                       | Raw MCP tool responses                                                                                                                                                                                         | Pseudonymized responses + request-scoped rehydration map                                                                                             | In-memory UUID v4 token mapping; configurable PII field list; map never persisted or logged                                                                                            | TOR §5.2 / Security 20%              |
| 4  | **AI Gateway**                                      | Routes inference request to the active model; manages credentials                                                                          | Assembled masked context + Model Config Store (active model ID, endpoint, API key ref)                                                                                                                         | Inference request to AI Model; raw model response back                                                                                               | Custom gateway service; API keys referenced via secret manager (e.g. HashiCorp Vault / AWS Secrets Manager); no hardcoded keys                                                         | TOR §4.3 / Pluggable 25%             |
| 5  | **Prompt Template Selector**                        | Loads the version-tagged system prompt and instruction template for the active model                                                       | Active model ID + template version tag (from Model Config Store)                                                                                                                                               | Assembled system prompt + instruction template                                                                                                       | Query to Prompt Template Vault; template variable injection; version tag recorded for Audit Logger                                                                                     | TOR §4.3 / Pluggable 25%             |
| 6  | **Inference Orchestrator**                          | Manages the Hybrid ReAct tool-call loop: executes fixed baseline MCP calls, then allows AI-driven extension calls; enforces max iterations | Patient session token + SMART-scoped access                                                                                                                                                                    | Final assembled context (for AI Model) + complete tool-call trace (for Audit Logger)                                                                 | Custom ReAct orchestration loop (LangGraph-style); mandatory baseline phase; AI-driven extension phase; max iterations cap — on limit, AI commits output from current context          | TOR §4.2 / Hybrid+MCP 35%            |
| 7  | **AI Model**                                        | Reasons over masked clinical context using chain-of-thought; generates BAML-structured recommendation output                               | Assembled masked context + prompt template                                                                                                                                                                     | BAML output: `ai_recommended_tier`, `add_ons[]`, `reasoning_trace`, `supporting_signals[]`, `missing_signals[]`                                      | Pluggable: GPT-4 / Claude / Local Llama — swapped via AI Gateway config; BAML schema enforced on output                                                                                | TOR §3.2 / Hybrid 35% + XAI 20%      |
| 8  | **Output Schema Validator + Confidence Calibrator** | Enforces BAML schema on AI output; computes `confidence_score` and `confidence_tier` from observable evidence                              | Raw AI model output + signal metadata (signal coverage, data completeness, rule-agreement flag)                                                                                                                | Validated BAML output + `confidence_score` (float 0.0–1.0) + `confidence_tier` (High / Medium / Low); malformed output triggers Graceful Degradation | BAML schema validator; lightweight scoring function: score = weighted average of (signal coverage ratio + data completeness ratio + rule-agreement bonus)                              | TOR §3.3 / XAI 20%                   |
| 9  | **Audit Logger**                                    | Immutable, synchronous record of every inference — full 5-dimension log including prompt, context, and response                            | Who (user ID + role) · When (ISO timestamp) · Where (service ID + source IP) · What (prompt + context + response + model ID + template version + latency + safety result) · Why (request context / indication) | Append-only SHA-256 hash-chained log entry; masked context only — no real PII in log entries                                                         | Append-only log store; each entry SHA-256 hashed and includes previous entry's hash; synchronous write before response is returned; admin-configurable retention period (PDPA minimum) | TOR §5.3 / Security 20%              |
| 10 | **Safety Rule Validator**                           | Post-inference re-check of AI output against hard constraints; silently revokes violating items; returns partial output                    | Validated AI output + hard constraints (re-fetched from Signal Store via MCP)                                                                                                                                  | Partial clean output (violating items removed) + conflict event written to Audit Logger; violations hidden from all UI views                         | Rule evaluation engine comparing AI output fields against hard constraint set; conflict events written synchronously to Audit Logger                                                   | TOR §6.2 / Hybrid 35% + Security 20% |
| 11 | **Graceful Degradation**                            | Handles any AI unavailability condition uniformly: gateway error, BAML schema validation failure, or max ReAct iterations reached          | Degradation trigger + Signal Store / Ruleset Store read (via MCP)                                                                                                                                              | Rule-based preliminary output (from Signal Store + Ruleset Store) + `review_required: true` flag; no AI output surfaced                              | Re-query Signal Store + Ruleset Store for preliminary program tier; all three trigger types handled identically; `review_required` flag shown in SalesAdmin review view                | TOR §6.2                             |
| 12 | **PII Rehydration**                                 | Re-attaches real patient identifiers to the final output before delivery to the dashboard                                                  | Masked output + request-scoped rehydration map                                                                                                                                                                 | Display-ready output with real identifiers; rehydration map discarded immediately post-response                                                      | In-memory token → real value substitution; map held only for request duration and cleared after this step                                                                              | TOR §5.2 / Security 20%              |

***

## 2. Solution Approaches

### 2.1 Hybrid Engine Coordination

The recommendation is produced by two cooperating layers with a strict priority hierarchy:

```
Hard Constraints (non-negotiable)
        ↓
AI Reasoning (can override preliminary tier with explicit justification)
        ↓
Rule-Based Preliminary Tier (fallback reference)
```

**How the layers interact:**

1. The **Clinical Signal Engine** (offline, Data Pipeline) applies clinical guidelines (JNC 8, ACS, etc.) to produce hard constraints and soft signals — stored in the Signal Store. These are never overridable.
2. The **Program Selection Ruleset** (admin-configurable) maps signals to a preliminary program tier. This is the rule layer's "best guess" before AI reasoning.
3. The **AI Model** receives both via MCP, reasons over them, and proposes its own `ai_recommended_tier` and `add_ons[]`. It *may* override the preliminary tier — but must provide an explicit `reasoning_trace` justifying the deviation.
4. The **Safety Rule Validator** re-checks hard constraints post-inference. Any AI output violating a hard constraint is silently revoked (e.g. Mammogram for a male patient).

**What makes the hybrid mechanism visible to reviewers:**

The output schema carries both `rule_preliminary_tier` and `ai_recommended_tier` as distinct fields. The ROC Dashboard displays them side-by-side, making the hybrid mechanism explicit and the AI's decision auditable. Agreement or divergence is immediately apparent without requiring the reviewer to inspect logs.

***

### 2.2 MCP Integration & Hybrid ReAct Tool-Call Loop

The Inference Orchestrator runs a **two-phase ReAct loop**:

**Phase 1 — Fixed Baseline (mandatory, Orchestrator-driven):**

The Orchestrator — not the AI — always executes these calls in order before the AI model is invoked:

1. `get_hard_constraints` → establishes non-negotiable constraints for this patient
2. `get_clinical_signals` → retrieves risk flags, screening gaps, abnormal triggers
3. `get_biomarker_trends` → retrieves BMI trend, lab velocity, eGFR slope, BP category
4. `get_program_ruleset` → retrieves admin-configured program mapping rules

All four responses pass through PII Masking before being assembled into the initial context.

**Phase 2 — AI-Driven Extension (optional, AI-controlled):**

After receiving the initial context and prompt, the AI Model may issue additional tool calls during its reasoning loop (Thought → Tool Call → Observation → next Thought). This is the standard ReAct pattern. The MCP Server is designed for extension beyond the initial 4 tools to support future investigative queries (e.g., `get_family_history_flags`, `get_vaccination_status`, `get_symptom_mapping`).

**Loop safeguard:**

A hard cap on tool-call iterations is enforced by the Orchestrator. When the cap is reached, the Orchestrator signals the AI to finalize its output using the context assembled so far. The AI commits its best recommendation — it does not fall back to rule-only output. Graceful Degradation is triggered only by system failures, not by iteration limits (see §2.6).

**Read-only enforcement:**

MCP tools expose only read operations. No write path is exposed by the MCP Server. This is enforced at the protocol and database layer (read-only DB credentials for the MCP service account).

***

### 2.3 PII Masking & Rehydration

**Pseudonymization strategy:**

When MCP tool responses are returned during the ReAct loop, the PII Masking component intercepts the raw response and replaces known PII fields with stable per-request UUID v4 tokens before the context reaches the AI Gateway. The mapping is:

```
{ "patient_name": "Somchai Jaidee" }   →   { "patient_name": "pid_3f8a2b1c" }
{ "date_of_birth": "1975-04-12" }      →   { "date_of_birth": "dob_7e9c4d2a" }
{ "hn": "HN-00192837" }               →   { "hn": "hn_1a4b5c6d" }
```

The configurable PII field list covers: patient name, date of birth, hospital number (HN), national ID, address, phone number, and email. Clinical values (lab results, diagnoses, biomarker scores) are **not** masked — the AI needs them for accurate reasoning.

**Token scope and lifetime:**

The rehydration map (token → real value) is created at the start of the recommendation request and held in request-scoped memory only. It is never:

- Persisted to any database or file
- Included in Audit Logger entries (logs contain masked context only)
- Shared across requests

The map is explicitly cleared by the PII Rehydration component after the display-ready output is assembled, before the response is returned.

**Audit log implication:**

The Audit Logger receives post-masking context. This means the full prompt and context are auditable and immutable, but real patient identifiers can never be reconstructed from the logs alone — satisfying PDPA requirements without sacrificing AI audit transparency.

***

### 2.4 Pluggable AI (Gateway + Config)

**Model selection:**

A single AI model is designated "active" per deployment environment in the Model Config Store. The AI Gateway reads this configuration at inference time. Swapping models requires only an admin panel update — no code change, no redeployment.

The Model Config Store record contains: `model_id`, `provider`, `endpoint_url`, `api_key_ref` (pointer to secret manager, not the key itself), `max_tokens`, `temperature`, and `active: bool`.

**Prompt template management:**

Each supported model has its own prompt template stored in the Prompt Template Vault, version-tagged (e.g. `claude-3.5::v2`, `gpt-4o::v1`). The Prompt Template Selector loads the template corresponding to the active model's current version tag. Admins can author, review, and promote template versions via the Admin Panel without a code deploy. The Audit Logger records the template version used in every inference entry, enabling retrospective analysis of how template changes affected outputs.

**BAML for structured output:**

The AI Model is instructed to emit a BAML-constrained JSON response. BAML (Boundary AI Markup Language) generates a typed schema that is enforced at parse time by the Output Schema Validator. If the model emits malformed or incomplete output, the validator rejects it and triggers Graceful Degradation rather than passing a partial or hallucinated recommendation downstream.

***

### 2.5 Explainable AI Output Schema

The BAML schema defines the following fields:

```
RecommendationOutput {
  rule_preliminary_tier:  "Standard" | "Advanced" | "Premium"
  ai_recommended_tier:    "Standard" | "Advanced" | "Premium"
  add_ons: AddOnItem[]
  reasoning_trace:        string          // chain-of-thought, displayed on dashboard
  supporting_signals:     string[]        // signal IDs from Signal Store that drove this output
  missing_signals:        string[]        // expected signals with no data (feeds Patient High Alert)
  confidence_score:       float           // 0.0–1.0 (computed by Confidence Calibrator, not AI)
  confidence_tier:        "High" | "Medium" | "Low"
  review_required:        bool            // true when Graceful Degradation triggered
}

AddOnItem {
  item:           string
  rationale:      string
  priority_level: "Red" | "Yellow" | "Green"
}
```

**Confidence score computation (Confidence Calibrator):**

The `confidence_score` is computed deterministically after schema validation — not emitted by the AI. This avoids known AI miscalibration (over/under-confidence). The formula:

```
signal_coverage    = signals_fired / applicable_signals_for_this_patient
data_completeness  = populated_key_fields / total_key_fields
rule_agreement     = 1.0 if ai_recommended_tier == rule_preliminary_tier, else 0.7

confidence_score   = (0.4 × signal_coverage) + (0.4 × data_completeness) + (0.2 × rule_agreement)
```

Tier thresholds: High ≥ 0.75 · Medium ≥ 0.50 · Low < 0.50

**Missing signals → Patient High Alert:**

The `missing_signals[]` field lists clinical signals that were expected for this patient profile but returned no data from the Signal Store. These feed directly into the Patient High Alert section of the ROC Dashboard (TOR §3.3.2: "Dead Record / Missing Critical Data"), and partially explain lower confidence scores without requiring separate UI logic.

***

### 2.6 Safety Rule Validator

The Safety Rule Validator runs **after** the Output Schema Validator, before PII Rehydration. It re-fetches hard constraints from the Signal Store (via MCP) and evaluates each item in the AI's output against them.

**What it checks:**

- Gender/age eligibility constraints (e.g. Mammogram for female patients only; Colonoscopy threshold age)
- Package tier ceiling constraints (patient-specific maximum package tier from clinical risk profile)
- Any admin-configured safety rules (configurable per TOR §6.2)

**On violation:**

The violating item is silently removed from `add_ons[]` or the `ai_recommended_tier` is reverted to the constrained tier. A conflict event is written synchronously to the Audit Logger (recording: which constraint was violated, which AI output item was revoked, timestamp, user context). The resolved partial output continues downstream.

**UI exposure of violations:**

Violations are not surfaced in any UI view — neither the ROC Dashboard nor the SalesAdmin review screen. The constraint enforcement is transparent at the audit log level. SalesAdmin sees the clean resolved output.

***

### 2.7 Audit Logger

Every inference generates exactly one audit log entry. The log write is **synchronous** — it completes before the response is returned. No inference can escape the audit trail due to timing.

**5-dimension log record:**

| Dimension | Content                                                                                                                                                                      |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Who**   | User ID + role + SMART on FHIR session token                                                                                                                                 |
| **When**  | ISO 8601 timestamp (UTC)                                                                                                                                                     |
| **Where** | Service ID + source IP + request ID                                                                                                                                          |
| **What**  | Post-masking prompt · assembled context · AI model response · model ID · template version · MCP tool-call trace · latency (ms) · Safety Validator result · confidence\_score |
| **Why**   | Request context: patient session token (masked) + indication / reason code                                                                                                   |

**Immutability — SHA-256 hash chain:**

Each log entry is hashed (SHA-256) and includes the hash of the immediately preceding entry, forming a tamper-evident chain. Any deletion or modification of a historical entry breaks the chain from that point forward. The chain can be verified on demand for audit or compliance review. No delete or update operations are exposed on the log store.

**PII in logs:**

Log entries contain **post-masking context only**. Real patient identifiers (name, DOB, HN) never appear in any log entry. Pseudonymized tokens are present but are meaningless without the rehydration map — which is never persisted.

**Retention:**

Log retention period is admin-configurable to meet PDPA's legally required minimum. Auto-archival to long-term storage is policy-driven, not hardcoded.

***

## 3. Query-Time Data Flow Narrative

The following is the complete step-by-step flow for a single recommendation request at runtime.

```
1.  ROC Staff submits a recommendation request for a patient
2.  SMART on FHIR Auth validates the auth token and requested scope
        → Access denied? Return 401. 
        → Access granted? Proceed with scoped session.
3.  Inference Orchestrator begins — Phase 1 (fixed baseline):
     3a. Calls MCP: get_hard_constraints(patient_token)
     3b. Calls MCP: get_clinical_signals(patient_token)
     3c. Calls MCP: get_biomarker_trends(patient_token)
     3d. Calls MCP: get_program_ruleset()
4.  PII Masking intercepts all 4 MCP responses
        → Replaces PII fields with UUID tokens; builds request-scoped rehydration map
5.  Orchestrator assembles initial context from pseudonymized MCP responses
6.  AI Gateway reads active model config from Model Config Store
7.  Prompt Template Selector loads version-tagged template for the active model
8.  Phase 2 begins: Prompt + initial context sent to AI Model
9.  AI Model reasons (chain-of-thought), may issue additional MCP tool calls
        → Each tool call response passes through PII Masking before returning to AI
        → Orchestrator enforces max iterations cap; on limit, AI finalizes with current context
10. AI Model emits BAML-structured output
11. Output Schema Validator enforces BAML schema
        → Schema fail? → Graceful Degradation (step 14)
12. Confidence Calibrator computes confidence_score + confidence_tier
13. Audit Logger writes synchronous log entry (masked context, full round-trip)
14. Safety Rule Validator re-checks hard constraints against AI output
        → Violation? Revoke item, log conflict, pass partial output forward
        → Graceful Degradation (gateway error / schema fail / max iterations):
           re-query Signal Store + Ruleset Store → rule-only output + review_required:true
        → No issue? Full output passes through
15. PII Rehydration re-attaches real patient identifiers using rehydration map
        → Rehydration map discarded immediately
16. Display-ready output delivered to:
        → ROC Dashboard: ai_recommended_tier, rule_preliminary_tier side-by-side,
          reasoning_trace, add_ons[], confidence_score + tier, missing_signals[]
        → Personalized Checkup Plan + Communication Script
17. SalesAdmin reviews and approves or rejects
        → Approved → forwarded to External System (Order / Booking)
        → Rejected → rejection reason written to Feedback Store
```

***

## 4. Requirement Coverage Matrix

| POC Evaluation Criterion                                                                                         | Weight | Components Directly Covering It                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hybrid mechanism (Rule-Based + AI) + MCP read-only, Least Privilege**                                          | 35%    | MCP Server (read-only) · Inference Orchestrator (baseline + extension loop) · AI Model (reasoning over signals) · Safety Rule Validator (hard constraints always win) · Output schema (`rule_preliminary_tier` + `ai_recommended_tier` side-by-side)                       |
| **Pluggable AI architecture (config-driven model swap) + FHIR terminology mapping**                              | 25%    | AI Gateway (single active model per env, config-driven) · Prompt Template Selector (version-tagged per model) · Output Schema Validator (BAML schema) · Model Config Store + Prompt Template Vault (admin-configurable, no code change)                                    |
| **XAI: Reasoning + Confidence Score + historical trend display**                                                 | 20%    | AI Model (`reasoning_trace` + `supporting_signals[]` + `missing_signals[]`) · Confidence Calibrator (deterministic `confidence_score` + `confidence_tier`) · Output schema (structured, displayable fields) · Graceful Degradation (`review_required` flag for edge cases) |
| **Security: Data Masking / Pseudo-anonymization + Audit Log (5-dim, immutable, Prompt/Context) + SMART on FHIR** | 20%    | SMART on FHIR Auth (scope-based access) · PII Masking (pseudonymization, request-scoped) · PII Rehydration (map discarded post-response) · Audit Logger (5-dim, SHA-256 hash chain, synchronous, masked context only)                                                      |

***

