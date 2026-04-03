import json
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.api.routes import leads

app = FastAPI()
app.include_router(leads.router, prefix="/api")
client = TestClient(app)
ASSETS_DIR = Path(__file__).resolve().parents[2] / "assets"


def _headers(user_id: str, role: str, scopes: str) -> dict[str, str]:
    return {
        "X-Auth-User-Id": user_id,
        "X-Auth-Role": role,
        "X-Auth-Scopes": scopes,
    }


def test_executive_can_list_and_create_lead_assignment():
    executive_headers = _headers("usr-executive-00001", "executive", "recommendation:read,monitoring:read")

    list_response = client.get("/api/pre-runned-patients", headers=executive_headers)
    assert list_response.status_code == 200
    patients = list_response.json()
    target_patient = next(patient for patient in patients if patient["patient_id"] == "id_a83de442")
    assert target_patient["is_assigned"] is False

    create_response = client.post(
        "/api/leads",
        headers=executive_headers,
        json={
            "patient_id": "id_a83de442",
            "assigned_to_user_id": "usr-sales-00001",
            "assigned_to_name": "Somying Srisuk",
            "notes": "Newly assigned from executive queue.",
        },
    )
    assert create_response.status_code == 200
    created = create_response.json()
    assert created["patient_id"] == "id_a83de442"
    assert created["assigned_to_user_id"] == "usr-sales-00001"
    assert created["status"] == "assigned"


def test_sales_only_sees_own_leads():
    sales_headers = _headers("usr-sales-00001", "sales", "recommendation:read,recommendation:write")

    response = client.get("/api/leads", headers=sales_headers)
    assert response.status_code == 200
    leads = response.json()
    assert len(leads) >= 1
    assert all(lead["assigned_to_user_id"] == "usr-sales-00001" for lead in leads)


def test_sales_can_update_allowed_lead():
    sales_headers = _headers("usr-sales-00001", "sales", "recommendation:read,recommendation:write")

    response = client.patch(
        "/api/leads/lead_001/status",
        headers=sales_headers,
        json={"status": "scheduled", "notes": "Consult booked for Friday."},
    )
    assert response.status_code == 200
    updated = response.json()
    assert updated["status"] == "scheduled"
    assert updated["notes"] == "Consult booked for Friday."


def test_unauthorized_role_scope_combinations_are_rejected():
    sales_headers = _headers("usr-sales-00001", "sales", "recommendation:read,recommendation:write")
    executive_headers = _headers("usr-executive-00001", "executive", "recommendation:read,monitoring:read")

    create_response = client.post(
        "/api/leads",
        headers=sales_headers,
        json={
            "patient_id": "id_a83de442",
            "assigned_to_user_id": "usr-sales-00001",
            "assigned_to_name": "Somying Srisuk",
            "notes": "Should fail",
        },
    )
    assert create_response.status_code == 403

    update_response = client.patch(
        "/api/leads/lead_002/status",
        headers=sales_headers,
        json={"status": "declined", "notes": "Should fail"},
    )
    assert update_response.status_code == 403

    sales_user_response = client.get("/api/sales-users", headers=executive_headers)
    assert sales_user_response.status_code == 200


def test_pre_runned_recommendation_returns_stored_payload_without_orchestration():
    sales_headers = _headers("usr-sales-00002", "sales", "recommendation:read,recommendation:write")

    response = client.get(
        "/api/pre-runned-patients/tok_hmac_7f0c9a21/recommendation",
        headers=sales_headers,
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["patient_id"] == "id_7f0c9a21"
    assert payload["recommendation"]["recommendation_source"] == "precomputed"
    assert payload["recommendation"]["recommendation_hash"] == "lead-hash-7f0c9a21"


def test_sales_lead_patients_do_not_overlap_with_walk_in_registry():
    with open(ASSETS_DIR / "patient_registry.json", encoding="utf-8") as registry_handle:
        walk_in_patients = json.load(registry_handle)
    with open(ASSETS_DIR / "pre_runned_recommendations.json", encoding="utf-8") as lead_handle:
        lead_patients = json.load(lead_handle)

    walk_in_ids = {patient["patient_id"] for patient in walk_in_patients}
    walk_in_tokens = {patient["patient_token"] for patient in walk_in_patients}
    walk_in_names = {patient["patient_name"] for patient in walk_in_patients}

    lead_ids = {patient["patient_id"] for patient in lead_patients}
    lead_tokens = {patient["patient_token"] for patient in lead_patients}
    lead_names = {patient["patient_name"] for patient in lead_patients}

    assert walk_in_ids.isdisjoint(lead_ids)
    assert walk_in_tokens.isdisjoint(lead_tokens)
    assert walk_in_names.isdisjoint(lead_names)
