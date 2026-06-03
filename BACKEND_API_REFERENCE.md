# Backend API Quick Reference & Data Structures

## 🎯 Core Dashboard Flow

```
Frontend (DashboardScreen.tsx)
    ↓
GET /v1/dashboard/summary/{user_id}  [API Gateway]
    ↓ (parallel calls)
├─ GET /v1/users/{id}/profile        → User + Business profile
├─ GET /v1/wallet/{id}               → Balance, Credit limit
├─ GET /v1/credit-score/{id}         → Score 0-1000, Tier
├─ GET /v1/sales/{id}/today          → Today's sales metrics
├─ GET /v1/transactions/{id}/recent  → Activity stream (5 items)
├─ GET /v1/intelligence/market-ticker → Stock prices
└─ GET /v1/intelligence/articles     → Trade alerts + news
    ↓
Response (single, aggregated)
    ↓
Frontend renders all dashboard cards
```

---

## 🔌 Critical API Endpoints

### 1. **User & Authentication**

| Endpoint | Method | Purpose | Priority |
|----------|--------|---------|----------|
| `/v1/users/{id}/profile` | GET | User + business profile | 🔴 CRITICAL |
| `/v1/dashboard/summary/{id}` | GET | All dashboard data (aggregated) | 🔴 CRITICAL |

**Response: GET /v1/users/{id}/profile**
```json
{
  "id": "uuid",
  "phone": "08012345678",
  "email": "chidi@email.com",
  "full_name": "Chidi Okonkwo",
  "category": "business_owner",
  "trust_level": "Gold",
  "avatar_initials": "CO",
  "business_name": "Acme Retail Ventures",
  "trading_name": "Oga's Shop",
  "primary_category": "provisions",
  "years_in_operation": 3,
  "ownership_type": "Rented",
  "registration_status": "Not Registered",
  "location_state": "Lagos",
  "location_lga": "Ikeja",
  "location_address": "24 Allen Avenue",
  "created_at": "2024-01-10T08:00:00Z"
}
```

---

### 2. **Wallet & Credit**

| Endpoint | Method | Purpose | Priority |
|----------|--------|---------|----------|
| `/v1/wallet/{id}` | GET | Balance, credit limit, repayment info | 🔴 CRITICAL |
| `/v1/credit-score/{id}` | GET | Credit score breakdown by driver | 🔴 CRITICAL |

**Response: GET /v1/wallet/{id}**
```json
{
  "current_balance_kobo": 4520000,     // ₦45,200
  "daily_change_kobo": 1840000,        // ₦18,400 (today's inflow)
  "available_credit_kobo": 6500000,    // ₦65,000
  "credit_in_use_kobo": 12000000,      // ₦120,000
  "credit_limit_kobo": 18500000,       // ₦185,000
  "next_repayment_date": "2024-12-25",
  "next_repayment_amount_kobo": 1600000,  // ₦16,000
  "currency": "NGN",
  "updated_at": "2024-12-15T14:30:00Z"
}
```

**Response: GET /v1/credit-score/{id}**
```json
{
  "total_score": 742,
  "tier": "Gold",
  "max_score": 1000,
  "progression": "158 pts → Platinum",
  "drivers": [
    {
      "name": "Sales Velocity",
      "weight": "35%",
      "status": "Strong",
      "score": 85,
      "description": "7-day & 30-day rolling averages"
    },
    {
      "name": "Repayment Consistency",
      "weight": "30%",
      "status": "Perfect",
      "score": 100,
      "description": "100% on-time repayments (5/5)"
    },
    {
      "name": "Category Risk",
      "weight": "20%",
      "status": "Moderate",
      "score": 55,
      "description": "Provisions category baseline risk"
    },
    {
      "name": "Income Stability",
      "weight": "15%",
      "status": "Verified",
      "score": 90,
      "description": "Low variance in daily sales"
    }
  ],
  "last_calculated": "2024-12-15T02:00:00Z",
  "next_calculation": "2024-12-16T02:00:00Z"
}
```

---

### 3. **Sales**

| Endpoint | Method | Purpose | Priority |
|----------|--------|---------|----------|
| `/v1/sales/{id}/today` | GET | Today's sales metrics | 🔴 CRITICAL |
| `/v1/sales/{id}/recent` | GET | Recent 30-day sales | 🟡 HIGH |
| `/v1/sales/{id}/velocity` | GET | Sales velocity metrics | 🟡 HIGH |
| `/v1/sales` | POST | Record new sale | 🔴 CRITICAL |

**Response: GET /v1/sales/{id}/today**
```json
{
  "date": "2024-12-15",
  "total_sales_amount_kobo": 1840000,      // ₦18,400
  "num_transactions": 3,
  "avg_transaction_value_kobo": 613333,    // ₦6,133
  "units_sold": 45,
  "vs_yesterday_percent": 12,              // +12%
  "6_day_rolling_average": 15000,
  "total_taxable_amount_kobo": 1840000,
  "tax_liability_kobo": 138000              // 7.5% VAT
}
```

**Request: POST /v1/sales**
```json
{
  "user_id": "uuid",
  "product_sku": "INDOMIE-1000",
  "product_name": "Indomie Noodles",
  "quantity": 40,
  "unit_price_kobo": 46000,       // ₦460
  "channel": "manual",
  "payment_method": "cash"
}
```

**Response: POST /v1/sales**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "product_sku": "INDOMIE-1000",
  "product_name": "Indomie Noodles",
  "quantity": 40,
  "unit_price_kobo": 46000,
  "total_amount_kobo": 1840000,
  "tax_amount_kobo": 138000,
  "channel": "manual",
  "sold_at": "2024-12-15T14:30:00Z"
}
```

---

### 4. **Loans**

| Endpoint | Method | Purpose | Priority |
|----------|--------|---------|----------|
| `/v1/loans/{id}` | GET | Active & historical loans | 🔴 CRITICAL |
| `/v1/loans/{id}/contract` | GET | Loan contract document | 🟡 HIGH |
| `/v1/loans` | POST | Apply for new loan | 🟡 HIGH |
| `/v1/loans/{id}/repay` | POST | Record repayment | 🟡 HIGH |

**Response: GET /v1/loans/{user_id}**
```json
{
  "available_credit": 6500000,
  "credit_in_use": 12000000,
  "active_loans": [
    {
      "id": "loan-uuid-1",
      "product_name": "Dangote Flour Pool",
      "icon": "🌾",
      "loan_amount_kobo": 12000000,      // ₦120,000
      "outstanding_kobo": 8000000,       // ₦80,000
      "repaid_kobo": 4000000,
      "status": "Active",
      "due_date": "2024-12-25",
      "interest_rate_percent": 15.0,
      "loan_duration_days": 30,
      "insured": true,
      "next_repayment_date": "2024-12-20",
      "next_repayment_amount_kobo": 4000000,
      "created_at": "2024-11-24T08:00:00Z"
    }
  ],
  "loan_history": [
    {
      "id": "loan-uuid-2",
      "product_name": "Indomie Noodles",
      "month": "Nov 2024",
      "amount_kobo": 4500000,
      "status": "Paid"
    }
  ]
}
```

**Request: POST /v1/loans/{user_id}/repay**
```json
{
  "loan_id": "loan-uuid-1",
  "amount_kobo": 4000000,
  "payment_method": "bank_transfer"
}
```

**Response: POST /v1/loans/{user_id}/repay**
```json
{
  "success": true,
  "repayment_id": "uuid",
  "loan_id": "loan-uuid-1",
  "amount_kobo": 4000000,
  "outstanding_after_kobo": 4000000,
  "next_repayment_date": "2024-12-27",
  "new_credit_score": 745,
  "timestamp": "2024-12-15T15:00:00Z"
}
```

---

### 5. **Transactions & Activity**

| Endpoint | Method | Purpose | Priority |
|----------|--------|---------|----------|
| `/v1/transactions/{id}/recent` | GET | Activity stream (recent 5) | 🟡 HIGH |

**Response: GET /v1/transactions/{user_id}/recent?limit=5**
```json
[
  {
    "id": "tx-uuid-1",
    "type": "sale_proceeds",
    "title": "Sale Proceeds",
    "subtitle": "Indomie · 40 units",
    "amount_kobo": 1840000,
    "direction": "credit",
    "timestamp": "2024-12-15T14:30:00Z"
  },
  {
    "id": "tx-uuid-2",
    "type": "repayment_sweep",
    "title": "Repayment Sweep",
    "subtitle": "Auto-deducted · GTBank",
    "amount_kobo": 1600000,
    "direction": "debit",
    "timestamp": "2024-12-15T10:00:00Z"
  },
  {
    "id": "tx-uuid-3",
    "type": "loan_disbursement",
    "title": "Loan Disbursed",
    "subtitle": "Dangote Flour Pool",
    "amount_kobo": 12000000,
    "direction": "loan",
    "timestamp": "2024-12-01T09:00:00Z"
  }
]
```

---

### 6. **Intelligence & Market**

| Endpoint | Method | Purpose | Priority |
|----------|--------|---------|----------|
| `/v1/intelligence/market-ticker` | GET | Stock/commodity ticker | 🟡 HIGH |
| `/v1/intelligence/articles` | GET | Trade alerts & news | 🟡 HIGH |
| `/v1/intelligence/for-you` | GET | Personalized recommendations | 🟡 HIGH |

**Response: GET /v1/intelligence/market-ticker**
```json
[
  {
    "symbol": "AG",
    "price_kobo": null,
    "change_percent": 1.9,
    "positive": true,
    "last_updated": "2024-12-15T15:00:00Z"
  },
  {
    "symbol": "Zenith",
    "price_kobo": 3615000,      // ₦36.15 (in kobo)
    "change_percent": -0.9,
    "positive": false,
    "last_updated": "2024-12-15T15:00:00Z"
  },
  {
    "symbol": "Airtel NG",
    "price_kobo": 214000000,    // ₦2,140
    "change_percent": 0.7,
    "positive": true,
    "last_updated": "2024-12-15T15:00:00Z"
  },
  {
    "symbol": "NGX ASI",
    "price_kobo": 5821000000,   // 58,210
    "change_percent": 0.3,
    "positive": true,
    "last_updated": "2024-12-15T15:00:00Z"
  }
]
```

**Response: GET /v1/intelligence/articles?limit=3**
```json
[
  {
    "id": "article-uuid-1",
    "category": "Trade Alert",
    "source": "BusinessDay NG",
    "headline": "Dangote Flour drops 8% — best time to restock for Q1",
    "subtitle": "↑ Buy opportunity",
    "relevance_score": 0.92,
    "published_at": "2024-12-15T10:30:00Z",
    "url": "https://businessday.com/..."
  },
  {
    "id": "article-uuid-2",
    "category": "CBN Update",
    "source": "Nairametrics",
    "headline": "CBN holds MPR at 27.5% — lending rates stable this quarter",
    "subtitle": "→ No change to rates",
    "relevance_score": 0.75,
    "published_at": "2024-12-15T09:00:00Z",
    "url": "https://nairametrics.com/..."
  },
  {
    "id": "article-uuid-3",
    "category": "For You",
    "source": "VR Insights",
    "headline": "FMCG traders in Lagos report 15% revenue boost from group buying",
    "subtitle": "↑ Relevant to you",
    "relevance_score": 0.88,
    "published_at": "2024-12-15T08:00:00Z"
  }
]
```

---

## 📊 Data Models Summary

### Wallet (new)
```
id: UUID
user_id: UUID (FK)
current_balance_kobo: BigInt
daily_change_kobo: BigInt
available_credit_kobo: BigInt
credit_in_use_kobo: BigInt
credit_limit_kobo: BigInt (computed)
next_repayment_date: Date
next_repayment_amount_kobo: BigInt
```

### CreditScore (new)
```
id: UUID
user_id: UUID (FK)
total_score: Int (0-1000)
tier: Enum(Bronze|Silver|Gold|Platinum)
sales_velocity_score: Int (35% weight)
repayment_consistency_score: Int (30% weight)
category_risk_score: Int (20% weight)
income_stability_score: Int (15% weight)
calculated_at: Timestamp
valid_until: Timestamp
```

### SalesMetrics (new)
```
id: UUID
user_id: UUID (FK)
date: Date (PK)
total_sales_amount_kobo: BigInt
num_transactions: Int
avg_transaction_value_kobo: BigInt
total_units_sold: Int
vs_yesterday_percent: Float
tax_liability_kobo: BigInt (7.5% VAT)
```

### Transaction (new)
```
id: UUID
user_id: UUID (FK)
type: Enum(sale_proceeds|repayment_sweep|loan_disbursement|transfer_out|other)
amount_kobo: BigInt
direction: Enum(credit|debit|loan)
description: String
metadata: JSON
created_at: Timestamp (PK)
```

### Loan (expand)
```
id: UUID
user_id: UUID (FK)
status: Enum(pending|active|closed|defaulted)
principal_kobo: BigInt
service_fee_kobo: BigInt
total_due_kobo: BigInt
repaid_kobo: BigInt
product_sku: String
product_qty: Int
product_name: String (NEW)
icon: String (NEW - emoji)
due_date: Date (NEW)
interest_rate_percent: Float (NEW)
loan_duration_days: Int (NEW)
insured: Boolean (NEW)
next_repayment_date: Date (NEW)
next_repayment_amount_kobo: BigInt (NEW)
created_at: Timestamp
```

### User (expand)
```
id: UUID
phone: String (unique)
email: String (unique)
full_name: String
category: Enum(personal|nine_to_five|business_owner)
trust_level: Enum(Bronze|Silver|Gold|Platinum)
business_name: String (NEW)
trading_name: String (NEW)
primary_category: String (NEW)
years_in_operation: Int (NEW)
ownership_type: Enum(Rented|Owned|Mobile) (NEW)
registration_status: Enum(Registered|Not Registered) (NEW)
location_state: String (NEW)
location_lga: String (NEW)
location_address: String (NEW)
avatar_initials: String (NEW)
created_at: Timestamp
```

---

## 🔄 Batch Jobs Schedule

| Job | Time | Timezone | Purpose |
|-----|------|----------|---------|
| Daily Sales Rollup | 00:15 | Africa/Lagos | Aggregate daily sales → SalesMetrics |
| Credit Score Recalc | 02:00 | Africa/Lagos | Recalculate all user credit scores |
| Intelligence Refresh | Every 2h | UTC | Fetch market data & articles |

---

## 🚀 Deployment Checklist

- [ ] All migrations applied to production DB
- [ ] Batch jobs scheduled (APScheduler / Celery)
- [ ] API Gateway routes updated
- [ ] Rate limiting: 1000 req/min per user
- [ ] Error logging to ELK / CloudWatch
- [ ] Database backups enabled
- [ ] Dashboard API tested under load (p99 < 500ms)
- [ ] Timezone handling verified (Africa/Lagos)

---

## 📋 Frontend Integration Points

**DashboardScreen.tsx**
```typescript
// On mount:
useEffect(() => {
  dashboardService.getDashboardSummary(userId)
    .then(data => {
      setWallet(data.wallet)
      setCreditScore(data.credit_score)
      setTodaysSales(data.today_sales)
      setRecentActivity(data.recent_activity)
      setMarketData(data.market_ticker)
      setIntelligence(data.intelligence)
    })
}, [userId])
```

**Expected response shape:**
```typescript
interface DashboardSummary {
  user: UserProfile
  wallet: WalletState
  credit_score: CreditScoreDetail
  today_sales: SalesMetrics
  recent_activity: Transaction[]
  market_ticker: MarketTicker[]
  intelligence: IntelligenceArticle[]
}
```

---

## 🔗 Inter-Service Communication

```
API Gateway
├─ core-banking
│  ├─ Users (profile, business details)
│  ├─ Wallet (balance, credit)
│  ├─ CreditScore (calculation, history)
│  ├─ Sales (transactions, metrics)
│  └─ Loans (active, history, repayment)
│
├─ rag-service
│  ├─ Intelligence (articles, personalization)
│  └─ Market (ticker, trends)
│
└─ ai-ml-service
   └─ Inventory (voice/vision processing)
```

