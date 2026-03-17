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

@router.get("/{patient_id}")
async def get_patient_details(patient_id: str):
    """Retrieve details for a specific patient."""
    registry = load_registry()
    patient = next((p for p in registry if p["patient_id"] == patient_id), None)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient
