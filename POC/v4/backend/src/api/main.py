"""Main entry point for the Navaveij API."""

import uvicorn
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

load_dotenv()

from src.api.routes import clinical, contracts, patients
from src.services.mcp_client import close_mcp_session, warm_mcp_session
from shared.settings import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Warm long-lived resources on startup; clean up on shutdown."""
    logger.info("Startup: warming MCP singleton session")
    try:
        await warm_mcp_session()
    except Exception as exc:
        logger.warning(f"MCP singleton warm failed (will fall back to per-call sessions): {exc}")
    yield
    logger.info("Shutdown: closing MCP singleton session")
    await close_mcp_session()


app = FastAPI(
    title="Navaveij Clinical AI API",
    description="Backend API for clinical recommendations and patient management",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS for Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_allowed_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(patients.router, prefix="/api/v1/patients", tags=["Patients"])
app.include_router(clinical.router, prefix="/api/v1/clinical", tags=["Clinical AI"])
app.include_router(contracts.router, prefix="/api", tags=["Contract API"])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": "1.0.0"}


if __name__ == "__main__":
    logger.info("Starting Navaveij API server...")
    uvicorn.run("src.api.main:app", host="0.0.0.0", port=8001, reload=True, reload_dirs=["backend"])
