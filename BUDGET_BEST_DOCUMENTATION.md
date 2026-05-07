# Budget_Best: Micro-Savings & Budget Allocation Feature

**Version**: 1.0  
**Status**: 🚀 Production Ready  
**Last Updated**: April 29, 2024

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Core Features](#core-features)
3. [User Flows](#user-flows)
4. [Technical Architecture](#technical-architecture)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Frontend Components](#frontend-components)
8. [Installation & Setup](#installation--setup)
9. [Configuration](#configuration)
10. [Testing](#testing)
11. [Troubleshooting](#troubleshooting)

---

## Overview

**Budget_Best** is a comprehensive micro-savings platform designed to help users save daily toward fixed monthly obligations (Shop Rent, House Rent, Bills, Staff Salaries). The system includes:

- 💰 **Daily Savings Tracking** - Set goals and track daily progress
- ⏰ **Automated Reminders** - Get daily notifications to save
- 🎮 **Gamification** - Earn streaks and tier badges
- 🏦 **Zero-Loss Guarantee** - Your principal is always yours
- 📊 **Visual Buckets** - See money moving into expense categories
- 🤖 **Auto-Save** - Optional automatic transfers
- 📱 **Mobile-First** - React Native with Expo

---

## Core Features

### 1. **Savings Goals Management**
- Create multiple savings goals for different obligations
- Set target amounts and monthly goals
- Define deadline dates
- Track progress toward each goal
- Support for 5 goal types: Shop Rent, House Rent, Bills, Staff Salaries, Custom

### 2. **Daily Deposit & Transaction Tracking**
- Record deposits with timestamps
- Support for multiple transaction types (deposit, withdrawal, interest)
- Generate reference codes for audit trail
- View full transaction history per goal

### 3. **Automated Daily Reminders**
- Set reminder time for each goal (e.g., 8:00 AM)
- Push notifications with personalized messages
- Frequency options: daily, weekly, custom
- Integration with Expo Notifications

### 4. **Gamification System**
```
Streaks & Tiers:
- Bronze: 1-19 days
- Silver: 20-49 days
- Gold: 50-99 days
- Platinum: 100+ days

Badges:
- Week Warrior (7 days)
- Month Master (30 days)
- Consistency Champion (60 days)
- Savings Sage (100 days)
```

### 5. **Visual Budget Buckets**
- Allocate percentages to different goals
- See progress bars for each bucket
- Color-coded buckets for easy visualization
- Real-time calculation of allocated amounts

### 6. **Auto-Save Feature**
- Enable automatic daily transfers
- Select preset or custom amounts
- Choose transfer time
- Support for card, bank transfer, wallet

### 7. **Zero-Loss Guarantee Policy**
- Transparent fee structure
- Management costs covered by interest income
- 100% of principal returned
- User accepts policy before first deposit

### 8. **Transaction Audit Log**
- Complete activity history
- Track all actions (deposits, withdrawals, reminders, policy changes)
- Searchable and sortable logs
- GDPR compliant data storage

---

## User Flows

### Flow 1: New User Onboarding
```
1. User opens Budget_Best
2. Views Budget_Best Guarantee Policy
3. Accepts policy and terms
4. Creates first savings goal
5. Makes initial deposit
6. Sets daily reminder time
7. Receives confirmation
8. Enters dashboard
```

### Flow 2: Daily Saving
```
1. User gets reminder notification
2. Opens app → Deposit Screen
3. Selects preset amount or enters custom
4. Selects goal
5. Confirms deposit
6. Transaction recorded
7. Streak updated
8. Dashboard reflects new balance
```

### Flow 3: Monitoring Progress
```
1. User opens Dashboard
2. Views total savings
3. Sees current streak and tier
4. Reviews goal progress
5. Checks upcoming deadlines
6. Clicks goal for details
7. Views transaction history
8. Makes adjustments as needed
```

### Flow 4: Goal Management
```
1. User navigates to Goals Screen
2. Views active goals and buckets
3. Selects "Add New Goal"
4. Fills goal details
5. System calculates daily target
6. Goal activated
7. Reminder automatically scheduled
8. Goal appears on dashboard
```

---

## Technical Architecture

### System Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    React Native Frontend                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  BudgetBestDashboard                                │  │
│  │  ├─ BudgetBestDeposit                               │  │
│  │  ├─ BudgetBestGoals                                 │  │
│  │  ├─ BudgetBestGoalDetail                            │  │
│  │  ├─ BudgetBestSettings (Reminders)                  │  │
│  │  └─ BudgetBestPolicy                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                        ↓ HTTP/REST                          │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│              FastAPI Backend (Python)                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  /budget-best/goals       - CRUD operations         │  │
│  │  /budget-best/transactions - Record savings         │  │
│  │  /budget-best/reminders   - Manage reminders        │  │
│  │  /budget-best/streak      - Track gamification      │  │
│  │  /budget-best/auto-sweep  - Auto-save settings      │  │
│  │  /budget-best/buckets     - Visual breakdown        │  │
│  │  /budget-best/dashboard   - Aggregated view         │  │
│  │  /budget-best/policy      - Consent management      │  │
│  └──────────────────────────────────────────────────────┘  │
│                        ↓ SQL                                │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│              Supabase PostgreSQL Database                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  savings_goals                                       │  │
│  │  savings_transactions                                │  │
│  │  reminder_settings                                   │  │
│  │  savings_streaks                                     │  │
│  │  auto_sweep_settings                                 │  │
│  │  budget_buckets                                      │  │
│  │  transaction_logs                                    │  │
│  │  policy_consents                                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Tables Created

#### 1. `savings_goals`
```sql
id (UUID) - Primary key
user_id (UUID) - User reference
goal_name (VARCHAR) - Goal name
goal_type (VARCHAR) - Category
target_amount (DECIMAL) - Total target
monthly_goal (DECIMAL) - Monthly savings goal
current_savings (DECIMAL) - Amount saved so far
daily_target (DECIMAL) - Daily savings needed
deadline (DATE) - Target completion date
is_active (BOOLEAN) - Active status
created_at, updated_at (TIMESTAMP)
```

#### 2. `savings_transactions`
```sql
id (UUID) - Primary key
goal_id (UUID) - Goal reference
user_id (UUID) - User reference
amount (DECIMAL) - Transaction amount
transaction_type (VARCHAR) - deposit/withdrawal/interest
reference_code (VARCHAR) - Unique reference
status (VARCHAR) - completed/pending/failed
notes (TEXT) - Transaction notes
created_at (TIMESTAMP)
```

#### 3. `reminder_settings`
```sql
id (UUID) - Primary key
user_id (UUID) - User reference
goal_id (UUID) - Goal reference
reminder_time (TIME) - Scheduled time
reminder_enabled (BOOLEAN) - Active status
reminder_frequency (VARCHAR) - daily/weekly/custom
last_reminded_at (TIMESTAMP)
next_reminder_at (TIMESTAMP)
created_at, updated_at (TIMESTAMP)
```

#### 4. `savings_streaks`
```sql
id (UUID) - Primary key
user_id (UUID) - User reference (UNIQUE)
current_streak (INT) - Days in current streak
best_streak (INT) - Best streak ever
streak_start_date (DATE)
last_saved_date (DATE)
tier_level (VARCHAR) - bronze/silver/gold/platinum
badges (TEXT[]) - Array of earned badges
created_at, updated_at (TIMESTAMP)
```

#### 5. `auto_sweep_settings`
```sql
id (UUID) - Primary key
user_id (UUID) - User reference
goal_id (UUID) - Goal reference
auto_save_enabled (BOOLEAN)
auto_save_amount (DECIMAL)
auto_save_time (TIME)
payment_method (VARCHAR) - card/bank_transfer/wallet
payment_token (VARCHAR) - Encrypted token
last_auto_save_at (TIMESTAMP)
created_at, updated_at (TIMESTAMP)
```

#### 6. `budget_buckets`
```sql
id (UUID) - Primary key
user_id (UUID) - User reference
bucket_name (VARCHAR)
allocation_percentage (DECIMAL) - 0-100%
allocated_amount (DECIMAL)
bucket_color (VARCHAR) - Hex color
icon_name (VARCHAR)
priority_order (INT)
created_at, updated_at (TIMESTAMP)
```

#### 7. `transaction_logs`
```sql
id (UUID) - Primary key
user_id (UUID) - User reference
action (VARCHAR) - Action performed
action_details (JSONB) - Additional details
ip_address (INET)
user_agent (TEXT)
created_at (TIMESTAMP)
```

#### 8. `policy_consents`
```sql
id (UUID) - Primary key
user_id (UUID) - User reference
policy_version (VARCHAR)
policy_content (TEXT)
accepted (BOOLEAN)
accepted_at (TIMESTAMP)
created_at (TIMESTAMP)
```

---

## API Endpoints

All endpoints are under `/budget-best` prefix.

### Goals
```
POST   /goals                 - Create goal
GET    /goals                 - List goals
GET    /goals/{id}            - Get goal details
PATCH  /goals/{id}            - Update goal
DELETE /goals/{id}            - Soft delete goal
```

### Transactions
```
POST   /transactions                    - Record transaction
GET    /transactions/goal/{goal_id}     - Get goal transactions
```

### Reminders
```
POST   /reminders                       - Create reminder
PATCH  /reminders/{id}                  - Update reminder
GET    /reminders/send                  - Get pending reminders
```

### Streaks & Gamification
```
GET    /streak                          - Get user streak
```

### Auto-Save
```
POST   /auto-sweep                      - Create auto-save
GET    /auto-sweep/{id}                 - Get auto-save settings
PATCH  /auto-sweep/{id}                 - Update auto-save
```

### Buckets
```
POST   /buckets                         - Create bucket
GET    /buckets                         - List buckets
```

### Dashboard
```
GET    /dashboard                       - Get aggregated dashboard
```

### Policy
```
GET    /policy                          - Get/create policy
POST   /policy/{id}/accept              - Accept policy
```

---

## Frontend Components

### Screen Components

#### 1. **BudgetBestDashboard**
Main landing screen showing:
- Total savings
- Current streak with tier badge
- Active goals with progress bars
- Quick action buttons
- Upcoming deadlines
- Policy guarantee banner

#### 2. **BudgetBestDeposit**
Deposit transaction screen:
- Preset amount buttons (200, 500, 3000, 4000, 5000)
- Custom amount input
- Goal selection
- Optional reminder setup
- Confirmation and success states

#### 3. **BudgetBestGoals**
Goals management screen:
- List of active goals
- Visual bucket breakdown
- Add new goal form
- Edit/delete functionality
- Goal type selection

#### 4. **BudgetBestGoalDetail**
Individual goal details:
- Progress visualization
- Key metrics (daily target, days left)
- Transaction history
- Make deposit button
- Withdrawal option

#### 5. **BudgetBestSettings**
Configuration screen:
- Daily reminder setup per goal
- Notification preferences
- Auto-save toggle
- Privacy & security links
- Terms management

#### 6. **BudgetBestPolicy**
Policy consent screen:
- Budget_Best Guarantee details
- Zero-loss policy explanation
- Fee structure transparency
- Security guarantees
- Acceptance checkbox
- Full policy text

### Service/API Layer
```
budgetBestApi.ts
├─ createGoal()
├─ listGoals()
├─ getGoal()
├─ updateGoal()
├─ deleteGoal()
├─ recordTransaction()
├─ getGoalTransactions()
├─ createReminder()
├─ updateReminder()
├─ getStreak()
├─ createAutoSweep()
├─ getAutoSweep()
├─ createBucket()
├─ listBuckets()
├─ getDashboard()
├─ getPolicy()
└─ acceptPolicy()
```

---

## Installation & Setup

### Prerequisites
- Node.js 16+
- Python 3.9+
- PostgreSQL 14+
- Supabase account
- Expo CLI

### Backend Setup

**1. Install dependencies**
```bash
cd backend
pip install -r requirements.txt
```

**2. Create migration**
```bash
psql -U user -d database < migrations/006_budget_best_system.sql
```

**3. Configure environment**
```bash
# backend/.env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
API_SECRET_KEY=your_secret_key
```

**4. Run backend**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

**1. Install dependencies**
```bash
cd frontend
npm install
# or
yarn install
```

**2. Configure environment**
```bash
# frontend/.env
EXPO_PUBLIC_API_URL=http://localhost:8000
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**3. Run frontend**
```bash
expo start
# Choose: android, ios, or web
```

---

## Configuration

### Backend Configuration
```python
# app/config.py
class Settings(BaseSettings):
    supabase_url: str
    supabase_service_key: str
    api_secret_key: str
    allowed_origins: list[str] = [
        "http://localhost:8081",
        "http://localhost:3000",
        "https://your-app.com",
    ]
    environment: str = "development"
```

### Frontend Configuration
```typescript
// .env
EXPO_PUBLIC_API_URL=http://192.168.1.175:8000
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

### Notification Configuration
```typescript
// app/notifications.ts
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
```

---

## Testing

### Backend Tests
```bash
cd backend
pytest tests/
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Manual Testing Scenarios

**Scenario 1: Create Goal**
1. Login
2. Click "Add New Goal"
3. Fill: Shop Rent, ₦50,000, ₦50,000 monthly
4. Set deadline
5. Verify goal appears on dashboard

**Scenario 2: Make Deposit**
1. Click "Deposit"
2. Select preset ₦1,000
3. Select goal
4. Enable reminder at 08:00
5. Confirm
6. Verify transaction in history

**Scenario 3: Check Streak**
1. Make 7 consecutive daily deposits
2. Verify "Week Warrior" badge earned
3. Check tier updated to "Silver"
4. View in streak display

**Scenario 4: Auto-Save**
1. Create goal
2. Enable auto-save
3. Set amount ₦500, time 07:00
4. Link payment method
5. Wait for scheduled time
6. Verify auto-deposit recorded

---

## Troubleshooting

### Issue: Notifications not working
**Solution:**
1. Check permissions on device
2. Verify `EXPO_PUBLIC_API_URL` is correct
3. Ensure app is installed, not just expo start
4. Check notification handler is configured

### Issue: Dashboard not loading
**Solution:**
1. Verify backend `/health` endpoint works
2. Check Supabase connection
3. Ensure user has goals
4. Check network connectivity

### Issue: Deposits not being recorded
**Solution:**
1. Verify goal exists and is active
2. Check transaction amount > 0
3. Ensure user authentication works
4. Check Supabase RLS policies

### Issue: Reminders not triggering
**Solution:**
1. Verify reminder time is future time
2. Check notification permissions
3. Ensure app is not force-closed
4. Verify reminder is enabled in settings

---

## Security Considerations

1. **Authentication**: All endpoints require user authentication via JWT
2. **Encryption**: Payment tokens encrypted at rest
3. **RLS Policies**: Row-level security ensures users only see their data
4. **Rate Limiting**: API endpoints have rate limits
5. **Audit Trail**: All actions logged with timestamps and IPs
6. **Data Protection**: GDPR compliant data handling

---

## Performance Optimization

1. **Caching**: Dashboard data cached on frontend
2. **Pagination**: Transaction history paginated
3. **Indexing**: Database indexes on frequent queries
4. **Lazy Loading**: Goal details loaded on demand
5. **Compression**: API responses gzipped

---

## Future Enhancements

- [ ] AI-powered savings recommendations
- [ ] Multi-currency support
- [ ] Social sharing and challenges
- [ ] Integration with payment gateways
- [ ] Advanced analytics and insights
- [ ] Business account features
- [ ] API for third-party integrations
- [ ] Mobile app for iOS and Android

---

## Support & Documentation

For more information:
- API Documentation: `/docs` (FastAPI Swagger)
- Frontend Components: `frontend/src/screens/budget_best/`
- Database Schema: `migrations/006_budget_best_system.sql`
- Type Definitions: `frontend/src/types/budget-best.ts`

---

**Created**: April 29, 2024  
**Version**: 1.0  
**Status**: ✅ Production Ready
