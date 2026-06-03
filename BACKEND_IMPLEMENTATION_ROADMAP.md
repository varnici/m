# VentureRoot Backend Implementation Roadmap

**Status**: Phase 1: Dashboard Pipeline Implementation  
**Last Updated**: April 17, 2026  
**Priority**: Critical Path for MVP

---

## 📊 Data Structures & Models

### 1. **Core User Models** (Existing - Expand Required)

#### `User` (core-banking/app/models/user.py)
```typescript
interface User {
  id: UUID
  phone: string (unique)
  email?: string (unique)
  full_name?: string
  category: "personal" | "nine_to_five" | "business_owner"
  trust_level: "bronze" | "silver" | "gold" | "platinum"
  
  // MISSING: Dashboard essentials
  avatar_initials?: string  // "CO" from Chidi Okonkwo
  business_name: string
  trading_name?: string
  primary_category: string
  years_in_operation: number
  ownership_type: "Rented" | "Owned" | "Mobile"
  registration_status: "Registered" | "Not Registered"
  location_state: string
  location_lga: string
  location_address: string
  
  created_at: timestamp
}
```
**Status**: ❌ Missing fields  
**Work**: Add business profile fields to user table


### 2. **Wallet & Credit Models** (Needs Implementation)

#### `Wallet`
```typescript
interface Wallet {
  id: UUID
  user_id: UUID (FK)
  
  // Balance tracking
  current_balance_kobo: bigint
  daily_change_kobo: bigint  // Today's net inflow
  
  // Credit info
  available_credit_kobo: bigint
  credit_in_use_kobo: bigint
  credit_limit_kobo: bigint
  
  // Loan repayment
  next_repayment_date: date
  next_repayment_amount_kobo: bigint
  
  created_at: timestamp
  updated_at: timestamp
}
```
**Status**: ❌ Not implemented  
**Work**: Create model + migration


#### `CreditScore`
```typescript
interface CreditScore {
  id: UUID
  user_id: UUID (FK)
  
  // Score calculation
  total_score: int (0-1000)
  tier: "Bronze" | "Silver" | "Gold" | "Platinum"
  
  // Drivers
  sales_velocity_score: int (weight: 35%)
  repayment_consistency_score: int (weight: 30%)
  category_risk_score: int (weight: 20%)
  income_stability_score: int (weight: 15%)
  
  // Metadata
  calculated_at: timestamp
  valid_until: timestamp
  confidence_level: float (0.0-1.0)
}
```
**Status**: ❌ Not implemented  
**Work**: Create scoring model + calculation engine


### 3. **Sales Models** (Existing - Expand Required)

#### `Sale` (core-banking/app/models/sales.py) - EXPAND
```typescript
interface Sale {
  id: UUID
  user_id: UUID (FK)
  
  // Current fields
  product_sku: string
  quantity: int
  unit_price_kobo: bigint
  channel: string (default "manual")
  sold_at: timestamp
  
  // MISSING: Dashboard enrichment
  product_name: string
  product_category: string
  total_amount_kobo: bigint (calculated)
  tax_amount_kobo: bigint (7.5% VAT)
  payment_method: "cash" | "transfer" | "mixed"
  customer_name?: string
}
```
**Status**: ⚠️ Partial (fields exist, need enrichment)  
**Work**: Add enrichment fields + calculated fields


#### `SalesMetrics` (New)
```typescript
interface SalesMetrics {
  id: UUID
  user_id: UUID (FK)
  
  // Daily rollup
  date: date (PK)
  total_sales_amount: bigint
  num_transactions: int
  avg_transaction_value: bigint
  total_units_sold: int
  
  // Trend
  vs_yesterday_percent: float
  6_day_rolling_average: bigint
  
  // Tax liability
  total_taxable_amount: bigint
  tax_liability_kobo: bigint (7.5% of taxable)
}
```
**Status**: ❌ Not implemented  
**Work**: Create aggregation tables + daily job


### 4. **Loan Models** (Existing - Expand Required)

#### `Loan` (core-banking/app/models/loan.py) - EXPAND
```typescript
interface Loan {
  id: UUID
  user_id: UUID (FK)
  
  // Current fields
  status: "pending" | "active" | "closed" | "defaulted"
  principal_kobo: bigint
  service_fee_kobo: bigint
  total_due_kobo: bigint
  repaid_kobo: bigint
  product_sku: string
  product_qty: int
  created_at: timestamp
  
  // MISSING: Dashboard display
  product_name: string  // "Indomie Noodles", "Dangote Flour"
  icon: string  // emoji for UI
  
  // Repayment tracking
  next_repayment_date: date
  next_repayment_amount: bigint
  loan_duration_days: int
  interest_rate_percent: float
  insured: boolean
}
```
**Status**: ⚠️ Partial  
**Work**: Add display + tracking fields


### 5. **Activity & Transaction Log** (New)

#### `Transaction`
```typescript
interface Transaction {
  id: UUID
  user_id: UUID (FK)
  
  type: "sale_proceeds" | "repayment_sweep" | "loan_disbursement" | "transfer_out" | "other"
  amount_kobo: bigint
  direction: "credit" | "debit" | "loan"
  
  description: string     // "Indomie · 40 units"
  metadata: {
    sale_id?: UUID
    loan_id?: UUID
    merchant?: string
  }
  
  created_at: timestamp (PK)
}
```
**Status**: ❌ Not implemented  
**Work**: Create transaction log + indexes


### 6. **Intelligence & News Models** (New)

#### `MarketData`
```typescript
interface MarketTicker {
  id: UUID
  symbol: string ("AG", "Zenith", "Airtel NG", "NGX ASI")
  price_kobo?: bigint
  price_change_percent: float
  last_updated: timestamp
}
```
**Status**: ❌ Not implemented  
**Work**: Create for market ticker display


#### `IntelligenceArticle`
```typescript
interface IntelligenceArticle {
  id: UUID
  user_id: UUID (FK, may be NULL for global)
  
  category: "Trade Alert" | "CBN Update" | "For You"
  source: string ("BusinessDay NG", "Nairametrics", "VR Insights")
  headline: string
  subtitle: string
  article_url?: string
  relevance_score: float (0-1)
  
  published_at: timestamp
  personalized: boolean
}
```
**Status**: ❌ Not implemented  
**Work**: Create + RAG integration


---

## 🔌 API Endpoints to Implement

### Group 1: User & Profile (CORE GATEWAY)

#### GET `/v1/users/{user_id}/profile`
**Purpose**: Fetch complete user profile for dashboard header  
**Returns**: User + UserProfile enriched data  
**Priority**: 🔴 **CRITICAL**

```json
{
  "id": "uuid",
  "phone": "08012345678",
  "full_name": "Chidi Okonkwo",
  "avatar_initials": "CO",
  "trust_tier": "Gold",
  "business_name": "Acme Retail",
  "business_category": "provisions",
  "years_in_operation": 3
}
```

#### GET `/v1/users/{user_id}/dashboard/summary`
**Purpose**: Fetch aggregated dashboard data in single call  
**Returns**: DashboardSummary  
**Priority**: 🔴 **CRITICAL**

```json
{
  "user": { ... },
  "wallet": { /* Wallet data */ },
  "credit_score": { /* CreditScore data */ },
  "today_sales": { /* SalesMetrics for today */ },
  "recent_activity": [ /* Transaction array */ ]
}
```


### Group 2: Wallet & Credit (CORE BANKING)

#### GET `/v1/wallet/{user_id}`
**Purpose**: Get complete wallet state  
**Priority**: 🔴 **CRITICAL**

```json
{
  "current_balance": 45200,
  "daily_change": 18400,
  "available_credit": 65000,
  "credit_in_use": 120000,
  "total_credit_limit": 185000,
  "next_repayment_date": "2024-12-25",
  "next_repayment_amount": 16000,
  "currency": "NGN"
}
```

#### GET `/v1/credit-score/{user_id}`
**Purpose**: Get credit scoring details (for CreditDashboardScreen)  
**Priority**: 🟡 **HIGH**

```json
{
  "total_score": 742,
  "tier": "Gold",
  "max_score": 1000,
  "progression": "158 pts → Platinum",
  "drivers": [
    { "name": "Sales Velocity", "weight": "35%", "status": "Strong", "value": 85 },
    { "name": "Repayment Consistency", "weight": "30%", "status": "Perfect", "value": 100 },
    { "name": "Category Risk", "weight": "20%", "status": "Moderate", "value": 55 },
    { "name": "Income Stability", "weight": "15%", "status": "Verified", "value": 90 }
  ]
}
```


### Group 3: Sales (CORE BANKING)

#### POST `/v1/sales`
**Purpose**: Record a sale transaction  
**Priority**: 🔴 **CRITICAL**

#### GET `/v1/sales/{user_id}/today`
**Purpose**: Get today's sales summary (for dashboard stat card)  
**Priority**: 🔴 **CRITICAL**

```json
{
  "total_amount": 18400,
  "num_transactions": 3,
  "units_sold": 45,
  "vs_yesterday_percent": 12,
  "tax_liability": 1656
}
```

#### GET `/v1/sales/{user_id}/recent`
**Purpose**: Get recent sales (last 30 days)  
**Priority**: 🟡 **HIGH**

```json
[
  {
    "id": "uuid",
    "product_name": "Indomie",
    "quantity": 40,
    "amount": 18400,
    "sold_at": "2024-12-15T14:30:00Z"
  }
]
```

#### GET `/v1/sales/{user_id}/velocity`
**Purpose**: Get sales velocity metrics for credit scoring  
**Priority**: 🟡 **HIGH**

```json
{
  "7_day_average": 15000,
  "30_day_average": 14200,
  "trend": "stable",
  "consistency_score": 85
}
```


### Group 4: Loans (CORE BANKING)

#### GET `/v1/loans/{user_id}`
**Purpose**: Get active and historical loans  
**Priority**: 🔴 **CRITICAL**

```json
{
  "available_credit": 65000,
  "credit_in_use": 120000,
  "active_loans": [
    {
      "id": "uuid",
      "product_name": "Dangote Flour Pool",
      "loan_amount": 120000,
      "outstanding": 80000,
      "status": "Active",
      "due_date": "2024-12-25",
      "insured": true,
      "icon": "🌾"
    }
  ],
  "loan_history": [ /* Past loans */ ]
}
```

#### POST `/v1/loans`
**Purpose**: Create a new loan application  
**Priority**: 🟡 **HIGH**

#### GET `/v1/loans/{loan_id}/contract`
**Purpose**: Fetch loan contract for viewer  
**Priority**: 🟡 **HIGH**

#### POST `/v1/loans/{loan_id}/repay`
**Purpose**: Process loan repayment  
**Priority**: 🟡 **HIGH**


### Group 5: Activity & Transactions (CORE BANKING)

#### GET `/v1/transactions/{user_id}/recent`
**Purpose**: Recent activity stream  
**Priority**: 🟡 **HIGH**

```json
[
  {
    "id": "uuid",
    "title": "Sale Proceeds",
    "subtitle": "Indomie · 40 units",
    "amount": 18400,
    "type": "credit",
    "timestamp": "2024-12-15T14:30:00Z"
  },
  {
    "title": "Repayment Sweep",
    "subtitle": "Auto-deducted · GTBank",
    "amount": 16000,
    "type": "debit",
    "timestamp": "2024-12-15T10:00:00Z"
  }
]
```


### Group 6: Market Intelligence (RAG SERVICE)

#### GET `/v1/intelligence/market-ticker`
**Purpose**: Real market data or curated ticker  
**Priority**: 🟡 **HIGH**

```json
[
  { "symbol": "AG", "price": null, "change": "+1.9%", "positive": true },
  { "symbol": "Zenith", "price": "₦36.15", "change": "-0.9%", "positive": false }
]
```

#### GET `/v1/intelligence/articles`
**Purpose**: Daily intelligence feed (trade alerts, news)  
**Priority**: 🟡 **HIGH**

```json
[
  {
    "id": "uuid",
    "category": "Trade Alert",
    "source": "BusinessDay NG",
    "headline": "Dangote Flour drops 8% — best time to restock for Q1",
    "subtitle": "↑ Buy opportunity",
    "published_at": "2024-12-15T10:00:00Z"
  }
]
```

#### GET `/v1/intelligence/for-you`
**Purpose**: Personalized recommendations (user's category)  
**Priority**: 🟡 **HIGH**


### Group 7: Inventory (AI/ML SERVICE)

#### POST `/v1/inventory/voice-entry`
**Purpose**: Record inventory via voice transcription  
**Priority**: 🟡 **HIGH**

#### POST `/v1/inventory/scan-shelf`
**Purpose**: Vision-based shelf scanning  
**Priority**: 🟡 **HIGH**

#### GET `/v1/inventory/dashboard`
**Purpose**: Inventory health dashboard  
**Priority**: 🟡 **HIGH**


### Group 8: Notifications (NOTIFICATION SERVICE)

#### GET `/v1/notifications/{user_id}`
**Purpose**: User notifications + unread count  
**Priority**: 🟡 **HIGH**


---

## 🔧 Business Logic Services

### Service 1: CreditScoringEngine

**Location**: `core-banking/app/services/credit_scoring.py` (NEW)

```python
class CreditScoringService:
    def calculate_credit_score(user_id: str) -> CreditScore:
        """
        Weights:
        - Sales Velocity (35%): 7-day & 30-day rolling averages
        - Repayment Consistency (30%): On-time repayment history
        - Category Risk (20%): Industry risk assessment
        - Income Stability (15%): Variance in weekly sales
        """
        
    def calculate_sales_velocity(user_id: str, days: int) -> float:
        """Query SalesMetrics → rolling average"""
        
    def calculate_repayment_score(user_id: str) -> float:
        """Count on-time repayments vs total payments"""
        
    def rank_tier(score: int) -> str:
        """0-250: Bronze, 250-500: Silver, 500-750: Gold, 750+: Platinum"""
```

**Status**: ❌ Not implemented  
**Priority**: 🔴 **CRITICAL**


### Service 2: SalesAggregationService

**Location**: `core-banking/app/services/sales_aggregation.py` (NEW)

```python
class SalesAggregationService:
    def daily_sales_rollup(user_id: str, date: date) -> SalesMetrics:
        """Sum all sales for a date → SalesMetrics record"""
        
    def calculate_tax_liability(total_sales: int) -> int:
        """7.5% of taxable sales (VAT)"""
        
    def compute_velocity_trend(user_id: str) -> float:
        """Percent change vs yesterday"""
```

**Status**: ❌ Not implemented  
**Priority**: 🔴 **CRITICAL**


### Service 3: DashboardDataService

**Location**: `api-gateway/app/services/dashboard_service.py` (NEW)

```python
class DashboardDataService:
    async def get_dashboard_summary(user_id: str) -> DashboardSummary:
        """
        Orchestrates calls to:
        1. User profile (core-banking)
        2. Wallet state (core-banking)
        3. Credit score (core-banking)
        4. Today's sales (core-banking)
        5. Recent activity (core-banking)
        6. Market data (rag-service)
        7. Intelligence feed (rag-service)
        
        Returns single response to avoid N+1 queries from mobile.
        """
```

**Status**: ❌ Not implemented  
**Priority**: 🔴 **CRITICAL**


### Service 4: RecommendationEngine

**Location**: `rag-service/app/services/recommendations.py` (ENHANCE)

```python
class RecommendationService:
    def get_personalized_intelligence(user_id: str, category: str) -> List[Article]:
        """
        Filter intelligence articles by:
        - User's business category (e.g., "provisions")
        - Recent product history
        - Relevant trade alerts
        """
```

**Status**: ⚠️ Stub exists  
**Priority**: 🟡 **HIGH**


---

## 📈 Database Queries & Indexes

### Critical Indexes

```sql
-- Sales lookups
CREATE INDEX idx_sales_user_id_date ON sales (user_id, sold_at DESC);
CREATE INDEX idx_sales_user_today ON sales (user_id, DATE(sold_at));

-- Loan lookups
CREATE INDEX idx_loans_user_id_status ON loans (user_id, status);
CREATE INDEX idx_loans_user_active ON loans (user_id, status) WHERE status IN ('pending', 'active');

-- Transaction history
CREATE INDEX idx_transactions_user_date ON transactions (user_id, created_at DESC);

-- Credit score recency
CREATE INDEX idx_credit_scores_user_latest ON credit_scores (user_id, calculated_at DESC);
```

**Status**: ❌ Not created  
**Priority**: 🔴 **CRITICAL**


### Required Views

```sql
-- User dashboard summary view
CREATE VIEW vw_user_dashboard AS
SELECT 
  u.id,
  u.full_name,
  w.current_balance_kobo,
  w.daily_change_kobo,
  cs.total_score,
  cs.tier,
  (SELECT SUM(amount_kobo) FROM sales WHERE user_id = u.id AND DATE(sold_at) = CURRENT_DATE) as today_sales
FROM users u
LEFT JOIN wallets w ON u.id = w.user_id
LEFT JOIN credit_scores cs ON u.id = cs.user_id;
```

**Status**: ❌ Not created  
**Priority**: 🟡 **HIGH**


---

## 🔄 Data Pipeline (Batch Jobs)

### Daily Batch Job 1: SalesMetricsRollup

**Timing**: 00:15 every day (after day rolls over in Nigeria TZ)  
**Location**: `core-banking/app/tasks/daily_sales_rollup.py` (NEW)

```
For each user:
  - SUM(sales) for today
  - COUNT(transactions)
  - Calculate tax liability (7.5% VAT)
  - Compare to previous day
  - Store in SalesMetrics table
```

**Status**: ❌ Not implemented  
**Priority**: 🔴 **CRITICAL**


### Daily Batch Job 2: CreditScoreRecalculation

**Timing**: 02:00 every day  
**Location**: `core-banking/app/tasks/daily_credit_recalc.py` (NEW)

```
For each user:
  - Calculate sales velocity (35 weight)
  - Repayment consistency (30 weight)
  - Category risk (20 weight)
  - Income stability (15 weight)
  - Store new CreditScore record
```

**Status**: ❌ Not implemented  
**Priority**: 🔴 **CRITICAL**


### Hourly Task: IntelligenceFeedRefresh

**Timing**: Every 2 hours  
**Location**: `rag-service/app/tasks/refresh_intelligence.py` (NEW)

```
- Fetch market ticker from external API (stub for now)
- Fetch news from aggregator (Nairametrics, BusinessDay)
- Score articles for relevance to user categories
- Store in IntelligenceArticle table
```

**Status**: ❌ Not implemented  
**Priority**: 🟡 **HIGH**


---

## 🎯 Task Breakdown by Priority

### **Phase 1A: Critical Dashboard Data (Week 1)**

- [ ] **TASK 1.1**: Expand User model (add business fields)
  - [ ] Add migration
  - [ ] Add API endpoint: `GET /user/{id}/profile`

- [ ] **TASK 1.2**: Create Wallet model + initial balance logic
  - [ ] Migration
  - [ ] Service: `get_wallet_state(user_id)`

- [ ] **TASK 1.3**: Create SalesMetrics model + daily rollup
  - [ ] Migration
  - [ ] Daily batch job
  - [ ] API: `GET /sales/{id}/today`

- [ ] **TASK 1.4**: Create CreditScore model + calculation engine
  - [ ] Migration
  - [ ] Calculation service
  - [ ] API: `GET /credit-score/{id}`

- [ ] **TASK 1.5**: Create Transactions table + recent activity
  - [ ] Migration
  - [ ] API: `GET /transactions/{id}/recent`

- [ ] **TASK 1.6**: Implement DashboardDataService
  - [ ] Orchestrate all dashboard data
  - [ ] API: `GET /dashboard/summary/{id}`


### **Phase 1B: Loans & Credit (Week 2)**

- [ ] **TASK 2.1**: Expand Loan model (add display fields)
  - [ ] Add fields: product_name, icon, due_date tracking
  - [ ] Migration

- [ ] **TASK 2.2**: Implement loan listing + contract viewer
  - [ ] API: `GET /loans/{id}`
  - [ ] API: `GET /loans/{id}/contract`

- [ ] **TASK 2.3**: Implement repayment tracking
  - [ ] Create Repayment model
  - [ ] API: `POST /loans/{id}/repay`
  - [ ] Update credit score on repayment


### **Phase 1C: Intelligence & Market Data (Week 2)**

- [ ] **TASK 3.1**: Create IntelligenceArticle model
  - [ ] Migration

- [ ] **TASK 3.2**: Create MarketTicker model + data source
  - [ ] Migration
  - [ ] Stub external API integration

- [ ] **TASK 3.3**: Implement intelligence feed endpoints
  - [ ] API: `GET /intelligence/articles`
  - [ ] API: `GET /intelligence/market-ticker`
  - [ ] API: `GET /intelligence/for-you` (personalized)

- [ ] **TASK 3.4**: Wire RAG service for recommendations
  - [ ] Vector store setup
  - [ ] Personalization logic


### **Phase 2: Inventory & Advanced Features (Week 3-4)**

- [ ] **TASK 4.1**: Enhance Inventory models
- [ ] **TASK 4.2**: Voice transcription integration (Whisper)
- [ ] **TASK 4.3**: Shelf scanning vision integration (Gemini)
- [ ] **TASK 4.4**: Notification service integration


---

## 📋 Testing Requirements

### Unit Tests
- [ ] CreditScoringService.calculate_credit_score
- [ ] SalesAggregationService.daily_sales_rollup
- [ ] DashboardDataService orchestration

### Integration Tests
- [ ] Dashboard API returns all fields correctly
- [ ] Wallet updates propagate to dashboard
- [ ] Sales recorded → metrics computed → score updated

### Load Tests
- [ ] Dashboard endpoint handles 1000 req/min
- [ ] Daily batch jobs complete in <5 min


---

## 🚀 Deployment Checklist

- [ ] All migrations applied
- [ ] Batch jobs scheduled (via APScheduler or Celery)
- [ ] API Gateway routes updated
- [ ] Rate limiting configured
- [ ] Error logging enabled
- [ ] Database backups configured
- [ ] Load testing completed

---

## 📝 Notes

1. **Data Freshness**: Dashboard data refreshes on app load from `GET /dashboard/summary`
2. **Offline Support**: Mobile app caches dashboard state; syncs when connection restored
3. **Real-time Updates**: Sockets for repayment notifications (future enhancement)
4. **Timezone**: All timestamps in UTC; display converted to Africa/Lagos


