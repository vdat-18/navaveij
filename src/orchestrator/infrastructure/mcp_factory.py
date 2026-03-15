"""MCP Infrastructure Factory for Navaveij."""

import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from loguru import logger

from src.shared.settings import settings
from src.shared.exceptions import InfrastructureError


class MCPClientFactory:
    """Factory for managing MCP Client sessions with automatic lifecycle management."""

    @staticmethod
    @asynccontextmanager
    async def get_client() -> AsyncGenerator[ClientSession, None]:
        """
        Yield a context-managed MCP session.
        
        Currently implements stdio transport based on environment configuration.
        """
        server_params = StdioServerParameters(
            command=settings.mcp_server_command,
            args=settings.mcp_server_args,
            env={**os.environ, "PYTHONPATH": os.getcwd()}
        )

        logger.debug("Starting MCP stdio client session")
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                logger.debug("Initializing MCP session")
                await session.initialize()
                yield session
