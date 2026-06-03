# Voice Integration - Quick Reference

## 🚀 Get Started in 5 Minutes

### Step 1: Start Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
✓ Check: Open http://localhost:8000/health in browser

### Step 2: Start Frontend
```bash
cd frontend
npm install  # if not done
expo start
# Then choose android, ios, or web
```

### Step 3: Open VoiceStockScreen
- Navigate to Voice AI screen in the app
- You should see the voice interface

### Step 4: Test Voice
1. Tap microphone button
2. Speak: "Added fifty units of rice"
3. See transcription appear
4. See history update

### Step 5: Test Table
1. Tap Package icon (top right)
2. See summary cards
3. See inventory table
4. Tap refresh button

---

## 🎯 What's Fixed

| Issue | Solution | Status |
|-------|----------|--------|
| Voice not responding | Connected to real backend API | ✅ Fixed |
| No data display | Added inventory table with toggle | ✅ Fixed |
| No frontend-backend integration | Integrated with inventoryApi service | ✅ Fixed |

---

## 📱 Screen Layout

### Voice View (Default)
```
┌──────────────────────────────┐
│ ← Back    Voice AI    🔄     │  ← Toggle to Table
├──────────────────────────────┤
│                              │
│        ▭ ▯ ▮ ▬ ▲              │  ← Visualizer
│        (animated when recording) │
│                              │
│   Listening... / Heard: "..." │  ← Transcription
│                              │
│         🎤 (Tap to record)    │  ← Button
│         (Green when recording)│
│                              │
├──────────────────────────────┤
│ Recent Activity              │
│ [✓ Message 1] [✓ Message 2]  │  ← Horizontal scroll
└──────────────────────────────┘
```

### Table View (Click Package Icon)
```
┌──────────────────────────────┐
│ ← Back    Voice AI    🎤     │  ← Toggle back to Voice
├──────────────────────────────┤
│ ┌─────────────────────────┐   │
│ │ Revenue: $45,000        │   │  ← Summary Cards (2x2 grid)
│ └─────────────────────────┘   │
│ ┌─────────────────────────┐   │
│ │ Profit: $9,000          │   │
│ └─────────────────────────┘   │
│                               │
│ Inventory        🔄 (refresh) │
│ ┌──────────────────────────┐  │
│ │ Product  │ Qty │ P │ P  │  │  ← Table Header
│ ├──────────────────────────┤  │
│ │ Rice 5kg │ 50  │ 250│50 │  │  ← Table Row
│ │ Flour    │ 30  │ 150│30 │  │
│ │ Beans    │ 20  │ 100│20 │  │
│ └──────────────────────────┘  │
│ +12 more items                 │
│                               │
├──────────────────────────────┤
│ Recent Activity              │
│ [✓ Message 1] [✓ Message 2]  │
└──────────────────────────────┘
```

---

## 🔌 API Integration Diagram

```
Recording → Blob → uploadVoice() 
                    ↓
                POST /voice/transcribe
                    ↓
              Moonshine ASR Model
                    ↓
           Return: {text, extracted_number}
                    ↓
          Display: "Heard: [text]"
                    ↓
          Auto-reload: listInventory() + getSummary()
                    ↓
              GET /inventory/
              GET /inventory/summary
                    ↓
           Display: Table + Summary Cards
```

---

## 🧪 Quick Tests

### Test 1: Can I Record?
**Action**: Tap microphone  
**Expected**: Green button, "Listening..." text  
**Result**: ✓ / ✗

### Test 2: Does Backend Receive?
**Action**: Speak clearly, wait for processing  
**Expected**: "Heard: [your words]" appears  
**Result**: ✓ / ✗

### Test 3: Does Data Load?
**Action**: Click Package icon  
**Expected**: Inventory table with items  
**Result**: ✓ / ✗

### Test 4: Does Refresh Work?
**Action**: Click refresh button in table  
**Expected**: Data reloads (might show loading spinner)  
**Result**: ✓ / ✗

### Test 5: Error Handling?
**Action**: Disconnect network, try recording  
**Expected**: Error message appears  
**Result**: ✓ / ✗

---

## 🔧 Troubleshooting

### Voice Not Recording
```bash
# Check:
1. Device microphone permissions (Settings → Microphone)
2. Backend logs: docker logs mapvo-backend (if Docker)
3. Network: curl http://localhost:8000/health
```

### No Inventory Data
```bash
# Check:
1. Inventory exists: curl http://localhost:8000/inventory/
2. Supabase configured: echo $SUPABASE_URL
3. Database permissions: Check RLS policies in Supabase
```

### API Connection Error
```bash
# Check:
1. Backend running: ps aux | grep uvicorn
2. Port 8000 open: lsof -i :8000
3. API URL correct: Check frontend/.env
4. Network routing: ping 192.168.1.175
```

---

## 📋 File Checklist

✅ Frontend Screen
- Location: `frontend/src/screens/inventory/VoiceStockScreen.tsx`
- Status: Updated with real API integration

✅ Frontend Service
- Location: `frontend/src/services/inventoryApi.ts`
- Status: Already configured

✅ Backend Router
- Location: `backend/app/routers/voice.py`
- Status: Already configured

✅ Backend Service
- Location: `backend/app/services/voice_service.py`
- Status: Already configured

✅ Configuration Files
- `frontend/.env`: ✅ Configured
- `backend/.env`: ✅ Configured

---

## 💡 Pro Tips

1. **Test Audio Quality**: Speak clearly, no background noise
2. **Check Network**: Ensure frontend and backend on same network
3. **Use Correct IP**: Adjust `EXPO_PUBLIC_API_URL` for your network
4. **Clear Cache**: `expo start --clear` if having issues
5. **Monitor Logs**: Keep backend console open for debugging
6. **Check History**: Use history panel to see what happened
7. **Test Manually**: Use curl to test API endpoints first

---

## 📊 Expected Behavior

### ✅ Working Correctly
```
1. Recording starts (green button)
2. Recording stops, processing shows spinner
3. Text appears: "Heard: your words"
4. History updates with status icon
5. Click Package → Table loads with data
6. Summary cards show correct numbers
7. Can click refresh → data reloads
8. Toggle back to voice → works again
```

### ❌ Not Working
```
1. Button doesn't respond
2. Recording doesn't start
3. Processing hangs
4. Error appears: "Failed to connect"
5. No data in table
6. Toggle button frozen
```

---

## 🎓 Code Structure

**Frontend Files Modified**:
```
frontend/
├── src/
│   ├── screens/inventory/
│   │   └── VoiceStockScreen.tsx ← MODIFIED
│   ├── services/
│   │   └── inventoryApi.ts (used, not modified)
│   └── types/
│       └── voice-inventory.ts (used, not modified)
└── .env (configured)
```

**Backend Files Used**:
```
backend/
├── app/
│   ├── routers/
│   │   ├── voice.py (used)
│   │   └── inventory.py (used)
│   └── services/
│       ├── voice_service.py (used)
│       └── inventory_service.py (used)
└── .env (configured)
```

---

## 📞 Need Help?

1. Check `VOICE_INTEGRATION_GUIDE.md` for detailed info
2. Review `VOICE_VERIFICATION_CHECKLIST.md` to verify setup
3. Check backend logs for errors
4. Test API endpoints with curl
5. Verify network connectivity

---

## ✨ Success Indicators

✅ Backend starts without errors  
✅ Frontend connects to API  
✅ Voice records and uploads  
✅ Transcription appears  
✅ Inventory table displays  
✅ Summary cards show numbers  
✅ Refresh button works  
✅ Toggle between views works  
✅ Error messages are helpful  
✅ History shows all events  

**Ready to go!** 🚀
