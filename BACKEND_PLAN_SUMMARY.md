# 🚀 Backend Implementation Plan - Executive Summary

**Created**: April 17, 2026  
**Dashboard Components**: 11 major features  
**Total Backend Tasks**: 20 implementation tasks  
**Estimated Timeline**: 10 working days (82 hours)  
**Priority**: 🔴 CRITICAL PATH

---
make this as an universal city, with falling stars raining , and horse with a universal body comes from the side and  run towords the cist

## 📁 Documentation Files Created

### 1. **BACKEND_IMPLEMENTATION_ROADMAP.md**
- **What**: Comprehensive technical roadmap with all data structures
- **Use**: Reference for understanding what needs to be built and why
- **Key Sections**:
  - ✅ Existing models that need expansion
  - ❌ New models that need creation
  - 🔌 All API endpoints with request/response samples
  - 🔧 Business logic services
  - 📈 Database queries and indexes
  - 🔄 Batch job requirements

### 2. **BACKEND_TASKS.json**
- **What**: Structured, actionable task list with dependencies
- **Use**: Task management - import into Jira, Linear, or GitHub Issues
- **Key Data**:
  - Task IDs (e.g., T1.1, T1.2, ... T5.4)
  - Effort hours per task
  - Dependencies between tasks
  - Acceptance criteria for each task
  - Priority levels (CRITICAL, HIGH)

### 3. **BACKEND_API_REFERENCE.md**
- **What**: Quick reference for all API contracts
- **Use**: Developer during implementation - copy/paste API shapes
- **Key Sections**:
  - 🎯 Core dashboard data flow diagram
  - 🔌 API endpoints grouped by feature
  - 📊 Data model schemas
  - 🔄 Batch job schedule
  - 🔗 Service communication diagram

---

## 🎯 Critical Path (What to Build First)

### **Week 1: Core Dashboard Models (Days 1-5)**

**Must Complete in Order:**

```
DAY 1:  T1.1 (User Model)
DAY 2:  T1.2 (Wallet Model)
DAY 3:  T1.3 (SalesMetrics) + Start T1.4
DAY 4:  Finish T1.4 (CreditScore)
DAY 5:  T1.5 (Transactions) + T1.6 (DashboardDataService)
```

**Output**: Dashboard API returns complete data

---

### **Week 2: Loans & Intelligence (Days 6-10)**

```
DAY 6:  T2.1 (Expand Loan) + T3.1 (IntelligenceArticle)
DAY 7:  T2.2 (Repayment) + T3.2 (MarketTicker)
DAY 8:  T2.3 (Loan APIs) + T3.3 (Intelligence APIs)
DAY 9:  T2.4 (Repayment Processing) + T4.1 (Daily Rollup Job)
DAY 10: T4.2 (Credit Recalc Job) + Testing
```

**Output**: Complete loan system + daily batch jobs

---

## 📊 Dashboard Features Breakdown

### **Feature 1: User Profile Header**
```
Task: T1.1 (Expand User Model)
API: GET /v1/users/{id}/profile
Data: Full Name, Avatar, Business Name, Tier Badge
Effort: 3 hours
```

### **Feature 2: Wallet Card**
```
Task: T1.2 (Create Wallet Model)
API: GET /v1/wallet/{id}
Data: Balance, Daily Change, Credit Limit, Repayment Due
Effort: 4 hours
```

### **Feature 3: Credit Score Card**
```
Task: T1.4 (CreditScore Calculation)
API: GET /v1/credit-score/{id}
Data: Total Score, Tier, 4 Driver Breakdown
Effort: 8 hours
```

### **Feature 4: Today's Sales Card**
```
Task: T1.3 (SalesMetrics Rollup)
API: GET /v1/sales/{id}/today
Data: Sales Amount, % Change vs Yesterday, Tax Liability
Effort: 5 hours
```

### **Feature 5: Recent Activity Stream**
```
Task: T1.5 (Transactions Table)
API: GET /v1/transactions/{id}/recent
Data: 5 Recent transactions with type icons
Effort: 3 hours
```

### **Feature 6: Market Ticker**
```
Task: T3.2 (MarketTicker Model)
API: GET /v1/intelligence/market-ticker
Data: Stock symbols with price changes
Effort: 2 hours
```

### **Feature 7: Daily Intelligence Feed**
```
Task: T3.3 (Intelligence APIs)
API: GET /v1/intelligence/articles
Data: News, Trade Alerts, Personalized
Effort: 4 hours
```

### **Feature 8: Active Loans**
```
Task: T2.1 (Expand Loan Model)
API: GET /v1/loans/{id}
Data: Loan amount, Due date, Insured status
Effort: 4 hours
```

### **Feature 9: Repayment Processing**
```
Task: T2.4 (Repayment Service)
API: POST /v1/loans/{id}/repay
Data: Process payment, Update score
Effort: 5 hours
```

### **Feature 10: Daily Batch Jobs**
```
Task: T4.1 + T4.2 (Sales & Credit Jobs)
Cron: 00:15 and 02:00 daily
Logic: Aggregate metrics, recalculate scores
Effort: 9 hours
```

### **Feature 11: Dashboard Orchestration**
```
Task: T1.6 (DashboardDataService)
API: GET /v1/dashboard/summary/{id}
Logic: Parallel calls to all services + cache
Effort: 6 hours
```

---

## 🗂️ Data Structure Additions

### **New Tables (8 total)**

| Table | Fields | Purpose | Priority |
|-------|--------|---------|----------|
| `wallets` | balance, credit_limit, repayment_date | User liquidity | 🔴 CRITICAL |
| `credit_scores` | score, tier, 4 drivers | Credit assessment | 🔴 CRITICAL |
| `sales_metrics` | daily_total, tax, vs_yesterday | Sales tracking | 🔴 CRITICAL |
| `transactions` | type, amount, direction | Activity log | 🟡 HIGH |
| `repayments` | loan_id, status, actual_date | Loan tracking | 🟡 HIGH |
| `intelligence_articles` | headline, source, relevance | News feed | 🟡 HIGH |
| `market_tickers` | symbol, price, change | Market data | 🟡 HIGH |

### **Modified Tables (2 total)**

| Table | New Fields |
|-------|-----------|
| `users` | business_name, trading_name, location fields, avatar_initials |
| `loans` | product_name, icon, due_date, interest_rate, insured |

---

## 🔧 Services to Implement (4 total)

| Service | Location | Purpose | Complexity |
|---------|----------|---------|-----------|
| **CreditScoringEngine** | core-banking | Calculate score from 4 drivers | ⭐⭐⭐⭐ |
| **SalesAggregationService** | core-banking | Daily sales rollup + tax calc | ⭐⭐⭐ |
| **DashboardDataService** | api-gateway | Orchestrate dashboard API call | ⭐⭐⭐ |
| **RecommendationEngine** | rag-service | Personalized article matching | ⭐⭐⭐ |

---

## 📈 Database Indexes Required

```sql
CREATE INDEX idx_sales_user_id_date ON sales (user_id, sold_at DESC);
CREATE INDEX idx_sales_user_today ON sales (user_id, DATE(sold_at));
CREATE INDEX idx_loans_user_id_status ON loans (user_id, status);
CREATE INDEX idx_transactions_user_date ON transactions (user_id, created_at DESC);
CREATE INDEX idx_credit_scores_user_latest ON credit_scores (user_id, calculated_at DESC);
```

**Performance Impact**: Dashboard queries drop from 5s → 200ms

---

## 🚀 Implementation Order (Dependency Chain)

```
START
  ↓
[T1.1] Expand User Model
  ↓
[T1.2] Create Wallet
  ↓
[T1.3] Create SalesMetrics ← [T4.1 depends on this]
  ↓
[T1.4] Create CreditScore ← [T4.2 depends on this]
  ↓
[T1.5] Create Transactions
  ↓
[T1.6] DashboardDataService (orchestration)
  ├─→ [T2.1] Expand Loan
  ├─→ [T2.2] Create Repayment
  ├─→ [T2.3] Loan APIs
  ├─→ [T2.4] Repayment Service
  ├─→ [T3.1] IntelligenceArticle
  ├─→ [T3.2] MarketTicker
  ├─→ [T3.3] Intelligence APIs
  └─→ [T3.4] RAG Personalization
      ↓
[T4.1] Daily Sales Rollup Job
[T4.2] Credit Score Recalc Job
[T4.3] Intelligence Refresh Job
      ↓
[T5.1] Database Indexes
[T5.2] Unit Tests
[T5.3] Integration Tests
[T5.4] Load Testing
      ↓
END - Dashboard Ready
```

---

## ✅ Acceptance Criteria for "Dashboard Complete"

**Frontend Dashboard Screen**
- [ ] Loads in < 1 second
- [ ] User profile displays with avatar initials
- [ ] Wallet shows correct balance + daily change
- [ ] Credit score card shows tier + 4 drivers
- [ ] Today's sales card shows correct amount + % change
- [ ] Market ticker displays 4 symbols
- [ ] Intelligence feed shows 3 personalized articles
- [ ] Recent activity shows 5 transactions
- [ ] Loan cards show active loans with due dates
- [ ] No errors in production logs

**API Performance**
- [ ] Dashboard API p99 latency < 500ms
- [ ] Dashboard API p95 latency < 300ms
- [ ] Handles 1000 req/min without degradation
- [ ] All data fresh (< 1 hour cache)

**Batch Jobs**
- [ ] Daily sales rollup completes in < 2 minutes
- [ ] Credit score recalc completes in < 2 minutes
- [ ] Intelligence refresh runs every 2 hours

---

## 🎬 Next Steps

### **Immediately (Next 30 mins)**

1. ✅ **Review** BACKEND_IMPLEMENTATION_ROADMAP.md
2. ✅ **Review** BACKEND_TASKS.json structure
3. ✅ **Review** BACKEND_API_REFERENCE.md shapes

### **Today (Next 2-3 hours)**

4. Create migration files for T1.1 (Expand User)
5. Create User model additions
6. Plan T1.2 (Wallet model)

### **This Week**

7. Implement T1.1 → T1.6 in sequence
8. Set up batch job scheduling
9. Create unit tests

### **Next Week**

10. Start T2.x (Loans) in parallel with integration testing
11. Load test dashboard API
12. Deploy to staging

---

## 📞 Quick Reference Commands

### **Start with Task T1.1**
```bash
# 1. Read the detailed spec
cat BACKEND_IMPLEMENTATION_ROADMAP.md | grep -A 20 "T1.1"

# 2. Find exact effort
cat BACKEND_TASKS.json | jq '.phases[0].tasks[0]'

# 3. See the data structure
cat BACKEND_API_REFERENCE.md | grep -A 15 "^### User"
```

### **Track Progress**
```bash
# Import BACKEND_TASKS.json into Jira/Linear
# Mark tasks complete as you go
# Expected velocity: 8 hours/day = 10 days total
```

---

## 🚨 Risk Factors

1. **Credit Score Calculation Accuracy** → Needs careful testing with sample data
2. **Batch Job Timezone Handling** → Africa/Lagos timezone edge cases
3. **Dashboard API Latency** → Parallel service calls must complete in < 200ms
4. **Data Freshness** → Daily jobs must not block user requests

---

## 💰 Estimated Resource Need

| Role | Hours | Cost (est.) |
|------|-------|-----------|
| Backend Engineer (Core) | 60 | - |
| Backend Engineer (Batch/Jobs) | 15 | - |
| QA/Integration Testing | 7 | - |
| **Total** | **82 hours** | **~10 working days** |

---

## 📚 File Map

```
mapvo-project/
├── BACKEND_IMPLEMENTATION_ROADMAP.md   ← START HERE (big picture)
├── BACKEND_TASKS.json                  ← Task data (import to Jira)
├── BACKEND_API_REFERENCE.md            ← Copy/paste API shapes
├── backend/
│   └── services/
│       ├── core-banking/               ← Main work area
│       │   ├── app/models/
│       │   │   ├── user.py             ← Expand (T1.1)
│       │   │   ├── wallet.py           ← Create (T1.2)
│       │   │   ├── sales_metrics.py    ← Create (T1.3)
│       │   │   ├── credit_score.py     ← Create (T1.4)
│       │   │   ├── transaction.py      ← Create (T1.5)
│       │   │   └── repayment.py        ← Create (T2.2)
│       │   └── tasks/
│       │       ├── daily_sales_rollup.py    ← Create (T4.1)
│       │       └── daily_credit_recalc.py   ← Create (T4.2)
│       ├── api-gateway/
│       │   └── app/services/
│       │       └── dashboard_service.py     ← Create (T1.6)
│       └── rag-service/
│           └── app/
│               └── models/
│                   └── intelligence.py      ← Create (T3.1)
└── frontend/
    └── src/screens/
        └── DashboardScreen.tsx         ← Ready to consume API
```

---

**Total Scope**: 11 dashboard features, 8 new tables, 2 modified tables, 4 major services, 20 tasks, 82 hours

**Status**: Ready to begin implementation

