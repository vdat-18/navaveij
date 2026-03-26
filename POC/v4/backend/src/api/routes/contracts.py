import asyncio
import hashlib
import json
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from shared.settings import settings
from src.api.routes.patients import find_patient_by_token, load_registry
from src.api.security import AuthContext, parse_roles, require_access
from src.mcp_server.tools.biomarker_trends import get_biomarker_trends
from src.mcp_server.tools.clinical_signals import get_clinical_signals
from src.mcp_server.tools.patient_event_timeline import get_patient_event_timeline
from src.mcp_server.tools.program_ruleset import get_program_ruleset
from src.mcp_server.utils import load_ruleset_add_on_items, resolve_patient_id
from src.services.cache import cache_service
from src.services.orchestrator import OrchestrationManager
from src.services.discounts import calculate_discounts

router = APIRouter()
orchestrator = OrchestrationManager()


class RecommendRequest(BaseModel):
    patient_token: str
    force_rule_based: bool = False


class RecommendResponse(BaseModel):
    overall_risk_level: str
    ai_recommended_tier: str
    tier_deviation_justification: str | None
    add_ons: list[dict[str, Any]]
    reasoning_trace: str
    supporting_signals: list[str]
    missing_signals: list[str]
    communication_script: dict[str, Any]
    rule_preliminary_tier: str
    resolved_package: dict[str, Any]
    confidence_score: float
    confidence_tier: str
    signal_coverage: float
    data_completeness: float
    rule_agreement: float
    review_required: bool
    recommendation_source: str
    recommendation_hash: str | None = None
    patient_high_alert: dict[str, Any]
    security_metadata: dict[str, Any]
    eligible_discounts: list[dict[str, Any]]
    applied_discounts: list[dict[str, Any]]
    original_price_thb: float
    final_price_thb: float
    total_savings_thb: float
    discount_override_allowed: bool
    metadata: dict[str, Any]


class TimelineResponse(BaseModel):
    patient_token: str
    timeline_span: dict[str, Any]
    diagnoses: list[dict[str, Any]]
    hospitalizations: list[dict[str, Any]]
    significant_lab_events: list[dict[str, Any]]
    screening_procedure_history: list[dict[str, Any]]
    medication_changes: list[dict[str, Any]]
    pipeline_run_id: str
    computed_at: str


class MonitoringSnapshotResponse(BaseModel):
    snapshot_at: str
    refresh_interval_seconds: int
    active_users_now: int
    sessions_today: int
    patient_records_accessed_today: int
    ai_recommendations_generated_today: int
    alert_counts: dict[str, int]
    safety_validator_failures_today: int
    top_active_departments: list[dict[str, Any]]


class AuditLogsResponse(BaseModel):
    total: int
    entries: list[dict[str, Any]]


class AnomalyAlertsResponse(BaseModel):
    alerts: list[dict[str, Any]]


class RbacResponse(BaseModel):
    roles: list[dict[str, Any]]


class MappingCodesResponse(BaseModel):
    mappings: list[dict[str, Any]]


class MasterProgramsResponse(BaseModel):
    programs: list[dict[str, Any]]


class MasterAddOnsResponse(BaseModel):
    add_ons: list[dict[str, Any]]


class BamlClientInfo(BaseModel):
    name: str
    provider: str
    model: str
    status: str


class McpToolInfo(BaseModel):
    name: str
    type: str
    description: str


class SystemConfigResponse(BaseModel):
    active_client: str
    all_clients: list[BamlClientInfo]
    mcp_tools: list[McpToolInfo]
    auth_mode: str
    template_version: str


MONITORING_FIXTURE_PATH = Path(__file__).resolve().parents[4] / "assets" / "monitoring.json"
MONITORING_ALLOWED_ROLES = parse_roles(settings.monitoring_allowed_roles)
RECOMMENDATION_ALLOWED_ROLES = parse_roles(settings.recommendation_allowed_roles)


def _resolve_patient_by_token(patient_token: str) -> dict[str, Any]:
    patient = find_patient_by_token(patient_token)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient token not found")
    return patient


def _patient_token_map() -> dict[str, str]:
    return {item.get("patient_id"): item.get("patient_token") for item in load_registry()}


def _token_to_patient_id_map() -> dict[str, str]:
    return {token: pid for pid, token in _patient_token_map().items()}


def _read_audit_logs() -> list[dict[str, Any]]:
    return orchestrator.audit_logger.get_logs()


def _load_monitoring_fixture() -> dict[str, Any]:
    if MONITORING_FIXTURE_PATH.exists():
        with open(MONITORING_FIXTURE_PATH, encoding="utf-8") as handle:
            return json.load(handle)
    return {
        "snapshot": {
            "snapshot_at": "",
            "refresh_interval_seconds": 30,
            "active_users_now": 0,
            "sessions_today": 0,
            "patient_records_accessed_today": 0,
            "ai_recommendations_generated_today": 0,
            "alert_counts": {"critical": 0, "high": 0, "medium": 0, "low": 0},
            "safety_validator_failures_today": 0,
            "top_active_departments": [],
        },
        "anomaly_alerts": [],
        "rbac_roles": [],
        "mapping_codes": [],
        "master_programs": [],
    }


MONITORING_FIXTURE = _load_monitoring_fixture()
require_monitoring_access = require_access(
    allowed_roles=MONITORING_ALLOWED_ROLES,
    required_scopes={
        scope.strip().lower() for scope in settings.monitoring_required_scopes.split(",") if scope.strip()
    },
)
require_recommendation_access = require_access(
    allowed_roles=RECOMMENDATION_ALLOWED_ROLES,
    required_scopes={
        scope.strip().lower() for scope in settings.recommendation_required_scopes.split(",") if scope.strip()
    },
)


def _to_ict_timestamp(utc_value: str) -> str:
    if not utc_value:
        return ""
    try:
        dt = datetime.fromisoformat(utc_value.replace("Z", "+00:00"))
    except ValueError:
        return utc_value
    local = dt.astimezone(timezone.utc).astimezone()
    return local.isoformat()


def _stable_hash_payload(entry: dict[str, Any]) -> str:
    payload = {
        "prev_entry_hash": entry.get("prev_entry_hash"),
        "who": entry.get("who", {}),
        "when": entry.get("when", {}),
        "where": entry.get("where", {}),
        "what": entry.get("what", {}),
        "why": entry.get("why", {}),
        "retention_expiry": entry.get("retention_expiry"),
    }
    payload_json = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload_json.encode("utf-8")).hexdigest()


def _normalize_runtime_audit_entries() -> list[dict[str, Any]]:
    token_by_patient_id = _patient_token_map()
    normalized: list[dict[str, Any]] = []
    previous_hash = "0" * 64
    for index, entry in enumerate(_read_audit_logs(), start=1):
        who = entry.get("who", {})
        where = entry.get("where", {})
        what = entry.get("what", {})
        why = entry.get("why", {})
        timestamp = entry.get("timestamp", "")
        request_context = why.get("request_context", {}) if isinstance(why.get("request_context"), dict) else {}
        patient_id = request_context.get("patient_id")
        patient_token = token_by_patient_id.get(patient_id)
        if not patient_token:
            patient_token = request_context.get("patient_token")
        patient_token_masked = None
        if patient_token:
            patient_token_masked = f"{patient_token[:12]}****{patient_token[-2:]}"
        action_type = request_context.get("action_type") or what.get("event", "Generate")
        if action_type == "PROVISIONING_DECISION":
            action_type = "Decision"
        record = {
            "entry_id": f"alog-runtime-{index:06d}",
            "prev_entry_hash": entry.get("previous_hash") or previous_hash,
            "who": {
                "user_id": who.get("user_id") or who.get("physician_id") or "usr-clinician-001",
                "user_display_name": "POC Clinician",
                "user_role": who.get("user_role") or "physician",
                "department": "Health Checkup Center",
            },
            "when": {
                "iso_timestamp_utc": timestamp,
                "local_timestamp_ict": _to_ict_timestamp(timestamp),
            },
            "where": {
                "service_id": where.get("service_id") or "recommendation-dashboard-ui",
                "source_ip_hash": where.get("client_ip") or "sha256_source_ip_runtime",
                "request_id": request_context.get("request_id") or f"req-runtime-{index:06d}",
                "user_agent_class": "web_browser",
            },
            "what": {
                "action_type": action_type,
                "resource_type": what.get("resource_type", "RecommendationOutput"),
                "patient_token": patient_token,
                "patient_token_masked": patient_token_masked,
                "patient_id": patient_id,
                "model_id": what.get("model_id") or entry.get("how", {}).get("model_id"),
                "template_version": "v1.0",
                "latency_ms": what.get("latency_ms"),
                "safety_validator_result": "pass",
                "recommendation_source": "AI",
            },
            "why": {
                "request_context": request_context or "Runtime clinical action",
                "indication_code": action_type,
            },
            "retention_expiry": "2029-12-31",
            "raw": entry,
        }
        record["sha256_hash"] = _stable_hash_payload(record)
        previous_hash = record["sha256_hash"]
        normalized.append(record)
    return normalized


def _audit_dataset() -> list[dict[str, Any]]:
    runtime = _normalize_runtime_audit_entries()
    if runtime:
        return runtime
    fixture_logs = MONITORING_FIXTURE.get("audit_logs", [])
    normalized = []
    previous_hash = "0" * 64
    for item in fixture_logs:
        record = dict(item)
        record["prev_entry_hash"] = record.get("prev_entry_hash") or previous_hash
        record["sha256_hash"] = _stable_hash_payload(record)
        previous_hash = record["sha256_hash"]
        normalized.append(record)
    return normalized


def _filter_audit_entries(
    *,
    user_id: str | None,
    patient_id: str | None,
    action_type: str | None,
    resource_type: str | None,
    start_date: str | None,
    end_date: str | None,
) -> list[dict[str, Any]]:
    token_to_pid = _token_to_patient_id_map()
    logs = _audit_dataset()
    results: list[dict[str, Any]] = []
    for entry in logs:
        who = entry.get("who", {})
        what = entry.get("what", {})
        when = entry.get("when", {})
        timestamp = when.get("iso_timestamp_utc", "")
        if "patient_id" not in what:
            what["patient_id"] = token_to_pid.get(what.get("patient_token") or "")
        if user_id and who.get("user_id") != user_id:
            continue
        if patient_id and what.get("patient_id") != patient_id:
            continue
        if action_type and what.get("action_type") != action_type:
            continue
        if resource_type and what.get("resource_type") != resource_type:
            continue
        if start_date and timestamp < start_date:
            continue
        if end_date and timestamp > end_date:
            continue
        results.append(entry)
    return results


def _map_communication_script(script: dict[str, Any]) -> dict[str, Any]:
    opening = (
        script.get("opening")
        or script.get("clinical_conclusion")
        or script.get("health_summary")
        or "Clinical recommendation summary."
    )
    return {
        "opening": opening,
        "health_summary": script.get("health_summary", ""),
        "recommendation_explanation": script.get("recommendation_rationale")
        or script.get("recommendation_explanation", ""),
        "add_on_highlights": script.get("addon_highlights") or script.get("add_on_highlights", []),
        "next_steps": script.get("next_steps", ""),
    }


def _build_missing_data_alerts(missing_signals: list[str]) -> list[dict[str, str]]:
    return [
        {
            "signal_id": signal_id,
            "label": signal_id.replace("_", " ").title(),
            "recommendation_impact": "Signal input is missing and may reduce recommendation precision.",
        }
        for signal_id in missing_signals
    ]


def _build_critical_signals(clinical_signals: dict[str, Any]) -> list[dict[str, str]]:
    critical = []
    for flag in clinical_signals.get("risk_flags", []):
        severity = flag.get("severity", "")
        normalized_severity = severity.lower()
        if normalized_severity not in {"high", "critical"}:
            continue
        sources = ", ".join(flag.get("source_signals", []))
        critical.append(
            {
                "signal_id": flag.get("flag_id", ""),
                "label": flag.get("label", ""),
                "severity": "Critical" if normalized_severity == "critical" else "High",
                "clinical_note": f"{flag.get('guideline', '')} | source_signals: {sources}",
            }
        )
    return critical


def _validate_stage1_output(
    *,
    ai_output: dict[str, Any],
    ruleset: dict[str, Any],
    clinical_signals: dict[str, Any],
) -> list[str]:
    failures: list[str] = []

    add_ons = ai_output.get("add_ons", []) or []
    supporting_signals = ai_output.get("supporting_signals", []) or []
    output_signals = ai_output.get("clinical_signals", {}) or {}

    signals_fired = output_signals.get("signals_fired")
    if signals_fired is None:
        signals_fired = clinical_signals.get("signals_fired", [])
    applicable_signals = output_signals.get("applicable_signals")
    if applicable_signals is None:
        applicable_signals = clinical_signals.get("applicable_signals", [])

    library = ruleset.get("add_on_library", []) or []
    library_by_id = {
        item.get("item_id") or item.get("item_code"): item
        for item in library
        if item.get("item_id") or item.get("item_code")
    }

    for item in add_ons:
        item_id = item.get("item_id") or item.get("item_code")
        if not item_id or item_id not in library_by_id:
            failures.append("V2:item_id_not_in_ruleset")
            continue
        expected_price = (library_by_id.get(item_id, {}).get("navavej_product") or {}).get("price_thb")
        candidate_price = item.get("price_thb")
        if candidate_price is not None and candidate_price != expected_price:
            failures.append("V10:price_thb_mismatch")

    valid_signals = set(applicable_signals or [])
    for signal in supporting_signals:
        if signal not in valid_signals:
            failures.append("V7:supporting_signal_invalid")
            break

    if signals_fired and not add_ons:
        failures.append("V9:add_ons_empty_with_triggers")

    return sorted(set(failures))


def _normalize_mapping_codes(raw_mappings: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized = []
    for index, mapping in enumerate(raw_mappings, start=1):
        local_code = mapping.get("local_code", "")
        local_system = mapping.get("local_system", "")
        target_system = mapping.get("target_system") or mapping.get("standard_system", "")
        target_code = mapping.get("target_code") or mapping.get("standard_code", "")
        target_label = mapping.get("target_label") or mapping.get("display", "")
        item = {
            "mapping_id": mapping.get("mapping_id") or f"map-{index:04d}",
            "local_system": local_system,
            "local_code": local_code,
            "local_label": mapping.get("local_label") or mapping.get("display", local_code),
            "target_system": target_system,
            "target_code": target_code,
            "target_label": target_label,
            "mapping_type": mapping.get("mapping_type", "exact"),
            "status": mapping.get("status", "active"),
            "validated_by_user_id": mapping.get("validated_by_user_id", ""),
            "validated_at": mapping.get("validated_at", ""),
            "last_updated_by_user_id": mapping.get("last_updated_by_user_id", ""),
            "last_updated_at": mapping.get("last_updated_at", ""),
            "notes": mapping.get("notes", ""),
            "standard_system": mapping.get("standard_system", target_system),
            "standard_code": mapping.get("standard_code", target_code),
            "display": mapping.get("display", target_label),
        }
        normalized.append(item)
    return normalized


def _confidence_tier(score: float) -> str:
    if score >= 0.75:
        return "High"
    if score >= 0.50:
        return "Medium"
    return "Low"


def _normalize_stage2(
    *,
    patient_token: str,
    ai_output: dict[str, Any],
    ruleset: dict[str, Any],
    latency_ms: int,
) -> dict[str, Any]:
    clinical_signals = ai_output.get("clinical_signals", {})
    signals_fired = set(clinical_signals.get("signals_fired", []))
    missing_signals = ai_output.get("missing_signals", [])
    applicable_signals = clinical_signals.get("applicable_signals", [])
    rule_preliminary_tier = ruleset.get(
        "rule_preliminary_tier",
        clinical_signals.get("rule_preliminary_tier", "Standard"),
    )
    ai_tier = ai_output.get("ai_recommended_tier", "Standard")

    addon_map = {item.get("item_code") or item.get("item_id"): item for item in ruleset.get("add_on_library", [])}
    enriched_add_ons = []
    for item in ai_output.get("add_ons", []):
        item_id = item.get("item_id") or item.get("item_code", "")
        meta = addon_map.get(item_id, {})
        trigger_signals = meta.get("trigger_signals", [])
        product = meta.get("navavej_product", {})
        enriched_add_ons.append(
            {
                "item_code": item_id,
                "item_id": item_id,
                "priority_level": item.get("priority") or item.get("priority_level", "Yellow"),
                "priority": item.get("priority") or item.get("priority_level", "Yellow"),
                "rationale": item.get("rationale", ""),
                "label": item.get("label") or meta.get("label", item_id),
                "product_code": item.get("product_code") or product.get("product_code", ""),
                "price_thb": item.get("price_thb", product.get("price_thb")),
                "category": item.get("category") or meta.get("category", "other"),
                "navavej_product": meta.get(
                    "navavej_product",
                    {
                        "product_name": "",
                        "product_code": "",
                        "price_thb": None,
                    },
                ),
                "trigger_signals_matched": [s for s in trigger_signals if s in signals_fired],
            }
        )

    expected_signal_ids = set(applicable_signals or [])
    missing_signal_ids = set(missing_signals or [])
    observed_signal_ids = signals_fired | set(ai_output.get("supporting_signals", []) or [])
    if expected_signal_ids:
        signals_with_data = len(expected_signal_ids - missing_signal_ids)
        total_expected_signals = len(expected_signal_ids)
    else:
        signals_with_data = len(observed_signal_ids)
        total_expected_signals = len(observed_signal_ids) + len(missing_signal_ids)
    signal_coverage = signals_with_data / max(total_expected_signals, 1)

    required_fields = {
        "ai_recommended_tier": ai_output.get("ai_recommended_tier"),
        "add_ons": ai_output.get("add_ons"),
        "communication_script": ai_output.get("communication_script"),
        "clinical_signals": ai_output.get("clinical_signals"),
        "reasoning_trace": ai_output.get("reasoning_trace"),
    }

    def _field_present(name: str, value: Any) -> bool:
        if value is None:
            return False
        if name in {"communication_script", "clinical_signals"}:
            return isinstance(value, dict) and len(value) > 0
        if name == "reasoning_trace":
            return isinstance(value, str) and bool(value.strip())
        return True

    required_fields_present = sum(1 for name, value in required_fields.items() if _field_present(name, value))
    data_completeness = required_fields_present / len(required_fields)
    rule_agreement = 1.0 if ai_tier == rule_preliminary_tier else 0.0
    confidence_score = round(0.4 * signal_coverage + 0.4 * data_completeness + 0.2 * rule_agreement, 3)
    confidence_tier = _confidence_tier(confidence_score)
    review_required = ai_output.get("review_required")
    if review_required is None:
        review_required = confidence_score < 0.50
    recommendation_source = ai_output.get("recommendation_source")
    if not recommendation_source:
        recommendation_source = "AI_LowConfidence" if review_required else "AI"

    critical_signals = _build_critical_signals(clinical_signals)
    missing_data_alerts = _build_missing_data_alerts(missing_signals)

    resolved_package = ruleset.get("resolved_package", {}) or {}
    base_price_thb = resolved_package.get("price_thb", 0.0)
    resolved_package = {
        "tier": resolved_package.get("tier", ai_tier),
        "package_name": resolved_package.get("package_name", ""),
        "package_code": resolved_package.get("package_code", ""),
        "price_thb": base_price_thb,
        "age_band": resolved_package.get("age_band", ""),
        "gender": resolved_package.get("gender", ""),
    }

    patient_id = resolve_patient_id(patient_token)
    discount_data = calculate_discounts(patient_id, base_price_thb)

    return {
        "overall_risk_level": ai_output.get("overall_risk_level", "Moderate"),
        "ai_recommended_tier": ai_tier,
        "tier_deviation_justification": ai_output.get("tier_deviation_justification"),
        "add_ons": enriched_add_ons,
        "reasoning_trace": ai_output.get("reasoning_trace", ""),
        "supporting_signals": ai_output.get("supporting_signals", []),
        "missing_signals": missing_signals,
        "communication_script": _map_communication_script(ai_output.get("communication_script", {})),
        "rule_preliminary_tier": rule_preliminary_tier,
        "resolved_package": resolved_package,
        "confidence_score": confidence_score,
        "confidence_tier": confidence_tier,
        "signal_coverage": round(signal_coverage, 3),
        "data_completeness": round(data_completeness, 3),
        "rule_agreement": rule_agreement,
        "review_required": review_required,
        "recommendation_source": recommendation_source,
        "recommendation_hash": ai_output.get("recommendation_hash"),
        "patient_high_alert": {
            "critical_signals": critical_signals,
            "missing_data_alerts": missing_data_alerts,
        },
        "security_metadata": ai_output.get("security_metadata", {}),
        "eligible_discounts": discount_data["eligible_discounts"],
        "applied_discounts": discount_data["applied_discounts"],
        "original_price_thb": discount_data["original_price_thb"],
        "final_price_thb": discount_data["final_price_thb"],
        "total_savings_thb": discount_data["total_savings_thb"],
        "discount_override_allowed": discount_data["discount_override_allowed"],
        "metadata": {
            "request_id": f"req_{uuid.uuid4().hex[:12]}",
            "patient_token": patient_token,
            "model_id": settings.llm_model,
            "template_version": "v1.0",
            "ruleset_version": ruleset.get("ruleset_version", "v2026.03.1"),
            "signal_store_pipeline_run_id": clinical_signals.get("pipeline_run_id", ""),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "latency_ms": int(latency_ms or 0),
        },
    }


def _recommendation_cache_key(
    *,
    patient_token: str,
    signal_store_pipeline_run_id: str,
    ruleset_version: str,
    force_rule_based: bool,
) -> str:
    raw = json.dumps(
        {
            "patient_token": patient_token,
            "signal_store_pipeline_run_id": signal_store_pipeline_run_id,
            "ruleset_version": ruleset_version,
            "force_rule_based": force_rule_based,
            "model_id": settings.llm_model,
            "template_version": "v1.0",
            "api_auth_mode": settings.api_auth_mode,
        },
        sort_keys=True,
        separators=(",", ":"),
    )
    return f"recommendation:{hashlib.sha256(raw.encode('utf-8')).hexdigest()}"


@router.post("/recommend", response_model=RecommendResponse)
async def recommend(
    request: RecommendRequest,
    http_request: Request,
    _auth: AuthContext = Depends(require_recommendation_access),
):
    patient = _resolve_patient_by_token(request.patient_token)
    patient_id = patient["patient_id"]
    signals = get_clinical_signals(request.patient_token, patient_id=patient_id)
    pipeline_run_id = signals.get("pipeline_run_id", "")
    ruleset = get_program_ruleset(request.patient_token, patient_id=patient_id)
    cache_key = _recommendation_cache_key(
        patient_token=request.patient_token,
        signal_store_pipeline_run_id=pipeline_run_id,
        ruleset_version=ruleset.get("ruleset_version", "v2026.03.1"),
        force_rule_based=request.force_rule_based,
    )
    cache_ttl = settings.cache_recommendation_ttl_seconds or settings.cache_ttl_seconds
    cache_key_hash = cache_key.split(":", 1)[-1][:16]
    if settings.cache_enabled:
        hit, cached_payload = cache_service.get(cache_key)
        if hit:
            payload = json.loads(json.dumps(cached_payload))
            metadata = payload.get("metadata", {})
            metadata["request_id"] = f"req_{uuid.uuid4().hex[:12]}"
            metadata["generated_at"] = datetime.now(timezone.utc).isoformat()
            metadata["latency_ms"] = 0
            metadata["cache_status"] = "hit"
            metadata["cache_key_hash"] = cache_key_hash
            metadata["cache_ttl_seconds"] = cache_ttl
            payload["metadata"] = metadata
            return payload
    started_at = time.time()
    request_id = f"req_{uuid.uuid4().hex[:12]}"
    audit_context = {
        "user_id": _auth.user_id,
        "user_role": _auth.role,
        "client_ip": http_request.client.host if http_request.client else "unknown",
        "request_id": request_id,
        "action_type": "GenerateRecommendation",
    }
    ai_output = await orchestrator.generate_recommendation(
        patient_id=patient_id,
        patient_token=request.patient_token,
        force_rule_based=request.force_rule_based,
        audit_context=audit_context,
    )
    recommendation_source = ai_output.get("recommendation_source")
    if not request.force_rule_based and recommendation_source != "RuleBased":
        validation_failures = _validate_stage1_output(
            ai_output=ai_output,
            ruleset=ruleset,
            clinical_signals=signals,
        )
        if validation_failures:
            ai_output = await orchestrator.generate_recommendation(
                patient_id=patient_id,
                patient_token=request.patient_token,
                force_rule_based=True,
                audit_context=audit_context,
            )
            ai_output["validation_failures"] = validation_failures
            ai_output["review_required"] = True
            ai_output["recommendation_source"] = "RuleBased"
    latency_ms = int((time.time() - started_at) * 1000)
    payload = _normalize_stage2(
        patient_token=request.patient_token,
        ai_output=ai_output,
        ruleset=ruleset,
        latency_ms=latency_ms,
    )
    payload["metadata"]["cache_status"] = "miss"
    payload["metadata"]["cache_key_hash"] = cache_key_hash
    payload["metadata"]["cache_ttl_seconds"] = cache_ttl
    if settings.cache_enabled:
        cache_service.set(cache_key, payload, cache_ttl)
    return payload


@router.post("/recommend/stream")
async def recommend_stream(
    request: RecommendRequest,
    http_request: Request,
    _auth: AuthContext = Depends(require_recommendation_access),
):
    """Stream recommendation pipeline stages as SSE events, then emit the final result."""
    patient = _resolve_patient_by_token(request.patient_token)
    patient_id = patient["patient_id"]

    queue: asyncio.Queue = asyncio.Queue()
    _DONE = object()

    async def on_stage(num: int, label: str) -> None:
        await queue.put({"type": "stage", "stage": num, "label": label})

    async def _run() -> None:
        try:
            ruleset = get_program_ruleset(request.patient_token, patient_id=patient_id)
            audit_context = {
                "user_id": _auth.user_id,
                "user_role": _auth.role,
                "client_ip": http_request.client.host if http_request.client else "unknown",
                "request_id": f"req_{uuid.uuid4().hex[:12]}",
                "action_type": "GenerateRecommendation",
            }
            started_at = time.time()
            ai_output = await orchestrator.generate_recommendation(
                patient_id=patient_id,
                patient_token=request.patient_token,
                force_rule_based=request.force_rule_based,
                audit_context=audit_context,
                on_stage=on_stage,
            )
            latency_ms = int((time.time() - started_at) * 1000)
            payload = _normalize_stage2(
                patient_token=request.patient_token,
                ai_output=ai_output,
                ruleset=ruleset,
                latency_ms=latency_ms,
            )
            payload["type"] = "result"
            await queue.put(payload)
        except Exception as exc:
            await queue.put({"type": "error", "detail": str(exc)})
        finally:
            await queue.put(_DONE)

    async def generate():
        asyncio.create_task(_run())
        while True:
            item = await asyncio.wait_for(queue.get(), timeout=120.0)
            if item is _DONE:
                break
            yield f"data: {json.dumps(item)}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.get("/timeline/{patient_token}", response_model=TimelineResponse)
async def timeline(patient_token: str, _auth: AuthContext = Depends(require_recommendation_access)):
    patient = _resolve_patient_by_token(patient_token)
    timeline_payload = get_patient_event_timeline(
        patient_token,
        patient_id=patient["patient_id"],
    )
    return timeline_payload


@router.get("/biomarker-trends/{patient_token}")
async def biomarker_trends(patient_token: str, _auth: AuthContext = Depends(require_recommendation_access)):
    patient = _resolve_patient_by_token(patient_token)
    return get_biomarker_trends(patient_token, patient_id=patient["patient_id"])


@router.get("/screening-gaps/{patient_token}")
async def screening_gaps(patient_token: str, _auth: AuthContext = Depends(require_recommendation_access)):
    patient = _resolve_patient_by_token(patient_token)
    signals = get_clinical_signals(patient_token, patient_id=patient["patient_id"])
    return {
        "patient_token": patient_token,
        "screening_gaps": signals.get("screening_gaps", []),
        "vaccination_gaps": signals.get("vaccination_gaps", []),
        "computed_at": signals.get("computed_at", ""),
        "pipeline_run_id": signals.get("pipeline_run_id", ""),
    }


@router.get("/monitoring-snapshot", response_model=MonitoringSnapshotResponse)
async def monitoring_snapshot(_auth: AuthContext = Depends(require_monitoring_access)):
    snapshot = dict(MONITORING_FIXTURE.get("snapshot", {}))
    snapshot["snapshot_at"] = datetime.now(timezone.utc).isoformat()
    return {
        "snapshot_at": snapshot.get("snapshot_at", ""),
        "refresh_interval_seconds": snapshot.get("refresh_interval_seconds", 30),
        "active_users_now": snapshot.get("active_users_now", 0),
        "sessions_today": snapshot.get("sessions_today", 0),
        "patient_records_accessed_today": snapshot.get("patient_records_accessed_today", 0),
        "ai_recommendations_generated_today": snapshot.get("ai_recommendations_generated_today", 0),
        "alert_counts": snapshot.get("alert_counts", {"critical": 0, "high": 0, "medium": 0, "low": 0}),
        "safety_validator_failures_today": snapshot.get("safety_validator_failures_today", 0),
        "top_active_departments": snapshot.get("top_active_departments", []),
    }


@router.get("/audit-logs", response_model=AuditLogsResponse)
async def audit_logs(
    user_id: str | None = Query(None),
    patient_id: str | None = Query(None),
    action_type: str | None = Query(None),
    resource_type: str | None = Query(None),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    _auth: AuthContext = Depends(require_monitoring_access),
):
    results = _filter_audit_entries(
        user_id=user_id,
        patient_id=patient_id,
        action_type=action_type,
        resource_type=resource_type,
        start_date=start_date,
        end_date=end_date,
    )
    return {"total": len(results), "entries": results}


@router.get("/anomaly-alerts", response_model=AnomalyAlertsResponse)
async def anomaly_alerts(_auth: AuthContext = Depends(require_monitoring_access)):
    return {"alerts": MONITORING_FIXTURE.get("anomaly_alerts", [])}


@router.get("/rbac", response_model=RbacResponse)
async def rbac(_auth: AuthContext = Depends(require_monitoring_access)):
    return {"roles": MONITORING_FIXTURE.get("rbac_roles", [])}


@router.get("/mapping-codes", response_model=MappingCodesResponse)
async def mapping_codes(_auth: AuthContext = Depends(require_monitoring_access)):
    mappings = MONITORING_FIXTURE.get("mapping_codes", [])
    return {"mappings": _normalize_mapping_codes(mappings)}


@router.get("/master-programs", response_model=MasterProgramsResponse)
async def master_programs(_auth: AuthContext = Depends(require_monitoring_access)):
    return {"programs": MONITORING_FIXTURE.get("master_programs", [])}


@router.get("/master-add-ons", response_model=MasterAddOnsResponse)
async def master_add_ons(_auth: AuthContext = Depends(require_monitoring_access)):
    raw = load_ruleset_add_on_items()
    normalized = [
        {
            "item_code": item.get("item_code", ""),
            "label": item.get("label", ""),
            "category": item.get("category", ""),
            "status": item.get("status", ""),
            "gender_constraint": item.get("gender_constraint"),
            "age_min": item.get("age_min"),
            "age_max": item.get("age_max"),
            "trigger_signals": item.get("trigger_signals", []),
            "price_thb": (item.get("navavej_product") or {}).get("price_thb"),
        }
        for item in raw
    ]
    return {"add_ons": normalized}


@router.get("/admin/monitoring/snapshot", response_model=MonitoringSnapshotResponse)
async def admin_monitoring_snapshot(_auth: AuthContext = Depends(require_monitoring_access)):
    return await monitoring_snapshot(_auth)


@router.get("/admin/audit-logs/search", response_model=AuditLogsResponse)
async def admin_audit_logs_search(
    user_id: str | None = Query(None),
    patient_token_prefix: str | None = Query(None),
    action_type: str | None = Query(None),
    resource_type: str | None = Query(None),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    _auth: AuthContext = Depends(require_monitoring_access),
):
    return await audit_logs(
        user_id=user_id,
        patient_token_prefix=patient_token_prefix,
        action_type=action_type,
        resource_type=resource_type,
        start_date=start_date,
        end_date=end_date,
        _auth=_auth,
    )


@router.get("/admin/anomaly-alerts", response_model=AnomalyAlertsResponse)
async def admin_anomaly_alerts(_auth: AuthContext = Depends(require_monitoring_access)):
    return await anomaly_alerts(_auth)


@router.get("/admin/rbac", response_model=RbacResponse)
async def admin_rbac(_auth: AuthContext = Depends(require_monitoring_access)):
    return await rbac(_auth)


@router.get("/admin/mapping-codes", response_model=MappingCodesResponse)
async def admin_mapping_codes(_auth: AuthContext = Depends(require_monitoring_access)):
    return await mapping_codes(_auth)


@router.get("/admin/master-programs", response_model=MasterProgramsResponse)
async def admin_master_programs(_auth: AuthContext = Depends(require_monitoring_access)):
    return await master_programs(_auth)


@router.get("/admin/master-add-ons", response_model=MasterAddOnsResponse)
async def admin_master_add_ons(_auth: AuthContext = Depends(require_monitoring_access)):
    return await master_add_ons(_auth)


@router.get("/system-config", response_model=SystemConfigResponse)
def get_system_config(_auth: AuthContext = Depends(require_monitoring_access)):
    return SystemConfigResponse(
        active_client=settings.ai_active_client,
        all_clients=[
            BamlClientInfo(name="NavaveijClient", provider="openai-generic", model=settings.llm_model, status="active"),
            BamlClientInfo(name="GPT4o", provider="openai", model="gpt-4o", status="standby"),
            BamlClientInfo(
                name="Claude35Sonnet", provider="anthropic", model="claude-3-5-sonnet-20241022", status="standby"
            ),
            BamlClientInfo(name="LocalLlama", provider="openai-generic", model="llama3.1:70b", status="standby"),
            BamlClientInfo(
                name="OpenRouterClient", provider="openai-generic", model="openai/gpt-oss-120b", status="standby"
            ),
            BamlClientInfo(
                name="ActiveModel",
                provider="fallback",
                model="NavaveijClient→GPT4o→Claude35Sonnet→LocalLlama→OpenRouterClient",
                status="fallback-chain",
            ),
        ],
        mcp_tools=[
            McpToolInfo(
                name="get_biomarker_trends", type="READ-ONLY", description="Fetch biomarker trend series for a patient"
            ),
            McpToolInfo(name="get_clinical_signals", type="READ-ONLY", description="Compute clinical risk signals"),
            McpToolInfo(
                name="get_hard_constraints", type="READ-ONLY", description="Evaluate hard clinical constraints"
            ),
            McpToolInfo(
                name="get_patient_event_timeline", type="READ-ONLY", description="Retrieve patient event timeline"
            ),
            McpToolInfo(name="get_program_ruleset", type="READ-ONLY", description="Load tier + add-on ruleset"),
        ],
        auth_mode=settings.api_auth_mode,
        template_version="v3.1-poc",
    )
