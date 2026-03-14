"""FastAPI Entry point for the Navaveij Clinical Recommendation Engine."""

from fastapi import FastAPI, HTTPException
from loguru import logger
from pydantic import BaseModel
from dotenv import load_dotenv
import uvicorn

from src.orchestrator.agents.orchestrator import ClinicalOrchestrator

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Navaveij Clinical API",
    description="Intelligent Health Checkup Recommendation Engine",
    version="1.0.0",
)

# Initialize the orchestrator (singleton-like for the app context)
orchestrator = ClinicalOrchestrator()


class RecommendationRequest(BaseModel):
    """Schema for a recommendation request."""
    patient_id: str


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "online", "engine": "Navaveij Clinical Orchestrator"}


@app.post("/recommend")
async def get_recommendation(request: RecommendationRequest):
    """
    Generate a personalized clinical recommendation for a patient.
    
    This endpoint triggers the full ReAct loop:
    1. MCP data retrieval
    2. PII Masking
    3. BAML Inference
    4. Safety validation
    5. Audit logging
    6. PII Rehydration
    """
    logger.info(f"API Request received for patient: {request.patient_id}")
    
    # In a real app, errors would bubble up or be handled by middleware
    result = await orchestrator.generate_recommendation(request.patient_id)
    
    if not result:
        raise HTTPException(status_code=500, detail="Failed to generate recommendation")
        
    return result


if __name__ == "__main__":
    uvicorn.run("src.api.main:app", host="0.0.0.0", port=8000, reload=True)
