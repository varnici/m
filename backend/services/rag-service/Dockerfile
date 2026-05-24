FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Install Python dependencies with cache
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir --upgrade pip setuptools wheel

COPY requirements.txt .
COPY requirements-optional.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir -r requirements.txt

ARG INSTALL_RAG_OPTIONAL=false
RUN if [ "$INSTALL_RAG_OPTIONAL" = "true" ]; then \
      pip install --no-cache-dir -r requirements-optional.txt; \
    fi

COPY app ./app

ENV PYTHONPATH=/app
EXPOSE 8003

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8003"]
