#!/bin/bash

# Budget_Best Quick Setup Script
# This script sets up the Budget_Best feature for development

set -e

echo "🚀 Budget_Best Quick Setup"
echo "=================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check dependencies
echo -e "${BLUE}📦 Checking dependencies...${NC}"

if ! command -v python3 &> /dev/null; then
  echo "❌ Python 3 not found"
  exit 1
fi

if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found"
  exit 1
fi

if ! command -v expo &> /dev/null; then
  echo "⚠️  Expo not installed. Run: npm install -g expo-cli"
fi

echo -e "${GREEN}✓ Dependencies checked${NC}"

# 2. Setup Backend
echo -e "\n${BLUE}🔧 Setting up backend...${NC}"

cd backend

if [ ! -f .env ]; then
  echo "⚠️  .env not found in backend/"
  echo "Creating .env template..."
  cat > .env << EOF
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_KEY=your_service_key_here
DATABASE_URL=postgresql://user:pass@host/db
API_SECRET_KEY=your_secret_key_here
ENVIRONMENT=development
EOF
  echo "📝 Please update backend/.env with your Supabase credentials"
fi

# Install Python dependencies
if [ ! -d venv ]; then
  echo "Creating Python virtual environment..."
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
else
  source venv/bin/activate
fi

echo -e "${GREEN}✓ Backend setup complete${NC}"

# 3. Setup Frontend
echo -e "\n${BLUE}🎨 Setting up frontend...${NC}"

cd ../frontend

if [ ! -f .env ]; then
  echo "⚠️  .env not found in frontend/"
  echo "Creating .env template..."
  cat > .env << EOF
EXPO_PUBLIC_API_URL=http://localhost:8000
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
EOF
  echo "📝 Please update frontend/.env with your Supabase credentials"
fi

# Install npm dependencies
if [ ! -d node_modules ]; then
  echo "Installing npm packages..."
  npm install
fi

echo -e "${GREEN}✓ Frontend setup complete${NC}"

# 4. Database Setup
echo -e "\n${BLUE}🗄️  Database Setup Instructions${NC}"
echo "=================================="
echo ""
echo "To deploy the Budget_Best database schema:"
echo ""
echo "1. Connect to your Supabase database:"
echo "   psql -h <your-host>.supabase.co -U postgres -d postgres"
echo ""
echo "2. Run the migration:"
echo "   \\i migrations/006_budget_best_system.sql"
echo ""
echo "3. Verify tables created:"
echo "   \\dt"
echo ""

# 5. Summary
echo -e "\n${BLUE}📋 Setup Summary${NC}"
echo "=================================="
echo ""
echo -e "${GREEN}✓ Backend ready${NC}"
echo "  - Python venv activated"
echo "  - Dependencies installed"
echo "  - .env configured (if needed)"
echo ""
echo -e "${GREEN}✓ Frontend ready${NC}"
echo "  - Node packages installed"
echo "  - .env configured (if needed)"
echo ""
echo -e "${YELLOW}⏳ Database${NC}"
echo "  - Migration: migrations/006_budget_best_system.sql"
echo "  - Manual deployment required via psql"
echo ""

# 6. Next Steps
echo -e "\n${BLUE}🚀 Next Steps${NC}"
echo "=================================="
echo ""
echo "1. Update environment variables in .env files"
echo "2. Deploy database migration"
echo "3. Start backend:"
echo "   cd backend && source venv/bin/activate"
echo "   uvicorn app.main:app --reload"
echo ""
echo "4. In another terminal, start frontend:"
echo "   cd frontend && npm start"
echo ""
echo "5. Follow BUDGET_BEST_INTEGRATION_GUIDE.md to wire up screens"
echo ""

echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
