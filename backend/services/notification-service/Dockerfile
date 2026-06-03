FROM python:3.11-slim

WORKDIR /app

# Install system dependencies and Django management tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl postgresql-client && rm -rf /var/lib/apt/lists/*

# Install Python dependencies with cache
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir --upgrade pip setuptools wheel

COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir -r requirements.txt

COPY notifications ./notifications
COPY manage.py .

ENV DJANGO_SETTINGS_MODULE=notifications.settings
EXPOSE 8010

CMD ["python", "manage.py", "runserver", "0.0.0.0:8010"]

