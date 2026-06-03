# VentureRoot / MAPVO — Session Recovery File
# Last updated: 2026-05-22T09:11:00+01:00
# Conversation ID: c9a64c9e-216e-4fb2-a3fc-c6b8bb793429

---

## 🎯 PROJECT OVERVIEW
- **Project**: MAPVO / VentureRoot — Nigerian SME super-app
- **Stack**: FastAPI (Python) backend + React Native (Expo) mobile app
- **Workspace**: `C:\Users\paulji peters\VentureRoot`
- **Backend**: `backend/services/core-banking/`

---

## ✅ COMPLETED WORK (this session)

### 1. Voice Inventory & Barcode Integration (Path A) — DONE
- NLP voice parser (`VoiceVisionService`) wired to mobile
- Barcode scanner (`ScanShelveScreen.tsx`) using Expo camera
- Offline sync queue (`syncService.ts`) for stock movements
- Domain ledger audit trail fully wired

### 2. Test Suite Fix — DONE
- **File**: `backend/services/core-banking/tests/test_inventory_v2.py`
- **Bug**: `db_session` fixture was missing `User.__table__` — all inventory
  tables have FK → `users.id` so SQLite failed with "no such table: users"
- **Fix**: Added `User.__table__` as first table + seeded a `test-owner` row
- **Result**: 37/39 tests passing (2 are pre-existing GeoAlchemy2/PostGIS
  SQLite limitations — NOT regressions)

### 3. Stale test excluded — DONE
- `test_inventory.py` imports removed `inventory_service` module (replaced by v2)
- Added to `conftest.py` `collect_ignore_glob` so it doesn't block CI
- File: `backend/services/core-banking/tests/conftest.py`

---

## 🔴 PENDING — MUST DO NEXT SESSION

### CRITICAL: Apply Supabase Migration to VentureRoot

**The migration was accidentally applied to the WRONG Supabase project (Ncliper).**
It has since been fully cleaned up from Ncliper (all tables dropped).

**The migration still needs to be applied to the CORRECT project:**

| Key | Value |
|-----|-------|
| VentureRoot Supabase URL | `https://oeovcwpepsbgrapbnbkz.supabase.co` |
| VentureRoot Project Ref | `oeovcwpepsbgrapbnbkz` |
| Ncliper URL (DO NOT USE) | `https://glwcjaqyatkyqvnrkqty.supabase.co` |

**What was done to fix:**
- `C:\Users\paulji peters\.gemini\config\mcp_config.json` — updated
  `--project-ref` from `glwcjaqyatkyqvnrkqty` → `oeovcwpepsbgrapbnbkz`
- BUT: Gemini needs a full **close + reopen** (not just refresh) for the
  MCP server process to reload the config

**Next steps once Gemini is restarted:**
1. Verify MCP points to VentureRoot: `get_project_url` should return
   `https://oeovcwpepsbgrapbnbkz.supabase.co`
2. Apply the migration file:
   `C:\Users\paulji peters\VentureRoot\migrations\008_mapvo_core_schema.sql`
3. Verify all 21 tables exist in VentureRoot

---

## 📋 TABLES THAT NEED TO BE CREATED IN VENTUREROOT SUPABASE

All 21 of these are missing from VentureRoot and need migration 008 applied:

| # | Table | Notes |
|---|-------|-------|
| 1 | `users` | Core identity, FK anchor for everything |
| 2 | `wallets` | One per user |
| 3 | `transactions` | Wallet ledger |
| 4 | `stores` | Multi-location support |
| 5 | `categories` | Product categories |
| 6 | `products` | Full catalog with barcode/SKU |
| 7 | `suppliers` | Supplier management |
| 8 | `stock_levels` | Per product/store quantity |
| 9 | `stock_movements` | Audit trail (voice/scan/manual) |
| 10 | `purchase_orders` | PO management |
| 11 | `purchase_order_items` | PO line items |
| 12 | `sales_transactions` | Sales records |
| 13 | `sales_transaction_items` | Sales line items |
| 14 | `inventory_ledger_entries` | Immutable domain ledger |
| 15 | `inventory_idempotency_keys` | Duplicate command prevention |
| 16 | `domain_outbox_messages` | Event publishing queue |
| 17 | `inventory_reservations` | Stock reservation flow |
| 18 | `savings_goals` | Budget Best savings goals |
| 19 | `savings_transactions` | Savings deposits/withdrawals |
| 20 | `savings_streaks` | Gamification streaks |
| 21 | `inventory` | Easy inventory (simple mode) |

---

## 📁 KEY FILES

| File | Purpose |
|------|---------|
| `migrations/008_mapvo_core_schema.sql` | Master migration — ALL 21 tables |
| `backend/services/core-banking/tests/test_inventory_v2.py` | Fixed inventory tests |
| `backend/services/core-banking/tests/conftest.py` | Test config (stale test excluded) |
| `backend/services/core-banking/pytest.ini` | Pytest config |
| `.gemini/config/mcp_config.json` | MCP server config (Supabase project ref) |

---

## 🧪 TEST STATUS

```
pytest backend/services/core-banking/tests/ --ignore=...test_inventory.py
= 37 passed, 2 failed (GeoAlchemy2 SQLite limitation — pre-existing) =
```

---

## ⚙️ ENVIRONMENT

- Python venv: `C:\Users\paulji peters\VentureRoot\venv\`
- Run tests: `venv\Scripts\python -m pytest backend/services/core-banking/tests/ -v`
- Backend dir: `backend/services/core-banking/`
- Mobile app: (Expo React Native — separate from backend)

---

## 📌 HOW TO RESUME THIS SESSION

Tell the new session:
> "Read C:\Users\paulji peters\VentureRoot\SESSION_CONTEXT.md and continue 
>  from where we left off. The MCP should now be pointing to VentureRoot. 
>  Verify the connection and apply migration 008 to Supabase."
