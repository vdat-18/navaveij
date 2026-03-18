"""Routes for patient management and rehydration."""

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from loguru import logger

router = APIRouter()

REGISTRY_PATH = Path("assets/patient_registry.json")


def load_registry():
    """Load the patient registry mapping."""
    if not REGISTRY_PATH.exists():
        return []
    with open(REGISTRY_PATH, encoding="utf-8") as f:
        return json.load(f)


@router.get("/")
async def list_patients():
    """List all registered patients with their names and tokens."""
    try:
        registry = load_registry()
        return registry
    except Exception as e:
        logger.error(f"Failed to load patient registry: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


from src.mcp_server.utils import load_signal_store_record


@router.get("/{patient_id}")
async def get_patient_details(patient_id: str):
    """Retrieve details for a specific patient, including demographics from Signal Store."""
    registry = load_registry()
    patient_base = next((p for p in registry if p["patient_id"] == patient_id), None)

    if not patient_base:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Enrich with real demographics from Signal Store
    record = load_signal_store_record(patient_id)
    if record:
        demographics = record.get("hard_constraints", {}).get("patient_demographics", {})
        return {
            **patient_base,
            "patient_name": demographics.get("name") or patient_base["patient_name"],
            "age": demographics.get("age"),
            "gender": demographics.get("gender"),
            "ethnicity": demographics.get("ethnicity"),
            "birth_date": demographics.get("birth_date"),
            "phone": demographics.get("phone"),
            "email": demographics.get("email"),
            "address": demographics.get("address"),
            "mrn": demographics.get("mrn"),
        }

    return patient_base
