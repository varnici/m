# Stage 1: Build & Model Download Stage
FROM python:3.11-slim as builder

# Install uv from the official image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Use uv to install faster-whisper for the model download
# This is faster and utilizes uv's caching
RUN uv pip install --system faster-whisper

# Pre-download the Whisper model (tiny is best for local-first responsiveness)
RUN python -c "from faster_whisper import WhisperModel; WhisperModel('tiny', device='cpu', compute_type='int8')"

# Stage 2: Final Runtime Stage
FROM python:3.11-slim

# Install uv in the final stage as well
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# 1. Install RUNTIME dependencies (FFmpeg is mandatory for audio processing)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# 2. Copy the pre-downloaded models from builder stage
COPY --from=builder /root/.cache/huggingface /root/.cache/huggingface

# 3. Use uv to install requirements
# We use --system here to install into the container's global python
COPY requirements.txt .
RUN uv pip install --system --no-cache -r requirements.txt

# 4. Copy application code
COPY . .

# 5. Environment configuration
ENV PYTHONUNBUFFERED=1
ENV MODULE_NAME=app.main
ENV VARIABLE_NAME=app

# 6. Optimized Uvicorn settings
# Standardizing on port 8000 internally (Docker Compose maps this to 8002/8004 etc.)
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--timeout-keep-alive", "60"]