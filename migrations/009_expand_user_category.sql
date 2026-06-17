-- Expand the users.category CHECK constraint to accept all VentureRoot account types
-- Keeps backward compatibility with existing 'business_owner' values

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_category_check;
ALTER TABLE users ADD CONSTRAINT users_category_check
  CHECK (category IN ('retail', 'nine_to_five', 'personal', 'distributor', 'manufactural', 'logistics', 'artisan', 'business_owner'));

-- Migrate legacy 'business_owner' records to 'retail' (they were all retail users)
UPDATE users SET category = 'retail' WHERE category = 'business_owner';
