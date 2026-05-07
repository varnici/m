# Complete Setup Guide - Voice Inventory Application

## Project Overview

A voice-enabled inventory management system with React Native mobile frontend and FastAPI backend using Moonshine ASR for offline speech recognition.

**Key Features:**
- ✅ Voice input for inventory fields
- ✅ Barcode/QR code scanning
- ✅ Automatic profit/revenue calculation
- ✅ Real-time transcription with Moonshine
- ✅ Production-ready security (CORS, rate limiting, headers)
- ✅ TypeScript + Pydantic validation
- ✅ Comprehensive test coverage

---

## Prerequisites

### Required
- **Node.js 18+** (for React Native)
- **Python 3.11+** (for FastAPI backend)
- **Supabase account** (cloud database)
- **Git**

### Optional
- Docker & Docker Compose (for containerization)
- Postman (API testing)

---

## Backend Setup

### 1. Clone Repository & Install Dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment

Create `backend/.env` file:

```env
ENV=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key-here
API_SECRET_KEY=your-secret-key-here
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:3000,http://192.168.1.175:8000
```

**Get Supabase Credentials:**
1. Go to [supabase.com](https://supabase.com)
2. Create project
3. Go to Settings → API → Copy Project URL and Service Key

### 3. Initialize Database

First, ensure your Supabase project has the inventory schema. Run migration files:

```bash
# Login to Supabase CLI
npx supabase login

# Apply migrations
npx supabase db push
```

Or manually create tables in Supabase SQL editor:

```sql
-- Create inventory table
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name VARCHAR(255) NOT NULL,
  customer_id VARCHAR(100) NOT NULL,
  quantity INT NOT NULL CHECK (quantity >= 0),
  pack_quantity INT DEFAULT 0,
  product_cost DECIMAL(18,2) NOT NULL,
  price DECIMAL(18,2) NOT NULL,
  sold INT NOT NULL CHECK (sold >= 0),
  profit DECIMAL(18,2) GENERATED ALWAYS AS (price - product_cost) * sold STORED,
  revenue DECIMAL(18,2) GENERATED ALWAYS AS price * sold STORED,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create summary view
CREATE VIEW inventory_summary AS
SELECT
  COUNT(*) as total_items,
  SUM(sold) as total_sold,
  SUM(revenue) as total_revenue,
  SUM(profit) as total_profit,
  ROUND(100.0 * SUM(profit) / NULLIF(SUM(revenue), 0), 2) as margin_pct
FROM inventory;

-- Create indexes
CREATE INDEX idx_inventory_created_at ON inventory(created_at DESC);
CREATE INDEX idx_inventory_product_name ON inventory(product_name);
```

### 4. Run Backend

```bash
# Development
python -m uvicorn app.main:app --reload

# Production
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Backend will start at `http://localhost:8000`

### 5. Verify Backend

```bash
# Health check
curl http://localhost:8000/health

# Create test inventory item
curl -X POST http://localhost:8000/inventory/ \
  -H "Content-Type: application/json" \
  -d '{
    "product_name": "Widget A",
    "customer_id": "CUST001",
    "quantity": 100,
    "pack_quantity": 10,
    "product_cost": 5.00,
    "price": 10.00,
    "sold": 25
  }'
```

---

## Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
# or
yarn install
```

### 2. Configure Environment

Create `frontend/.env`:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.175:8000
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Get Supabase Keys:**
- Go to Supabase project → Settings → API
- Copy `Project URL` and `anon` key

### 3. Install Expo CLI

```bash
npm install -g expo-cli
```

### 4. Start Frontend

```bash
# Start development server
npm start
# or
expo start

# For Android
npm run android

# For iOS (macOS only)
npm run ios

# For web
npm run web
```

### 5. Test Frontend

Once Expo server starts:
1. Scan QR code with Expo Go app on your phone
2. App should load and connect to backend at configured API URL

---

## Voice Feature Testing

### Test Voice Transcription

1. **Manual Test:**
   ```bash
   # Record 5-10 seconds of speech
   ffmpeg -f alsa -i default -t 5 test_audio.wav
   
   # Send to backend
   curl -X POST http://localhost:8000/voice/transcribe \
     -F "file=@test_audio.wav"
   ```

2. **In App:**
   - Go to VoiceStockScreen
   - Tap mic button
   - Speak clearly: "one hundred twenty five"
   - Tap stop
   - Should see transcribed text and extracted number

### Debug Voice Issues

- **No audio permission:** Check app permissions in phone settings
- **Transcription timeout:** Check Moonshine model loading in backend logs
- **Blank transcript:** Verify audio quality, ensure no background noise

---

## Deployment

### Docker Deployment

```bash
# Build image
docker build -t inventory-api:1.0 backend/

# Run container
docker run -p 8000:8000 \
  -e SUPABASE_URL=https://your-project.supabase.co \
  -e SUPABASE_SERVICE_KEY=your-key \
  inventory-api:1.0
```

### Docker Compose

```bash
cd backend
docker-compose -f docker-compose-production.yml up -d
```

### Mobile App Build

```bash
# Create iOS build (macOS only)
eas build --platform ios

# Create Android build
eas build --platform android

# Create APK for Android
eas build --platform android --distribution internal
```

---

## API Documentation

### OpenAPI/Swagger

Once backend is running:
```
http://localhost:8000/docs
```

### Main Endpoints

#### Inventory CRUD

| Method | Endpoint | Rate Limit | Description |
|--------|----------|-----------|-------------|
| `POST` | `/inventory/` | 60/min | Create item |
| `GET` | `/inventory/` | 120/min | List items |
| `GET` | `/inventory/summary` | 60/min | Get summary |
| `GET` | `/inventory/{id}` | 120/min | Get item |
| `PATCH` | `/inventory/{id}` | 60/min | Update item |
| `DELETE` | `/inventory/{id}` | 30/min | Delete item |

#### Voice

| Method | Endpoint | Rate Limit | Description |
|--------|----------|-----------|-------------|
| `POST` | `/voice/transcribe` | 30/min | Transcribe audio |

### Example API Calls

```bash
# Create inventory
curl -X POST http://localhost:8000/inventory/ \
  -H "Content-Type: application/json" \
  -d '{
    "product_name": "Laptop",
    "customer_id": "CUST001",
    "quantity": 50,
    "pack_quantity": 5,
    "product_cost": 800.00,
    "price": 1200.00,
    "sold": 10
  }'

# List inventory
curl http://localhost:8000/inventory/

# Get summary
curl http://localhost:8000/inventory/summary

# Transcribe voice
curl -X POST http://localhost:8000/voice/transcribe \
  -F "file=@audio.wav"
```

---

## Testing

### Backend Tests

```bash
cd backend
pytest tests/
pytest tests/ -v --cov=app
```

### Frontend Tests

```bash
cd frontend
npm test
npm test -- --coverage
```

---

## Troubleshooting

### Backend Won't Start

```bash
# Check Python version
python --version  # Should be 3.11+

# Verify dependencies installed
pip list | grep -E "fastapi|pydantic|supabase"

# Check .env file exists
cat backend/.env

# Reinstall if issues persist
pip install --upgrade -r requirements.txt
```

### Frontend Connection Issues

```bash
# Verify API URL in .env
cat frontend/.env | grep API_URL

# Check backend is running
curl http://192.168.1.175:8000/health

# Check network connectivity
ping 192.168.1.175
```

### Voice Not Working

```bash
# Check Moonshine model loads
# In backend logs, should see: "Loading Moonshine ASR model..."

# Test with known audio file
ffmpeg -f lavfi -i sine=frequency=1000:duration=2 test.wav
curl -X POST http://localhost:8000/voice/transcribe -F "file=@test.wav"

# Check permissions in app settings
```

### Database Connection Issues

```bash
# Verify Supabase credentials
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_KEY

# Test connection manually
python -c "from supabase import create_client; \
  client = create_client(url, key); \
  print(client.table('inventory').select('*').execute())"
```

---

## Project Structure

```
mapvo-project/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── config.py            # Configuration management
│   │   ├── routers/
│   │   │   ├── inventory.py     # Inventory CRUD endpoints
│   │   │   └── voice.py         # Voice transcription endpoint
│   │   ├── models/
│   │   │   └── inventory.py     # Pydantic schemas
│   │   ├── services/
│   │   │   ├── inventory_service.py    # Business logic
│   │   │   ├── voice_service.py        # Moonshine ASR
│   │   │   └── supabase_service.py     # DB client
│   │   └── middleware/
│   │       └── security.py      # CORS, rate limiting, headers
│   ├── tests/
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── docker-compose-production.yml
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── InventoryForm.tsx       # Main form
│   │   │   ├── AudioRecorder.tsx       # Audio recording UI
│   │   │   └── BarcodeScanner.tsx      # QR/barcode scanning
│   │   ├── screens/
│   │   │   └── inventory/
│   │   │       └── VoiceStockScreen.tsx # Voice input screen
│   │   ├── services/
│   │   │   └── inventoryApi.ts         # API client
│   │   └── types/
│   │       └── voice-inventory.ts      # TypeScript types
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
├── migrations/
│   └── *.sql                    # Database migrations
└── README.md
```

---

## Next Steps

1. **Set up CI/CD pipeline** for automated testing and deployment
2. **Add e2e tests** with real audio samples
3. **Implement offline sync** for voice commands when no network
4. **Add analytics dashboard** to track inventory metrics
5. **Create admin UI** for user and store management

---

## Support

For issues:
1. Check backend logs: `tail -f backend/app.log`
2. Check frontend logs: Expo Go app → show logs
3. Run tests to verify setup
4. Check `.env` configuration
