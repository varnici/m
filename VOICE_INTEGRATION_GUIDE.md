# Voice Stock Screen Integration Guide

## Overview
The VoiceStockScreen has been fully integrated with the backend API to provide real-time voice transcription and inventory management.

## ✅ What's Fixed

### 1. Voice Transcription
- **Issue**: Was using mock setTimeout simulation
- **Fix**: Now uses real backend `/voice/transcribe` endpoint
- **How it works**:
  1. Records audio from device microphone
  2. Converts recording to Blob
  3. Uploads to `POST /voice/transcribe`
  4. Backend returns transcribed text and extracted numbers
  5. Updates UI with results

### 2. Inventory Display
- **Issue**: No table to display inventory data
- **Fix**: Added table view with toggle button
- **Features**:
  - **Summary Cards**: Revenue, Profit, Items, Sold count
  - **Inventory Table**: Shows top 10 items with Product, Qty, Price, Profit
  - **Refresh Button**: Manually reload data
  - **Auto-reload**: Reloads after voice transcription

### 3. Frontend-Backend Integration
- **Issue**: Frontend not calling real API endpoints
- **Fix**: Integrated with existing `inventoryApi.ts` service
- **Endpoints used**:
  - `POST /voice/transcribe` - Voice transcription
  - `GET /inventory/` - List inventory
  - `GET /inventory/summary` - Get summary stats

## 📱 How to Use

### Voice Recording
1. Navigate to VoiceStockScreen
2. Tap the microphone button to start recording
3. Speak your command (e.g., "Added 50 units of rice")
4. Tap again to stop recording
5. Backend transcribes and returns result
6. Inventory table auto-updates

### View Inventory Table
1. Tap the **Package** icon (top right)
2. See summary cards with key metrics
3. Scroll through inventory table
4. Tap **refresh icon** to reload data
5. Tap **Package** icon again to return to voice

## 🔧 Backend Requirements

### Ensure Backend is Running
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Required Services
- **Supabase**: Database for inventory data
  - Tables: `inventory`
  - RLS policies configured
  
- **Moonshine ASR**: Voice transcription engine
  - Model: `moonshine/base` (auto-downloaded)
  - Audio formats: WAV, WebM, OGG, MP3, M4A
  - Max file size: 10MB

### Backend Environment Variables
```
SUPABASE_URL=<your_supabase_url>
SUPABASE_SERVICE_KEY=<your_service_key>
API_SECRET_KEY=<your_secret>
```

## 📱 Frontend Configuration

### Environment Variables
File: `frontend/.env`
```
EXPO_PUBLIC_API_URL=http://192.168.1.175:8000
EXPO_PUBLIC_SUPABASE_URL=https://oeovcwpepsbgrapbnbkz.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_9kpVJu8ZcVCv-HDJP0K6nQ_p66UpnIF
```

### Mobile App Setup
```bash
cd frontend
npm install
expo start
# Choose: android / ios / web
```

## 🐛 Troubleshooting

### Voice Recording Not Working
**Problem**: "Permission to access microphone was denied"
**Solution**: 
- Check app permissions on device
- iOS: Settings → App → Microphone → Allow
- Android: Settings → Apps → Permissions → Microphone → Allow

### "Voice upload failed" Error
**Problem**: Audio upload fails with 500 error
**Solution**:
1. Check backend is running: `curl http://localhost:8000/health`
2. Verify Moonshine model is installed: `pip install moonshine-onnx`
3. Check firewall allows port 8000
4. Verify `EXPO_PUBLIC_API_URL` matches backend address

### No Inventory Data Showing
**Problem**: Table shows "No inventory items"
**Solution**:
1. Check Supabase connection: `curl http://localhost:8000/inventory/`
2. Verify inventory records exist in Supabase
3. Check authentication token is valid
4. Ensure RLS policies allow read access

### API URL Connection Error
**Problem**: "Failed to load inventory: fetch failed"
**Solution**:
1. Verify backend URL in `frontend/.env`:
   - Local: `http://localhost:8000`
   - Network: `http://192.168.1.175:8000` (adjust IP)
   - Remote: `https://your-api.com`
2. Test with curl: `curl http://192.168.1.175:8000/health`
3. Check firewall/routing between mobile and backend

### Blank Transcription
**Problem**: Voice records but returns empty text
**Solution**:
1. Check audio quality (clear, no background noise)
2. Verify minimum audio duration (at least 0.5 seconds)
3. Try slower speech
4. Test with backend directly:
   ```bash
   curl -X POST -F "file=@audio.wav" http://localhost:8000/voice/transcribe
   ```

## 📊 API Reference

### Voice Transcription
**Endpoint**: `POST /voice/transcribe`
**Rate Limit**: 30 requests/minute

Request:
```
Content-Type: multipart/form-data
file: <audio_file>
```

Response:
```json
{
  "text": "added fifty units of rice",
  "extracted_number": "50",
  "field_type": "number"
}
```

### Inventory List
**Endpoint**: `GET /inventory/?limit=100&offset=0`

Response:
```json
[
  {
    "id": "uuid",
    "product_name": "Rice 5kg",
    "quantity": 50,
    "price": 250.00,
    "profit": 50.00,
    "sold": 10,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### Inventory Summary
**Endpoint**: `GET /inventory/summary`

Response:
```json
{
  "total_items": 45,
  "total_sold": 320,
  "total_revenue": 45000.00,
  "total_profit": 9000.00,
  "margin_pct": 20.00
}
```

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    VoiceStockScreen                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User taps mic                                           │
│  │                                                          │
│  2. Audio.Recording captures voice                          │
│  │                                                          │
│  3. Convert to Blob & upload                                │
│  │                                                          │
│  └──> POST /voice/transcribe (Backend)                      │
│       │                                                     │
│       └──> Moonshine ASR Model                              │
│            │                                                │
│            └──> Returns: text + extracted_number            │
│                                                             │
│  4. Display transcription result                            │
│  │                                                          │
│  5. Auto-reload inventory data                              │
│  │                                                          │
│  └──> GET /inventory/  +  GET /inventory/summary            │
│       │                                                     │
│       └──> Supabase Database                                │
│                                                             │
│  6. Update UI with inventory table                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## ✨ Features

- ✅ Real-time voice transcription
- ✅ Automatic inventory sync
- ✅ Summary dashboard with key metrics
- ✅ Scrollable inventory table (top 10 items)
- ✅ Error messages with troubleshooting hints
- ✅ Activity history with timestamps
- ✅ Refresh button for manual reload
- ✅ Toggle between voice and table views
- ✅ Loading indicators during processing
- ✅ Color-coded status (success/error)

## 🚀 Next Steps

1. **Test Voice Recording**: Try recording a simple phrase
2. **Verify API Connection**: Check that inventory data loads
3. **Monitor Logs**: Use backend console for error details
4. **Add More Items**: Create inventory records to test table display
5. **Optimize**: Adjust table pagination for performance

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Check backend logs: `docker logs mapvo-backend` (if using Docker)
3. Verify environment variables are set
4. Test endpoints manually with curl
5. Check network connectivity between frontend and backend
