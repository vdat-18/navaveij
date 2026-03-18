"""Routes for clinical AI recommendations."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from loguru import logger

from src.services.orchestrator import OrchestrationManager
from src.api.routes.patients import load_registry

router = APIRouter()
orchestrator = OrchestrationManager()

class RecommendationRequest(BaseModel):
    patient_id: str
    force_rule_based: bool = False

@router.post("/recommend")
async def get_recommendation(request: RecommendationRequest):
    """Trigger AI reasoning for a specific patient."""
    logger.info(f"Received recommendation request for patient: {request.patient_id}")
    
    # 1. Verify patient exists in registry
    registry = load_registry()
    patient = next((p for p in registry if p["patient_id"] == request.patient_id), None)
    if not patient:
        logger.warning(f"Patient {request.patient_id} not found in registry")
        raise HTTPException(status_code=404, detail="Patient not found")

    try:
        # 2. Call the Orchestrator (Backend AI Logic) with the correct token from registry
        result = await orchestrator.generate_recommendation(
            patient_id=request.patient_id, 
            patient_token=patient.get("patient_token"),
            force_rule_based=request.force_rule_based
        )
        
        # 3. PII Rehydration
        result["patient_name"] = patient["patient_name"]
        
        return result
    except Exception as e:
        logger.error(f"Error during clinical orchestration for {request.patient_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class DecisionRequest(BaseModel):
    patient_id: str
    recommendation_hash: str
    decision: str  # "Approve" or "Reject"
    physician_id: str = "dr-admin-001"
    notes: str = ""

@router.post("/approve")
async def approve_recommendation(request: DecisionRequest):
    """Record physician's approval/rejection."""
    logger.info(f"Physician {request.physician_id} recording {request.decision} for {request.patient_id}")
    
    try:
        result = await orchestrator.record_decision(
            patient_id=request.patient_id,
            recommendation_hash=request.recommendation_hash,
            decision=request.decision,
            physician_id=request.physician_id,
            notes=request.notes
        )
        return result
    except Exception as e:
        logger.error(f"Error recording decision: {e}")
        raise HTTPException(status_code=500, detail=str(e))
@router.get("/audit")
async def get_audit_logs():
    """Retrieve all clinical decision logs."""
    try:
        return orchestrator.audit_logger.get_logs()
    except Exception as e:
        logger.error(f"Error fetching audit logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))
