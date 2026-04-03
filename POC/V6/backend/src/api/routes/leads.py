import json
import uuid
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from src.api.security import AuthContext, require_access

router = APIRouter()

ASSETS_DIR = Path(__file__).resolve().parents[4] / "assets"
PRE_RUNNED_PATH = ASSETS_DIR / "pre_runned_recommendations.json"
LEAD_ASSIGNMENTS_PATH = ASSETS_DIR / "lead_assignments_seed.json"
SALES_USERS_PATH = ASSETS_DIR / "sales_users.json"

LEAD_ALLOWED_ROLES = {"executive", "sales"}
LEAD_REQUIRED_SCOPES = {"recommendation:read"}
EXECUTIVE_ALLOWED_ROLES = {"executive"}
EXECUTIVE_REQUIRED_SCOPES = {"monitoring:read"}
SALES_ALLOWED_ROLES = {"sales"}
SALES_REQUIRED_SCOPES = {"recommendation:write"}
LEAD_STATUSES = {"assigned", "contacted", "scheduled", "converted", "declined"}
LeadStatus = Literal["assigned", "contacted", "scheduled", "converted", "declined"]

require_lead_access = require_access(allowed_roles=LEAD_ALLOWED_ROLES, required_scopes=LEAD_REQUIRED_SCOPES)
require_executive_access = require_access(allowed_roles=EXECUTIVE_ALLOWED_ROLES, required_scopes=EXECUTIVE_REQUIRED_SCOPES)
require_sales_access = require_access(allowed_roles=SALES_ALLOWED_ROLES, required_scopes=SALES_REQUIRED_SCOPES)


class SalesUser(BaseModel):
    user_id: str
    name: str
    role: str


class LeadAssignment(BaseModel):
    assignment_id: str
    patient_id: str
    patient_token: str
    patient_name: str
    scenario_label: str
    overall_risk_level: str
    ai_recommended_tier: str
    generated_at: str
    ai_lead_summary: str
    assigned_to_user_id: str
    assigned_to_name: str
    assigned_by_user_id: str
    assigned_at: str
    status: LeadStatus
    notes: str = ""


class CreateLeadRequest(BaseModel):
    patient_id: str
    assigned_to_user_id: str
    assigned_to_name: str
    notes: str = ""


class UpdateLeadStatusRequest(BaseModel):
    status: LeadStatus
    notes: str = ""


class PreRunnedPatientSummary(BaseModel):
    patient_id: str
    patient_token: str
    patient_name: str
    age: int | None = None
    gender: str | None = None
    scenario_label: str
    generated_at: str
    ai_lead_summary: str
    ai_recommended_tier: str
    overall_risk_level: str
    is_assigned: bool
    assigned_to_name: str | None = None


class PreRunnedRecommendationResponse(BaseModel):
    patient_id: str
    patient_token: str
    patient_name: str
    age: int | None = None
    gender: str | None = None
    scenario_label: str
    generated_at: str
    ai_lead_summary: str
    recommendation: dict[str, Any]


def _load_json(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


_pre_runned = _load_json(PRE_RUNNED_PATH)
_assignments = _load_json(LEAD_ASSIGNMENTS_PATH)
_sales_users = _load_json(SALES_USERS_PATH)


def _find_sales_user(user_id: str) -> dict[str, Any] | None:
    return next((user for user in _sales_users if user.get("user_id") == user_id), None)


def _find_pre_runned_by_patient_id(patient_id: str) -> dict[str, Any] | None:
    return next((item for item in _pre_runned if item.get("patient_id") == patient_id), None)


def _find_pre_runned_by_token(patient_token: str) -> dict[str, Any] | None:
    return next((item for item in _pre_runned if item.get("patient_token") == patient_token), None)


def _find_assignment(assignment_id: str) -> dict[str, Any] | None:
    return next((item for item in _assignments if item.get("assignment_id") == assignment_id), None)


def _serialize_assignment(item: dict[str, Any]) -> LeadAssignment:
    return LeadAssignment(**deepcopy(item))


def _serialize_pre_runned_summary(item: dict[str, Any]) -> PreRunnedPatientSummary:
    assignment = next((lead for lead in _assignments if lead.get("patient_id") == item.get("patient_id")), None)
    recommendation = item.get("recommendation", {})
    return PreRunnedPatientSummary(
        patient_id=item.get("patient_id", ""),
        patient_token=item.get("patient_token", ""),
        patient_name=item.get("patient_name", ""),
        age=item.get("age"),
        gender=item.get("gender"),
        scenario_label=item.get("scenario_label", ""),
        generated_at=item.get("generated_at", ""),
        ai_lead_summary=item.get("ai_lead_summary", ""),
        ai_recommended_tier=recommendation.get("ai_recommended_tier", ""),
        overall_risk_level=recommendation.get("overall_risk_level", ""),
        is_assigned=assignment is not None,
        assigned_to_name=assignment.get("assigned_to_name") if assignment else None,
    )


def _serialize_pre_runned_recommendation(item: dict[str, Any]) -> PreRunnedRecommendationResponse:
    return PreRunnedRecommendationResponse(**deepcopy(item))


def _ensure_assignment_access(assignment: dict[str, Any], auth: AuthContext) -> None:
    if auth.role == "executive":
        return
    if assignment.get("assigned_to_user_id") != auth.user_id:
        raise HTTPException(status_code=403, detail="Access forbidden for this lead")


@router.get("/leads", response_model=list[LeadAssignment])
def list_leads(auth: AuthContext = Depends(require_lead_access)):
    if auth.role == "executive":
        return [_serialize_assignment(item) for item in _assignments]
    return [_serialize_assignment(item) for item in _assignments if item.get("assigned_to_user_id") == auth.user_id]


@router.get("/leads/{assignment_id}", response_model=LeadAssignment)
def get_lead(assignment_id: str, auth: AuthContext = Depends(require_lead_access)):
    assignment = _find_assignment(assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Lead assignment not found")
    _ensure_assignment_access(assignment, auth)
    return _serialize_assignment(assignment)


@router.post("/leads", response_model=LeadAssignment)
def create_lead(body: CreateLeadRequest, auth: AuthContext = Depends(require_executive_access)):
    sales_user = _find_sales_user(body.assigned_to_user_id)
    if not sales_user:
        raise HTTPException(status_code=404, detail="Sales user not found")
    if sales_user.get("name") != body.assigned_to_name:
        raise HTTPException(status_code=400, detail="Assigned sales user name does not match registry")

    pre_runned = _find_pre_runned_by_patient_id(body.patient_id)
    if not pre_runned:
        raise HTTPException(status_code=404, detail="Pre-runned patient not found")
    if any(item.get("patient_id") == body.patient_id for item in _assignments):
        raise HTTPException(status_code=409, detail="Patient is already assigned")

    recommendation = pre_runned.get("recommendation", {})
    assignment = {
        "assignment_id": f"lead_{uuid.uuid4().hex[:8]}",
        "patient_id": pre_runned.get("patient_id", ""),
        "patient_token": pre_runned.get("patient_token", ""),
        "patient_name": pre_runned.get("patient_name", ""),
        "scenario_label": pre_runned.get("scenario_label", ""),
        "overall_risk_level": recommendation.get("overall_risk_level", ""),
        "ai_recommended_tier": recommendation.get("ai_recommended_tier", ""),
        "generated_at": pre_runned.get("generated_at", ""),
        "ai_lead_summary": pre_runned.get("ai_lead_summary", ""),
        "assigned_to_user_id": sales_user.get("user_id", ""),
        "assigned_to_name": sales_user.get("name", ""),
        "assigned_by_user_id": auth.user_id,
        "assigned_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "status": "assigned",
        "notes": body.notes,
    }
    _assignments.append(assignment)
    return _serialize_assignment(assignment)


@router.patch("/leads/{assignment_id}/status", response_model=LeadAssignment)
def update_lead_status(
    assignment_id: str,
    body: UpdateLeadStatusRequest,
    auth: AuthContext = Depends(require_sales_access),
):
    assignment = _find_assignment(assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Lead assignment not found")
    _ensure_assignment_access(assignment, auth)
    if body.status not in LEAD_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid lead status")
    assignment["status"] = body.status
    assignment["notes"] = body.notes
    return _serialize_assignment(assignment)


@router.get("/pre-runned-patients", response_model=list[PreRunnedPatientSummary])
def list_pre_runned_patients(_auth: AuthContext = Depends(require_executive_access)):
    return [_serialize_pre_runned_summary(item) for item in _pre_runned]


@router.get("/pre-runned-patients/{patient_token}/recommendation", response_model=PreRunnedRecommendationResponse)
def get_pre_runned_recommendation(patient_token: str, auth: AuthContext = Depends(require_lead_access)):
    pre_runned = _find_pre_runned_by_token(patient_token)
    if not pre_runned:
        raise HTTPException(status_code=404, detail="Pre-runned patient not found")
    if auth.role == "sales":
        assignment = next((item for item in _assignments if item.get("patient_token") == patient_token), None)
        if not assignment or assignment.get("assigned_to_user_id") != auth.user_id:
            raise HTTPException(status_code=403, detail="Access forbidden for this lead")
    return _serialize_pre_runned_recommendation(pre_runned)


@router.get("/sales-users", response_model=list[SalesUser])
def list_sales_users(_auth: AuthContext = Depends(require_executive_access)):
    return [SalesUser(**deepcopy(item)) for item in _sales_users]
