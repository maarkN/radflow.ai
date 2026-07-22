# Build from the repo root: docker build -f services/report-ai/Dockerfile .
FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
ENV UV_COMPILE_BYTECODE=1 PYTHONPATH=/app/src
WORKDIR /app
COPY services/report-ai/pyproject.toml services/report-ai/uv.lock ./
RUN uv sync --frozen --no-dev
COPY services/report-ai/src ./src
EXPOSE 8000
CMD ["uv", "run", "--no-sync", "uvicorn", "report_ai.main:app", "--host", "0.0.0.0", "--port", "8000"]
