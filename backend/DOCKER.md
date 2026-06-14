# Docker troubleshooting (Mapvo backend)

## Error: `cannot stop container: ... permission denied`

### Why it happens

1. **Mixed `sudo` and non-sudo** — If you run `sudo docker compose up` once, those containers are owned in a way that your normal user (even in the `docker` group) often **cannot stop** them later with plain `docker compose up`.
2. **Snap Docker** — This project uses Docker from Snap (`Docker Root Dir: /var/snap/docker/common/var-lib-docker`). Snap + sudo makes this mismatch more common.
3. **Failed recreate** — Compose tries to replace a running container, fails to stop the old one, and leaves extra containers in `Created` state (names like `ff4d9b1139d0_backend-core-banking-1`).

### Wrong directory

Compose file lives at `mapvo-project/backend/docker-compose.yml`.

```bash
cd ~/Documents/mapvo-project/backend   # correct
docker compose up -d
```

Not `backend/backend` — that path does not exist (`cd backend: No such file or directory`).

### One-time fix

Run **everything** below with sudo (password required once):

```bash
cd ~/Documents/mapvo-project/backend
sudo ./scripts/docker-fix-permissions.sh
```

Or manually:

```bash
cd ~/Documents/mapvo-project/backend
sudo docker compose down --remove-orphans
sudo docker compose up -d --build
```

### After the fix

Pick **one** style and stick to it:

| Style | Command |
|--------|---------|
| Without sudo (preferred if you are in group `docker`) | `docker compose up -d` |
| With sudo | `sudo docker compose up -d` |

Never alternate between them.

### Verify

```bash
curl http://localhost:8001/health   # core-banking
curl http://localhost:8080/health   # api-gateway (frontend EXPO_PUBLIC_API_URL)
docker compose ps
```

All services should show `Up` and `(healthy)` where healthchecks exist.

## API returns 500 / app shows errors after login

Two common causes:

1. **Stale API gateway process** — Auth fixes are on disk but uvicorn did not reload. Run the fix script with sudo, or start a fresh gateway:
   ```bash
   docker rm -f mapvo-api-gateway-fix backend-api-gateway-1 2>/dev/null
   cd ~/Documents/mapvo-project/backend
   docker run -d --name mapvo-api-gateway-fix --network backend_default \
     -p 8080:8000 --env-file .env -e ENV=dev backend-api-gateway
   ```

2. **Database schema behind code** — Apply marketplace columns on `products`:
   ```bash
   docker exec -i backend-postgres-1 psql -U ventureroot -d ventureroot \
     < ~/Documents/mapvo-project/migrations/011_product_marketplace_columns.sql
   ```

Verify:
```bash
curl -H "X-User-Id: YOUR-USER-UUID" -H "Authorization: Bearer x" \
  "http://localhost:8080/v1/inventory/products?limit=1"
```
Expected: `[]` or JSON list — not `Internal Server Error`.
