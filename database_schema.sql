-- 1. Profiles (Linked automatically to Supabase Authentication)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT UNIQUE,
  bvn TEXT, -- Bank Verification Number
  pin_hash TEXT, -- Stored securely for the 4-digit PIN lock
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Wallets (For holding balances)
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  balance DECIMAL(12, 2) DEFAULT 0.00,
  currency TEXT DEFAULT 'NGN',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Transactions (For recording sales, deposits, and loan disbursements)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit', 'loan_disbursement', 'repayment', 'sale')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Loans
CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  principal_amount DECIMAL(12, 2) NOT NULL,
  amount_due DECIMAL(12, 2) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'paid', 'defaulted')),
  due_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Inventory Items (For the "Scan Shelve", "Voice Stock" and Sales tracking)
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  name TEXT NOT NULL,
  barcode TEXT,
  quantity INTEGER DEFAULT 0,
  price DECIMAL(10, 2),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, phone_number)
  VALUES (new.id, new.phone);
  
  INSERT INTO public.wallets (user_id, balance)
  VALUES (new.id, 0.00);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute the function
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
