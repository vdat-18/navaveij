"""
Smart Health Checkup Recommendation Dashboard — POC Backend
FastAPI app serving 4 endpoints for the 3-screen demo.

Endpoints:
  POST /api/recommend           — MCP tool calls → Claude API → Stage 2 enriched output
  GET  /api/timeline/{token}    — Patient clinical event timeline (Screen 2)
  GET  /api/monitoring-snapshot — Live metrics snapshot (Screen 3)
  GET  /api/audit-logs          — Filtered audit log search (Screen 3)

Environment variables (.env):
  ANTHROPIC_API_KEY    — Claude API key (required when AI_ACTIVE_CLIENT=claude)
  OPENAI_API_KEY       — OpenAI API key (required when AI_ACTIVE_CLIENT=gpt4o)
  AI_ACTIVE_CLIENT     — "claude" (default) | "gpt4o"
  AI_MODEL_CLAUDE      — default: claude-sonnet-4-6
  AI_MODEL_GPT4O       — default: gpt-4o-mini

Usage:
  pip install -r requirements.txt
  uvicorn main:app --reload --port 8000
"""

import json
import os
import time
import uuid
from pathlib import Path
from typing import Any, Optional

import anthropic
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Navavej Recommendation Dashboard — POC API",
    version="3.0.0",
    description="AI-powered health checkup recommendation engine (POC)",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Data fixtures (mock MCP layer)
# ---------------------------------------------------------------------------
DATA_DIR = Path(__file__).parent / "data"


def _load(filename: str) -> dict:
    with open(DATA_DIR / filename, encoding="utf-8") as f:
        return json.load(f)


SIGNALS_DATA = _load("signals.json")
RULESET_DATA = _load("ruleset.json")
TIMELINE_DATA = _load("timeline.json")
MONITORING_DATA = _load("monitoring.json")


# ---------------------------------------------------------------------------
# Mock MCP tool functions
# ---------------------------------------------------------------------------

def get_hard_constraints(patient_token: str) -> dict:
    """MCP tool 1: gender/age exclusions, safety flags, tier ceiling."""
    return SIGNALS_DATA["hard_constraints"]


def get_clinical_signals(patient_token: str) -> dict:
    """MCP tool 2: risk flags, screening gaps, vaccination gaps."""
    return SIGNALS_DATA["clinical_signals"]


def get_biomarker_trends(patient_token: str) -> dict:
    """MCP tool 3: lab history arrays, trend direction, slope."""
    return SIGNALS_DATA["biomarker_trends"]


def get_program_ruleset(tier: str, gender: str, age: int) -> dict:
    """MCP tool 4: package resolution map, add-on item library."""
    return RULESET_DATA


# ---------------------------------------------------------------------------
# AI client factory
# ---------------------------------------------------------------------------

def _active_model_id() -> tuple[str, str]:
    """Returns (provider, model_id) based on AI_ACTIVE_CLIENT env var."""
    client = os.getenv("AI_ACTIVE_CLIENT", "claude").lower()
    if client == "gpt4o":
        return "openai", os.getenv("AI_MODEL_GPT4O", "gpt-4o-mini")
    return "anthropic", os.getenv("AI_MODEL_CLAUDE", "claude-sonnet-4-6")


def _build_prompt(
    hard_constraints: dict,
    clinical_signals: dict,
    biomarker_trends: dict,
    program_ruleset: dict,
) -> str:
    """Builds the system prompt from BAML GenerateRecommendation template."""
    return f"""You are a clinical decision-support AI integrated into a health checkup recommendation
platform at a Thai international hospital. Your role is to reason over pre-computed
patient health signals and produce a structured, evidence-based health checkup
recommendation.

You operate under a Hybrid Rule + AI model:
- A rule-based Clinical Signal Engine has already produced a rule_preliminary_tier
  from the patient's signals. This is your baseline.
- You may confirm or deviate from this baseline, but if you deviate you MUST
  provide an explicit clinical justification in tier_deviation_justification.
- Hard constraints (gender/age eligibility, active safety flags) are
  NON-NEGOTIABLE and must never be overridden. They appear in hard_constraints.

── PATIENT DATA (PII-MASKED) ──────────────────────────────────────────────

HARD CONSTRAINTS (eligibility exclusions + active safety flags):
{json.dumps(hard_constraints, indent=2)}

CLINICAL SIGNALS (risk flags, screening gaps, vaccination gaps, comorbidities,
family history, behavioral flags, symptom tags):
{json.dumps(clinical_signals, indent=2)}

BIOMARKER TRENDS (current lab values, trend directions, velocities, eGFR slope,
BMI trend, BP history, ASCVD 10-year risk):
{json.dumps(biomarker_trends, indent=2)}

PROGRAM RULESET (tier selection rules, resolved package, add-on library):
{json.dumps(program_ruleset, indent=2)}

── INSTRUCTIONS ───────────────────────────────────────────────────────────

Step 1 — Tier determination
  Read the rule_preliminary_tier and evaluate whether it is clinically appropriate
  given the full signal picture. Confirm or provide a justified deviation.
  The resolved_package shows the specific Navavej package (name + price) for the
  preliminary tier — reference this in your reasoning.

Step 2 — Add-on selection
  From the add_on_library in program_ruleset, select add-ons where the patient's
  signals_fired intersect with trigger_signals. Only select items present in the
  pre-filtered add_on_library.
  Assign priority_level based on clinical urgency:
    Red    — significantly overdue, first-time never-done, or high-severity trigger
    Orange — moderately overdue or approaching due date
    Yellow — clinically indicated, routine scheduling
    Green  — shared decision-making, low urgency
  Write a patient-specific rationale for each add-on that cites the actual signal
  values, trend data, overdue duration, and relevant guideline(s).
  Order add-ons: Red first, then Orange, Yellow, Green.

Step 3 — Reasoning trace
  Write a structured chain-of-thought covering:
    a) Tier determination (which rule matched, why you agree or deviate)
    b) Each major signal cluster (metabolic, cardiovascular, cancer screening,
       vaccination, kidney/liver, occupational, missing signals)
    c) Any clinical nuance
  Reference specific values: FBS velocity, eGFR slope, overdue_days, pack-years.
  Name guidelines by source and year.
  Minimum 150 words. No real PII — use only the pseudonymized tokens as given.

Step 4 — Supporting and missing signals
  List signal IDs that drove your decisions in supporting_signals (subset of signals_fired).
  List signal IDs with no source data in missing_signals.

Step 5 — Communication script
  Write a patient-facing communication guide in friendly, non-technical hospital style.
  Cover: opening, health_summary, recommendation_explanation, add_on_highlights
  (one entry per Red/Orange add-on only), next_steps.

── OUTPUT FORMAT ──────────────────────────────────────────────────────────

Respond with a single valid JSON object matching this exact structure:
{{
  "ai_recommended_tier": "Standard" | "Advanced" | "Premium",
  "tier_deviation_justification": null | "string explaining deviation",
  "add_ons": [
    {{
      "item_code": "string (must match item_code from add_on_library)",
      "priority_level": "Red" | "Orange" | "Yellow" | "Green",
      "rationale": "patient-specific clinical justification (min 2 sentences)"
    }}
  ],
  "reasoning_trace": "full chain-of-thought (min 150 words)",
  "supporting_signals": ["signal_id_1", "signal_id_2"],
  "missing_signals": ["signal_id_1"],
  "communication_script": {{
    "opening": "string",
    "health_summary": "string",
    "recommendation_explanation": "string",
    "add_on_highlights": ["string per Red/Orange add-on"],
    "next_steps": "string"
  }}
}}

CRITICAL CONSTRAINTS:
- item_code values must EXACTLY match item_code values in the add_on_library above.
- Do NOT include: rule_preliminary_tier, resolved_package, confidence_score, patient_high_alert, metadata.
- tier_deviation_justification must be null when ai_recommended_tier matches rule_preliminary_tier.
- Every add-on rationale must be patient-specific (cite actual values), not generic.
- Output ONLY the JSON object — no markdown fences, no explanation text."""


def _call_claude(prompt: str, model_id: str) -> str:
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    message = client.messages.create(
        model=model_id,
        max_tokens=4096,
        temperature=0.2,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


def _call_openai(prompt: str, model_id: str) -> str:
    import openai
    client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    response = client.chat.completions.create(
        model=model_id,
        max_tokens=4096,
        temperature=0.2,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content


def _call_ai(prompt: str) -> tuple[str, str, str]:
    """Returns (raw_text, provider, model_id)."""
    provider, model_id = _active_model_id()
    if provider == "openai":
        return _call_openai(prompt, model_id), provider, model_id
    return _call_claude(prompt, model_id), provider, model_id


# ---------------------------------------------------------------------------
# Stage 2 enrichment
# ---------------------------------------------------------------------------

def _enrich_stage2(stage1: dict, model_id: str, latency_ms: int, ruleset: dict) -> dict:
    """Inject all system-computed Stage 2 fields into the AI Stage 1 output."""
    clinical_signals = SIGNALS_DATA["clinical_signals"]
    signals_fired = set(clinical_signals.get("signals_fired", []))

    # Build add-on lookup from ruleset
    addon_map = {item["item_code"]: item for item in ruleset.get("add_on_library", [])}

    # Enrich each add-on
    enriched_addons = []
    for addon in stage1.get("add_ons", []):
        item_code = addon.get("item_code", "")
        meta = addon_map.get(item_code, {})
        product = meta.get("navavej_product", {})
        trigger_signals = meta.get("trigger_signals", [])
        enriched_addons.append({
            **addon,
            "label": meta.get("label", item_code),
            "category": meta.get("category", "unknown"),
            "navavej_product": product,
            "trigger_signals_matched": [s for s in trigger_signals if s in signals_fired],
        })

    # Confidence score (deterministic formula from component-inventory §2.5)
    # signal_coverage = signals_fired / applicable_signals (capped at 1)
    applicable = len(clinical_signals.get("applicable_signals",
                     clinical_signals.get("signals_fired", []))) or 1
    signal_coverage = min(len(signals_fired) / applicable, 1.0)
    # data_completeness = 1 - (missing / (missing + fired))
    missing_count = len(clinical_signals.get("missing_signals", []))
    total = len(signals_fired) + missing_count or 1
    data_completeness = len(signals_fired) / total
    # rule_agreement = 1.0 if AI tier matches rule tier, 0.5 otherwise
    rule_tier = ruleset.get("rule_preliminary_tier", "Advanced")
    ai_tier = stage1.get("ai_recommended_tier", "Advanced")
    rule_agreement = 1.0 if rule_tier == ai_tier else 0.5
    confidence_score = round(
        0.4 * signal_coverage + 0.4 * data_completeness + 0.2 * rule_agreement, 3
    )
    if confidence_score >= 0.75:
        confidence_tier = "High"
    elif confidence_score >= 0.50:
        confidence_tier = "Medium"
    else:
        confidence_tier = "Low"

    # Patient high alert
    critical_signals = [
        f["flag_id"]
        for f in clinical_signals.get("risk_flags", [])
        if f.get("severity") == "High"
    ]
    if not critical_signals:
        # Fall back to high-priority screening gaps
        critical_signals = [
            g["screening_id"]
            for g in clinical_signals.get("screening_gaps", [])
            if g.get("priority_color") == "Red"
        ]
    missing_data_alerts = clinical_signals.get("missing_signals", [])

    return {
        **stage1,
        "add_ons": enriched_addons,
        "rule_preliminary_tier": rule_tier,
        "resolved_package": ruleset.get("resolved_package", {}),
        "confidence_score": confidence_score,
        "confidence_tier": confidence_tier,
        "review_required": confidence_score < 0.50,
        "recommendation_source": "AI",
        "patient_high_alert": {
            "critical_signals": critical_signals,
            "missing_data_alerts": missing_data_alerts,
        },
        "metadata": {
            "request_id": f"req-{uuid.uuid4().hex[:12]}",
            "model_id": model_id,
            "template_version": "v3.1",
            "ruleset_version": ruleset.get("ruleset_version", "v2026.03.1"),
            "latency_ms": latency_ms,
            "computed_at": ruleset.get("computed_at", ""),
            "pipeline_run_id": ruleset.get("pipeline_run_id", ""),
        },
    }


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class RecommendRequest(BaseModel):
    patient_token: str = "tok_hmac_56291047"


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok", "version": "3.0.0"}


@app.post("/api/recommend")
def recommend(req: RecommendRequest) -> dict[str, Any]:
    """
    Main recommendation endpoint.
    Phase 1: fixed MCP baseline calls → Phase 2: AI inference → Stage 2 enrichment.
    """
    token = req.patient_token

    # Phase 1 — MCP baseline calls (all 4 tools, sequential per spec)
    hard_constraints = get_hard_constraints(token)
    clinical_signals = get_clinical_signals(token)
    biomarker_trends = get_biomarker_trends(token)

    # Determine preliminary tier from signals for ruleset call
    tier = clinical_signals.get("rule_preliminary_tier", "Advanced")
    gender = hard_constraints.get("patient_demographics", {}).get("gender", "male")
    age = hard_constraints.get("patient_demographics", {}).get("age", 54)
    program_ruleset = get_program_ruleset(tier, gender, age)

    # Phase 2 — AI inference
    prompt = _build_prompt(hard_constraints, clinical_signals, biomarker_trends, program_ruleset)
    start_ms = int(time.time() * 1000)

    try:
        raw_text, provider, model_id = _call_ai(prompt)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI call failed: {exc}") from exc

    latency_ms = int(time.time() * 1000) - start_ms

    # Parse Stage 1 JSON
    try:
        # Strip markdown fences if model includes them
        clean = raw_text.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        stage1 = json.loads(clean.strip())
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"AI output was not valid JSON: {exc}. Raw: {raw_text[:500]}",
        ) from exc

    # Stage 2 enrichment
    result = _enrich_stage2(stage1, model_id, latency_ms, program_ruleset)
    return result


@app.get("/api/timeline/{patient_token}")
def get_timeline(patient_token: str) -> dict[str, Any]:
    """Returns the clinical event timeline for Screen 2."""
    return TIMELINE_DATA


@app.get("/api/monitoring-snapshot")
def monitoring_snapshot() -> dict[str, Any]:
    """Returns live metrics snapshot for Screen 3 Panel A."""
    snapshot = dict(MONITORING_DATA["snapshot"])
    snapshot["snapshot_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    return snapshot


@app.get("/api/audit-logs")
def audit_logs(
    user_id: Optional[str] = Query(None),
    patient_token_prefix: Optional[str] = Query(None),
    action_type: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
) -> dict[str, Any]:
    """Filtered audit log search for Screen 3 Panel C."""
    logs = MONITORING_DATA["audit_logs"]
    results = []
    for entry in logs:
        who = entry.get("who", {})
        what = entry.get("what", {})
        when = entry.get("when", {})
        ts = when.get("iso_timestamp_utc", "")

        if user_id and who.get("user_id") != user_id:
            continue
        if patient_token_prefix:
            pt = what.get("patient_token", "") or ""
            if not pt.startswith(patient_token_prefix):
                continue
        if action_type and what.get("action_type") != action_type:
            continue
        if resource_type and what.get("resource_type") != resource_type:
            continue
        if start_date and ts < start_date:
            continue
        if end_date and ts > end_date:
            continue
        results.append(entry)

    return {"total": len(results), "entries": results}


@app.get("/api/anomaly-alerts")
def anomaly_alerts() -> dict[str, Any]:
    """Returns current anomaly alerts for Screen 3 Panel B."""
    return {"alerts": MONITORING_DATA["anomaly_alerts"]}


@app.get("/api/rbac")
def rbac() -> dict[str, Any]:
    """Returns role definitions for Screen 3 Role Management tab."""
    return {"roles": MONITORING_DATA["rbac_roles"]}


@app.get("/api/mapping-codes")
def mapping_codes() -> dict[str, Any]:
    """Returns LOINC/ICD-10 mapping codes for Screen 3 Mapping Tool tab."""
    return {"mappings": MONITORING_DATA["mapping_codes"]}


@app.get("/api/master-programs")
def master_programs() -> dict[str, Any]:
    """Returns checkup package master data for Screen 3 Master Data tab."""
    return {"programs": MONITORING_DATA["master_programs"]}
