# ── Stage 1: Build ─────────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Copy lock file and project metadata first for Docker layer caching
COPY pyproject.toml uv.lock ./

# Install production dependencies (no dev extras, no local package install yet)
RUN uv sync --frozen --no-dev --no-install-project

# ── Stage 2: Runtime ────────────────────────────────────────────────────────────
FROM python:3.12-slim

# Create a non-root user to run the application (security best practice)
RUN groupadd --gid 1001 appgroup && \
    useradd --uid 1001 --gid appgroup --shell /bin/bash --create-home appuser

WORKDIR /app

# Copy virtual environment from builder stage
COPY --from=builder /app/.venv /app/.venv

# Copy application source (owned by appuser)
COPY --chown=appuser:appgroup . .

# Switch to non-root user
USER appuser

# Add venv to PATH
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

# Use exec form so signals are passed correctly (allows graceful shutdown)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
