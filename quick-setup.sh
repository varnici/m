#!/bin/bash
# Quick Start Script for Voice Inventory Application

set -e

echo "🚀 Voice Inventory Application - Quick Start"
echo "============================================="
echo ""

# Check Python version
echo "✓ Checking Python version..."
python_version=$(python --version 2>&1 | awk '{print $2}')
echo "  Python $python_version"

# Create virtual environment if it doesn't exist
if [ ! -d "backend/venv" ]; then
    echo "✓ Creating virtual environment..."
    cd backend
    python -m venv venv
    cd ..
else
    echo "✓ Virtual environment already exists"
fi

# Activate virtual environment
echo "✓ Activating virtual environment..."
source backend/venv/bin/activate

# Install dependencies
echo "✓ Installing backend dependencies..."
pip install --quiet -r backend/requirements.txt

echo "✓ Installing frontend dependencies..."
cd frontend && npm install --quiet && cd ..

# Create .env files if they don't exist
if [ ! -f "backend/.env" ]; then
    echo ""
    echo "⚠️  backend/.env not found. Please configure:"
    echo "   1. Get Supabase credentials from https://supabase.com"
    echo "   2. Create backend/.env with:"
    echo "      ENV=development"
    echo "      SUPABASE_URL=https://your-project.supabase.co"
    echo "      SUPABASE_SERVICE_KEY=your-service-key"
    echo "      API_SECRET_KEY=your-secret-key"
    echo "      ALLOWED_ORIGINS=http://localhost:8081,http://192.168.1.175:8000"
else
    echo "✓ backend/.env exists"
fi

if [ ! -f "frontend/.env" ]; then
    echo "⚠️  frontend/.env not found. Please configure:"
    echo "   EXPO_PUBLIC_API_URL=http://192.168.1.175:8000"
else
    echo "✓ frontend/.env exists"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "   1. Configure .env files if not already done"
echo "   2. Start backend:  cd backend && python -m uvicorn app.main:app --reload"
echo "   3. In another terminal, start frontend: cd frontend && npm start"
echo "   4. Scan QR code in Expo Go on your phone"
echo ""
echo "📖 For detailed setup, see COMPLETE_SETUP_GUIDE.md"
