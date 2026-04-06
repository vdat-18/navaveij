FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

# Copy dependency manifests first for layer cache
COPY pyproject.toml uv.lock ./

# Install Python deps into an in-project venv, frozen from lockfile, no dev extras
RUN uv sync --frozen --no-dev

# Copy application source
COPY backend/ ./backend/
COPY shared/ ./shared/
COPY baml_client/ ./baml_client/
COPY baml_src/ ./baml_src/
COPY assets/ ./assets/

# Create logs directory (overridden by volume mount at runtime)
RUN mkdir -p /app/logs && chmod 777 /app/logs

# Runtime environment
ENV PYTHONPATH=/app:/app/backend
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

# --workers 1: MCP session is a module-level singleton; multiple workers each spawn separate MCP subprocesses
CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
