"""Main entry point for the Navaveij API."""

import uvicorn
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

load_dotenv()

from src.api.routes import clinical, contracts, leads, patients
from src.services.active_client import get_supported_client_names, resolve_active_client
from src.services.mcp_client import close_mcp_session, warm_mcp_session
from src.services.prompt_selector import get_prompt_selector
from shared.settings import settings


def _initialize_client_handle(client_name: str):
    """Construct the runtime handle for a named client so it is ready for use."""
    from baml_client.async_client import b

    if client_name == "GeminiClient":
        return b
    return b.with_options(client=client_name)


def _warm_configured_ai_clients() -> None:
    """Eagerly initialize all configured AI clients at startup."""
    initial_active_client = settings.ai_active_client
    for client_name in get_supported_client_names():
        try:
            resolved = resolve_active_client(client_name)
            get_prompt_selector(client_name)
            _initialize_client_handle(resolved.client_name)
            logger.info(f"AI client warm ready: {resolved.client_name}")
        except Exception as exc:
            logger.warning(f"AI client warm failed for {client_name}: {exc}")
            if client_name == initial_active_client:
                raise


def _log_system_config_contract_routes(app: FastAPI) -> None:
    """Log mounted system-config contract routes to make stale runtimes easier to spot."""
    routes: list[str] = []
    for route in app.routes:
        path = getattr(route, "path", None)
        methods = getattr(route, "methods", None)
        if not path or not methods:
            continue
        if not path.startswith("/api/system-config"):
            continue
        allowed_methods = ", ".join(sorted(method for method in methods if method not in {"HEAD", "OPTIONS"}))
        routes.append(f"{path} [{allowed_methods}]")

    if routes:
        logger.info("Startup: mounted system-config routes -> " + "; ".join(routes))
    else:
        logger.warning("Startup: no /api/system-config routes are mounted; Config screen health checks will fail")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Warm long-lived resources on startup; clean up on shutdown."""
    logger.info("Startup: warming MCP singleton session")
    try:
        await warm_mcp_session()
    except Exception as exc:
        logger.warning(f"MCP singleton warm failed (will fall back to per-call sessions): {exc}")
    _log_system_config_contract_routes(app)
    logger.info("Startup: warming configured AI clients")
    _warm_configured_ai_clients()
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
app.include_router(leads.router, prefix="/api", tags=["Lead Assignment"])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": "1.0.0"}


if __name__ == "__main__":
    logger.info("Starting Navaveij API server...")
    uvicorn.run("src.api.main:app", host="0.0.0.0", port=8000, reload=True, reload_dirs=["backend"])
