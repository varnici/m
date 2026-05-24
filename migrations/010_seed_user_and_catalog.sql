-- =============================================================================
-- MAPVO / VENTUREROOT — SEED USER AND INVENTORY CATALOG
-- Migration: 010_seed_user_and_catalog.sql
-- =============================================================================

-- 1. Create Default User (if not exists)
INSERT INTO users (id, phone, email, full_name, category, trust_level, security_type)
VALUES ('56dca529-8e72-4ddc-b006-bc8e934bc6b5', '+2348000000000', 'paulji@ventureroot.com', 'Paulji Peters', 'business_owner', 'bronze', 'pin')
ON CONFLICT (id) DO NOTHING;

-- 2. Create Default Wallet (if not exists)
INSERT INTO wallets (user_id, balance_kobo, total_debt_kobo)
VALUES ('56dca529-8e72-4ddc-b006-bc8e934bc6b5', 5000000, 0)
ON CONFLICT (user_id) DO NOTHING;

-- 3. Create Default Store (if not exists)
INSERT INTO stores (id, owner_id, name, type, address, city, state, is_primary, status)
VALUES ('00000000-0000-0000-0000-000000000001', '56dca529-8e72-4ddc-b006-bc8e934bc6b5', 'Main Store', 'retail', '123 Main Street', 'Lagos', 'Lagos', TRUE, 'active')
ON CONFLICT (id) DO NOTHING;

-- 4. Seed Main Categories
INSERT INTO categories (id, owner_id, name, slug, description, is_active)
VALUES 
  ('00000000-0000-0000-0000-000000000010', '56dca529-8e72-4ddc-b006-bc8e934bc6b5', 'Food & Groceries', 'food-groceries', 'Local Market: Food & Groceries', TRUE),
  ('00000000-0000-0000-0000-000000000020', '56dca529-8e72-4ddc-b006-bc8e934bc6b5', 'Beverages & Drinks', 'beverages', 'Local Market: Beverages & Drinks', TRUE),
  ('00000000-0000-0000-0000-000000000030', '56dca529-8e72-4ddc-b006-bc8e934bc6b5', 'Bakery & Pastries', 'bakery-pastries', 'Local Market: Bakery & Pastries', TRUE),
  ('00000000-0000-0000-0000-000000000040', '56dca529-8e72-4ddc-b006-bc8e934bc6b5', 'Health & Beauty', 'health-beauty', 'Local Market: Health & Beauty', TRUE),
  ('00000000-0000-0000-0000-000000000050', '56dca529-8e72-4ddc-b006-bc8e934bc6b5', 'Home & Cleaning', 'home-cleaning', 'Local Market: Home & Cleaning', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 5. Seed Subcategories
INSERT INTO categories (id, owner_id, name, slug, parent_id, description, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000110', '56dca529-8e72-4ddc-b006-bc8e934bc6b5', 'Rice, Pasta & Noodles', 'rice-pasta-noodles', '00000000-0000-0000-0000-000000000010', 'Subcategory of Food & Groceries', TRUE),
  ('00000000-0000-0000-0000-000000000120', '56dca529-8e72-4ddc-b006-bc8e934bc6b5', 'Oils & Spices', 'oils-spices', '00000000-0000-0000-0000-000000000010', 'Subcategory of Food & Groceries', TRUE),
  ('00000000-0000-0000-0000-000000000130', '56dca529-8e72-4ddc-b006-bc8e934bc6b5', 'Water & Juices', 'water-juices', '00000000-0000-0000-0000-000000000020', 'Subcategory of Beverages & Drinks', TRUE),
  ('00000000-0000-0000-0000-000000000140', '56dca529-8e72-4ddc-b006-bc8e934bc6b5', 'Carbonated Drinks', 'carbonated-drinks', '00000000-0000-0000-0000-000000000020', 'Subcategory of Beverages & Drinks', TRUE),
  ('00000000-0000-0000-0000-000000000150', '56dca529-8e72-4ddc-b006-bc8e934bc6b5', 'Snacks & Biscuits', 'snacks-biscuits', '00000000-0000-0000-0000-000000000030', 'Subcategory of Bakery & Pastries', TRUE),
  ('00000000-0000-0000-0000-000000000160', '56dca529-8e72-4ddc-b006-bc8e934bc6b5', 'Skin Care', 'skin-care', '00000000-0000-0000-0000-000000000040', 'Subcategory of Health & Beauty', TRUE),
  ('00000000-0000-0000-0000-000000000170', '56dca529-8e72-4ddc-b006-bc8e934bc6b5', 'Laundry', 'laundry', '00000000-0000-0000-0000-000000000050', 'Subcategory of Home & Cleaning', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 6. Seed Products
INSERT INTO products (id, owner_id, category_id, name, sku, barcode, unit_of_measure, cost_price_kobo, selling_price_kobo, minimum_stock_level, is_active)
VALUES
  ('00000000-0000-0000-0000-000000002010', '56dca529-8e72-4ddc-b006-bc8e934bc6b5', '00000000-0000-0000-0000-000000000110', 'Mama Gold Rice 50kg', 'SKU-RICE-50KG-001', '8901234567890', 'pcs', 7500000, 8500000, 5, TRUE),
  ('00000000-0000-0000-0000-000000002020', '56dca529-8e72-4ddc-b006-bc8e934bc6b5', '00000000-0000-0000-0000-000000000110', 'Indomie Super Pack (Chicken)', 'SKU-IND-SPACK-002', '8901234567891', 'pcs', 25000, 30000, 5, TRUE),
  ('00000000-0000-0000-0000-000000002030', '56dca529-8e72-4ddc-b006-bc8e934bc6b5', '00000000-0000-0000-0000-000000000110', 'Golden Penny Spaghetti', 'SKU-GP-SPAG-003', '8901234567892', 'pcs', 80000, 95000, 5, TRUE),
  ('00000000-0000-0000-0000-000000002040', '56dca529-8e72-4ddc-b006-bc8e934bc6b5', '00000000-0000-0000-0000-000000000120', 'Kings Vegetable Oil 1L', 'SKU-KINGS-1L-004', '8901234567893', 'pcs', 220000, 250000, 5, TRUE),
  ('00000000-0000-0000-0000-000000002050', '56dca529-8e72-4ddc-b006-bc8e934bc6b5', '00000000-0000-0000-0000-000000000120', 'Knorr Chicken Cubes', 'SKU-KNORR-CH-005', '8901234567894', 'pcs', 80000, 95000, 5, TRUE),
  ('00000000-0000-0000-0000-000000002060', '56dca529-8e72-4ddc-b006-bc8e934bc6b5', '00000000-0000-0000-0000-000000000130', 'Eva Table Water 75cl', 'SKU-EVA-75CL-006', '8901234567895', 'pcs', 20000, 25000, 5, TRUE),
  ('00000000-0000-0000-0000-000000002070', '56dca529-8e72-4ddc-b006-bc8e934bc6b5', '00000000-0000-0000-0000-000000000130', 'Chivita 100% Fruit Juice', 'SKU-CHIV-FRUIT-007', '8901234567896', 'pcs', 120000, 140000, 5, TRUE),
  ('00000000-0000-0000-0000-000000002080', '56dca529-8e72-4ddc-b006-bc8e934bc6b5', '00000000-0000-0000-0000-000000000140', 'Coca-Cola 50cl PET', 'SKU-COKE-50CL-008', '8901234567897', 'pcs', 25000, 30000, 5, TRUE),
  ('00000000-0000-0000-0000-000000002090', '56dca529-8e72-4ddc-b006-bc8e934bc6b5', '00000000-0000-0000-0000-000000000140', 'Maltina Classic', 'SKU-MALT-CLASS-009', '8901234567898', 'pcs', 30000, 35000, 5, TRUE),
  ('00000000-0000-0000-0000-000000002100', '56dca529-8e72-4ddc-b006-bc8e934bc6b5', '00000000-0000-0000-0000-000000000150', 'Digestive Biscuits', 'SKU-DIG-BISC-010', '8901234567899', 'pcs', 50000, 60000, 5, TRUE),
  ('00000000-0000-0000-0000-000000002110', '56dca529-8e72-4ddc-b006-bc8e934bc6b5', '00000000-0000-0000-0000-000000000160', 'Dettol Antiseptic Soap', 'SKU-DETT-SOAP-011', '8901234567900', 'pcs', 35000, 45000, 5, TRUE),
  ('00000000-0000-0000-0000-000000002120', '56dca529-8e72-4ddc-b006-bc8e934bc6b5', '00000000-0000-0000-0000-000000000170', 'Ariel Washing Powder', 'SKU-ARIEL-DTRG-012', '8901234567901', 'pcs', 150000, 180000, 5, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 7. Seed Stock Levels
INSERT INTO stock_levels (product_id, store_id, quantity_on_hand, quantity_reserved, status)
VALUES
  ('00000000-0000-0000-0000-000000002010', '00000000-0000-0000-0000-000000000001', 45, 0, 'in_stock'),
  ('00000000-0000-0000-0000-000000002020', '00000000-0000-0000-0000-000000000001', 80, 0, 'in_stock'),
  ('00000000-0000-0000-0000-000000002030', '00000000-0000-0000-0000-000000000001', 25, 0, 'in_stock'),
  ('00000000-0000-0000-0000-000000002040', '00000000-0000-0000-0000-000000000001', 15, 0, 'in_stock'),
  ('00000000-0000-0000-0000-000000002050', '00000000-0000-0000-0000-000000000001', 60, 0, 'in_stock'),
  ('00000000-0000-0000-0000-000000002060', '00000000-0000-0000-0000-000000000001', 120, 0, 'in_stock'),
  ('00000000-0000-0000-0000-000000002070', '00000000-0000-0000-0000-000000000001', 30, 0, 'in_stock'),
  ('00000000-0000-0000-0000-000000002080', '00000000-0000-0000-0000-000000000001', 95, 0, 'in_stock'),
  ('00000000-0000-0000-0000-000000002090', '00000000-0000-0000-0000-000000000001', 40, 0, 'in_stock'),
  ('00000000-0000-0000-0000-000000002100', '00000000-0000-0000-0000-000000000001', 50, 0, 'in_stock'),
  ('00000000-0000-0000-0000-000000002110', '00000000-0000-0000-0000-000000000001', 65, 0, 'in_stock'),
  ('00000000-0000-0000-0000-000000002120', '00000000-0000-0000-0000-000000000001', 20, 0, 'in_stock')
ON CONFLICT (product_id, store_id) DO NOTHING;
