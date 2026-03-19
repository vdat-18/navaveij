"""MCP Infrastructure Factory for Navaveij."""

import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

from loguru import logger
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from shared.settings import settings

# Module-level singleton — initialised once at FastAPI startup via warm_mcp_session()
_singleton_session: ClientSession | None = None
_singleton_stdio_exit: Any = None
_singleton_session_exit: Any = None


async def warm_mcp_session() -> ClientSession:
    """Create and store the singleton MCP session.  Call once at FastAPI startup."""
    global _singleton_session, _singleton_stdio_exit, _singleton_session_exit

    if _singleton_session is not None:
        return _singleton_session

    server_params = _build_server_params()
    logger.info("MCP singleton: initialising stdio session")
    stdio_cm = stdio_client(server_params)
    read, write = await stdio_cm.__aenter__()
    _singleton_stdio_exit = stdio_cm

    session_cm = ClientSession(read, write)
    session = await session_cm.__aenter__()
    _singleton_session_exit = session_cm

    await session.initialize()
    _singleton_session = session
    logger.info("MCP singleton: session ready")
    return session


async def close_mcp_session() -> None:
    """Gracefully tear down the singleton MCP session.  Call at FastAPI shutdown."""
    global _singleton_session, _singleton_stdio_exit, _singleton_session_exit

    if _singleton_session_exit is not None:
        try:
            await _singleton_session_exit.__aexit__(None, None, None)
        except Exception:
            pass
        _singleton_session_exit = None

    if _singleton_stdio_exit is not None:
        try:
            await _singleton_stdio_exit.__aexit__(None, None, None)
        except Exception:
            pass
        _singleton_stdio_exit = None

    _singleton_session = None
    logger.info("MCP singleton: session closed")


def _build_server_params() -> StdioServerParameters:
    return StdioServerParameters(
        command=settings.mcp_server_command,
        args=settings.mcp_server_args,
        env={**os.environ, "PYTHONPATH": f"{os.getcwd()}:{os.path.join(os.getcwd(), 'backend')}"},
    )


class MCPClientFactory:
    """Factory for managing MCP Client sessions.

    If the singleton session has been warmed (via warm_mcp_session at startup),
    get_client() yields it directly without spawning a new subprocess.
    Falls back to a per-call session when the singleton is not available
    (e.g. during tests or before startup completes).
    """

    @staticmethod
    @asynccontextmanager
    async def get_client() -> AsyncGenerator[ClientSession, None]:
        """Yield an MCP session — singleton if warmed, temporary otherwise."""
        if _singleton_session is not None:
            logger.debug("MCP singleton: reusing existing session")
            yield _singleton_session
            return

        # Fallback: per-call session (tests / pre-startup)
        server_params = _build_server_params()
        logger.debug("MCP singleton not initialised — starting per-call stdio session")
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                yield session
