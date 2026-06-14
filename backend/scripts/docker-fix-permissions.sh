#!/usr/bin/env bash
# Fix "cannot stop container: permission denied" after mixing sudo and non-sudo Docker.
# Run once from repo root:  sudo ./backend/scripts/docker-fix-permissions.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Stopping and removing all backend compose containers (requires sudo if they were started with sudo)..."
docker compose down --remove-orphans 2>/dev/null || true

# Remove duplicate/orphan containers from failed recreates (name prefix = old container ID)
docker ps -aq --filter 'name=backend-' | xargs -r docker rm -f 2>/dev/null || true
for id in ff4d9b1139d0 d3f4cadab942 22fbdfd5b563; do
  docker rm -f "${id}" "${id}_backend-core-banking-1" "${id}_backend-ussd-service-1" "${id}_backend-rag-service-1" 2>/dev/null || true
done

echo "Rebuilding services with latest auth fixes (api-gateway, core-banking)..."
docker compose build api-gateway core-banking

MIGRATION="$(cd "$(dirname "$0")/../.." && pwd)/migrations/011_product_marketplace_columns.sql"
if [ -f "$MIGRATION" ] && docker ps --format '{{.Names}}' | grep -q '^backend-postgres-1$'; then
  echo "Applying database patches..."
  docker exec -i backend-postgres-1 psql -U ventureroot -d ventureroot < "$MIGRATION" || true
fi

echo "Starting stack (still as root via sudo — use the same for day-to-day until you switch to non-sudo only)..."
docker rm -f mapvo-api-gateway-fix 2>/dev/null || true
docker compose up -d --build

echo ""
echo "Health checks:"
curl -sf http://localhost:8001/health && echo "  core-banking :8001 OK" || echo "  core-banking :8001 FAILED"
curl -sf http://localhost:8080/health && echo "  api-gateway  :8080 OK" || echo "  api-gateway  :8080 FAILED"
docker compose ps

echo ""
echo "Next time: always run Docker the same way."
echo "  Option A (recommended after this reset):  cd backend && docker compose up -d"
echo "  Option B:                                 cd backend && sudo docker compose up -d"
echo "Do not mix A and B."
