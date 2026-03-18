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


def find_patient_by_id(patient_id: str) -> dict | None:
    registry = load_registry()
    return next((p for p in registry if p.get("patient_id") == patient_id), None)


def find_patient_by_token(patient_token: str) -> dict | None:
    registry = load_registry()
    return next((p for p in registry if p.get("patient_token") == patient_token), None)


def resolve_patient_token(patient_id: str) -> str | None:
    patient = find_patient_by_id(patient_id)
    return patient.get("patient_token") if patient else None


def resolve_patient_id(patient_token: str) -> str | None:
    patient = find_patient_by_token(patient_token)
    return patient.get("patient_id") if patient else None


@router.get("/")
async def list_patients():
    """List all registered patients with their names and tokens."""
    try:
        registry = load_registry()
        return registry
    except Exception as e:
        logger.error(f"Failed to load patient registry: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{patient_id}")
async def get_patient_details(patient_id: str):
    """Retrieve details for a specific patient."""
    patient = find_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient
