# Production Deployment Guide

## Pre-Deployment Checklist

Before deploying to production, ensure all items are complete:

### Security ✅
- [ ] All secrets moved to AWS Secrets Manager (or equivalent)
- [ ] No `.env` files committed to git
- [ ] CORS origins whitelist configured for production domains
- [ ] HTTPS certificate installed (Let's Encrypt or ACM)
- [ ] Rate limiting verified working
- [ ] Database Row-Level Security (RLS) enabled
- [ ] API keys rotated before deployment
- [ ] Security headers verified in production

### Testing ✅
- [ ] All unit tests passing: `pytest tests/ -v`
- [ ] Frontend tests passing: `npm test`
- [ ] Manual voice workflow tested end-to-end
- [ ] API load tested (concurrent requests)
- [ ] Voice transcription tested with 10+ audio samples
- [ ] Barcode scanning tested with real QR codes
- [ ] Error scenarios tested (network down, timeout, etc.)
- [ ] Database queries optimized (indexes verified)

### Code Quality ✅
- [ ] No console.log/print statements in production code
- [ ] TypeScript strict mode enabled
- [ ] Pydantic validation comprehensive
- [ ] Error messages non-sensitive (no stack traces to client)
- [ ] Logging configured for audit trail
- [ ] Code reviewed by team member
- [ ] No hardcoded credentials or API keys

### Documentation ✅
- [ ] API documentation complete (Swagger/OpenAPI)
- [ ] Runbook created for on-call team
- [ ] Deployment steps documented
- [ ] Rollback procedures documented
- [ ] Emergency contacts listed
- [ ] Monitoring alerts configured
- [ ] Database backup procedures verified

### Infrastructure ✅
- [ ] Production Supabase project created (separate from staging)
- [ ] Database backups automated (Supabase handles this)
- [ ] CDN configured (optional, for static assets)
- [ ] WAF configured (AWS WAF or Cloudflare)
- [ ] DDoS protection enabled
- [ ] Load balancer configured (if multi-instance)
- [ ] Auto-scaling policies set
- [ ] Monitoring dashboard created

### Deployment ✅
- [ ] Docker image built and tested
- [ ] Docker image pushed to registry
- [ ] Kubernetes manifests created (if using K8s)
- [ ] Environment-specific configs ready
- [ ] Database migrations tested on staging
- [ ] Rollback plan prepared
- [ ] Maintenance window scheduled
- [ ] Stakeholders notified

---

## Step-by-Step Deployment

### 1. Prepare Production Supabase Project

```bash
# Create new Supabase project for production (separate from staging)
# 1. Go to supabase.com
# 2. Create project "mapvo-production"
# 3. Wait for setup (5-10 minutes)
# 4. Copy Project URL and Service Key
```

### 2. Run Database Migrations

```bash
# Connect to production database
SUPABASE_URL=https://prod-project.supabase.co \
SUPABASE_SERVICE_KEY=prod-key \
npx supabase db push

# Or manually in Supabase SQL editor:
# - Run migration files from /migrations/
# - Verify tables, views, indexes created
# - Test Row-Level Security policies
```

### 3. Build & Push Docker Image

```bash
# Build image
docker build -t inventory-api:1.0.0 backend/

# Tag for registry
docker tag inventory-api:1.0.0 \
  your-registry.azurecr.io/inventory-api:1.0.0

# Push to registry
docker push your-registry.azurecr.io/inventory-api:1.0.0

# Verify image
docker run --rm your-registry.azurecr.io/inventory-api:1.0.0 \
  python -c "from app.main import app; print('OK')"
```

### 4. Deploy Backend

#### Option A: AWS ECS/Fargate

```bash
# Create ECS task definition
cat > task-definition.json << 'EOF'
{
  "family": "inventory-api-prod",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "inventory-api",
      "image": "your-registry.azurecr.io/inventory-api:1.0.0",
      "portMappings": [{"containerPort": 8000}],
      "environment": [
        {"name": "ENV", "value": "production"}
      ],
      "secrets": [
        {"name": "SUPABASE_URL", "valueFrom": "arn:aws:secretsmanager:region:account:secret:prod/supabase-url"},
        {"name": "SUPABASE_SERVICE_KEY", "valueFrom": "arn:aws:secretsmanager:region:account:secret:prod/supabase-key"},
        {"name": "API_SECRET_KEY", "valueFrom": "arn:aws:secretsmanager:region:account:secret:prod/api-secret"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/inventory-api-prod",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOF

# Register task
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Update service
aws ecs update-service \
  --cluster prod \
  --service inventory-api \
  --task-definition inventory-api-prod
```

#### Option B: Google Cloud Run

```bash
# Build and push
gcloud builds submit --tag gcr.io/PROJECT/inventory-api:1.0.0 backend/

# Deploy
gcloud run deploy inventory-api \
  --image gcr.io/PROJECT/inventory-api:1.0.0 \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars ENV=production \
  --set-secrets SUPABASE_URL=projects/PROJECT/secrets/supabase-url/versions/latest \
  --set-secrets SUPABASE_SERVICE_KEY=projects/PROJECT/secrets/supabase-key/versions/latest
```

#### Option C: DigitalOcean App Platform

```bash
# Push image to registry
docker tag inventory-api:1.0.0 registry.digitalocean.com/PROJECT/inventory-api:1.0.0
docker push registry.digitalocean.com/PROJECT/inventory-api:1.0.0

# Deploy via CLI or Dashboard
doctl apps create --spec app.yaml
```

### 5. Configure Frontend for Production

```bash
# Create frontend/.env.production
cat > frontend/.env.production << 'EOF'
EXPO_PUBLIC_API_URL=https://api.example.com
EXPO_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=prod-anon-key
EOF

# Build for iOS/Android
eas build --platform ios --profile production
eas build --platform android --profile production
```

### 6. Deploy Mobile App

#### iOS
```bash
# Submit to App Store
eas submit --platform ios --latest

# Or use Xcode manually
eas build --platform ios --profile production --output app.ipa
```

#### Android
```bash
# Submit to Google Play
eas submit --platform android --latest

# Or upload APK manually
eas build --platform android --profile production --output app.apk
```

### 7. Verify Production Deployment

```bash
# Health check
curl https://api.example.com/health
# Should return: {"status": "ok", "service": "inventory-api"}

# Test API
curl -X GET https://api.example.com/inventory/

# Test voice endpoint
curl -X POST https://api.example.com/voice/transcribe \
  -F "file=@test.wav"

# Check logs
# AWS: CloudWatch
# GCP: Cloud Logging
# DigitalOcean: App Platform logs
```

### 8. Monitor Production

```bash
# Set up monitoring dashboard
# - Response times
# - Error rates
# - Database query performance
# - Voice transcription latency
# - Rate limit hits
# - Disk usage
# - Memory usage

# Set up alerts for:
# - Error rate > 1%
# - Response time > 2s
# - Database connection pool > 90%
# - Out of memory
# - Disk usage > 85%
```

---

## Environment-Specific Configuration

### Development
```env
ENV=development
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:3000
# Debug: True
# Log Level: DEBUG
```

### Staging
```env
ENV=staging
ALLOWED_ORIGINS=https://staging.example.com
# Debug: False
# Log Level: INFO
```

### Production
```env
ENV=production
ALLOWED_ORIGINS=https://example.com
# Debug: False
# Log Level: WARNING
# Cache-Control: no-store
# HSTS: max-age=31536000
```

---

## Secrets Management

### Store in AWS Secrets Manager

```bash
# Create secret
aws secretsmanager create-secret \
  --name prod/supabase-url \
  --secret-string "https://prod-project.supabase.co"

aws secretsmanager create-secret \
  --name prod/supabase-key \
  --secret-string "your-production-service-key"

aws secretsmanager create-secret \
  --name prod/api-secret \
  --secret-string "your-production-api-secret"
```

### Or GitHub Secrets (for CI/CD)

```yaml
# .github/workflows/deploy.yml
env:
  SUPABASE_URL: ${{ secrets.PROD_SUPABASE_URL }}
  SUPABASE_SERVICE_KEY: ${{ secrets.PROD_SUPABASE_SERVICE_KEY }}
  API_SECRET_KEY: ${{ secrets.PROD_API_SECRET_KEY }}
```

---

## Monitoring & Alerts

### Key Metrics to Monitor

```
API Performance:
- Request latency (p50, p95, p99)
- Error rate
- Requests per second
- HTTP status code distribution

Voice Transcription:
- Transcription latency
- Accuracy rate
- File size distribution
- Model load time

Database:
- Connection pool usage
- Query latency
- Disk usage
- Row count

Infrastructure:
- CPU usage
- Memory usage
- Disk usage
- Network bandwidth
```

### Create Alerts

```
Critical (Page oncall):
- Error rate > 5%
- API down
- Database connection pool exhausted
- Disk usage > 95%

Warning (Email):
- Error rate > 1%
- Response time > 5s
- Memory usage > 80%
- Database slow queries
```

---

## Rollback Procedure

### If Production Issues Occur

```bash
# 1. Identify issue from logs
aws logs tail /ecs/inventory-api-prod --follow

# 2. Rollback to previous image
aws ecs update-service \
  --cluster prod \
  --service inventory-api \
  --task-definition inventory-api-prod:1  # Previous revision

# 3. Monitor rollback
aws ecs describe-services \
  --cluster prod \
  --services inventory-api

# 4. Verify health
curl https://api.example.com/health

# 5. Post-incident review
# Document what went wrong
# Create action items to prevent recurrence
```

---

## CI/CD Pipeline (GitHub Actions)

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
      - '.github/workflows/deploy.yml'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r backend/requirements.txt
      - run: pytest backend/tests/ -v
      
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: docker/build-push-action@v4
        with:
          context: ./backend
          push: true
          tags: ${{ secrets.REGISTRY }}/inventory-api:${{ github.sha }}
          tags: ${{ secrets.REGISTRY }}/inventory-api:latest
          
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster prod \
            --service inventory-api \
            --force-new-deployment
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_KEY }}
          AWS_DEFAULT_REGION: us-east-1
```

---

## Performance Tuning

### Database Optimization

```sql
-- Add more indexes if needed
CREATE INDEX idx_inventory_customer_id ON inventory(customer_id);
CREATE INDEX idx_inventory_updated_at ON inventory(updated_at DESC);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM inventory WHERE product_name LIKE 'Laptop%';

-- Vacuum to reclaim space
VACUUM ANALYZE;
```

### API Optimization

```python
# In production, use connection pooling
# In app/services/supabase_service.py:
# Consider adding caching layer for frequently accessed data
# Monitor slow queries and optimize

# Increase rate limits if needed (or use Redis for distributed rate limiting)
# Currently: 200/minute global, 30-120/minute per endpoint
```

### Frontend Optimization

```bash
# Build optimized production bundle
npm run build

# Measure bundle size
npm run bundle-size

# Test app performance
npx react-native run-android --release
```

---

## Scaling Considerations

### Horizontal Scaling
- Run multiple API instances behind load balancer
- Use Supabase connection pooling
- Implement caching (Redis)
- Use CDN for static assets

### Vertical Scaling
- Increase instance CPU/memory
- Optimize queries and code
- Monitor resource usage

### Database Scaling
- Supabase handles auto-scaling for PostgreSQL
- Monitor connection pool
- Archive old inventory records if needed

---

## Disaster Recovery

### Backup & Restore

```bash
# Supabase automatically backs up database daily
# To restore: Use Supabase dashboard or contact support

# Manual backup
pg_dump postgresql://user:pass@host/db > backup.sql

# Restore from backup
psql postgresql://user:pass@host/db < backup.sql
```

### Data Export

```bash
# Export inventory data to CSV
SELECT * FROM inventory 
ORDER BY created_at DESC
TO '/tmp/inventory_export.csv'
WITH (FORMAT csv, HEADER);
```

---

## Post-Deployment

### Verify Everything Works

```bash
# 1. API health
curl https://api.example.com/health

# 2. Create test inventory
curl -X POST https://api.example.com/inventory/ \
  -H "Content-Type: application/json" \
  -d '{"product_name":"Test","customer_id":"TEST","quantity":1,"pack_quantity":0,"product_cost":10,"price":20,"sold":0}'

# 3. Test voice endpoint
curl -X POST https://api.example.com/voice/transcribe \
  -F "file=@test.wav"

# 4. Check logs for errors
# Monitor error rate for first 24 hours
```

### Communicate to Stakeholders

- ✅ Deployment successful
- ✅ All tests passing
- ✅ Monitoring active
- ✅ Rollback plan ready
- ✅ Oncall team briefed

---

## Maintenance Windows

### Planned Maintenance
- Schedule during low-traffic periods
- Notify users in advance (24+ hours)
- Have rollback plan
- Test changes in staging first
- Monitor closely after deployment

### Emergency Maintenance
- Document issue
- Deploy fix quickly
- Monitor metrics
- Post-incident review
- Update runbook

---

## Support & Escalation

### On-Call Runbook

```
1. Alert triggered → Check CloudWatch/logs
2. Identify issue → Gather error traces
3. Page oncall → Follow escalation procedures
4. Implement fix → Test in staging first
5. Deploy fix → Monitor closely
6. Verify health → Check API endpoints
7. Document → Post-incident review
8. Communicate → Update stakeholders
```

### Contact Info
- Platform: [Slack channel, email]
- Primary Oncall: [Name, phone]
- Backup Oncall: [Name, phone]
- Manager on Call: [Name, phone]

---

## Success Criteria

After deployment, verify:
- ✅ API responds in <200ms
- ✅ Zero errors for first 24 hours
- ✅ Voice transcription working
- ✅ Inventory CRUD operations working
- ✅ Database queries performing well
- ✅ Monitoring alerts firing correctly
- ✅ Logs collecting properly
- ✅ Backups happening daily

---

## Final Checklist

- [ ] All tests passing
- [ ] Code reviewed
- [ ] Secrets stored securely
- [ ] Database migrated
- [ ] Docker image built & tested
- [ ] Backend deployed & verified
- [ ] Frontend deployed & verified
- [ ] Monitoring configured
- [ ] Alerts set up
- [ ] Oncall team briefed
- [ ] Stakeholders notified
- [ ] Post-deployment verification complete

✅ **Ready for Production!**
