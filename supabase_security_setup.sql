-- ====================================================================
-- BEU VERIFY - SUPABASE SECURITY HARDENING & RLS FIX SCRIPT
-- Project: beu16's Project (wdetwoiqqmqwxzifeocg)
-- 
-- RESOLVES SECURITY WARNINGS:
-- 1. RLS Disabled in Public (rls_disabled_in_public)
-- 2. Sensitive Columns Exposed (sensitive_columns_exposed)
-- ====================================================================

-- STEP 1: Enable Row Level Security (RLS) on all public tables
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transaction_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.verified_transactions ENABLE ROW LEVEL SECURITY;

-- STEP 2: Drop existing public policies if any exist
DROP POLICY IF EXISTS "Deny all public access to users" ON public.users;
DROP POLICY IF EXISTS "Deny all public access to transaction_references" ON public.transaction_references;
DROP POLICY IF EXISTS "Deny all public access to verified_transactions" ON public.verified_transactions;
DROP POLICY IF EXISTS "Allow service role full access users" ON public.users;
DROP POLICY IF EXISTS "Allow service role full access references" ON public.transaction_references;
DROP POLICY IF EXISTS "Allow service role full access transactions" ON public.verified_transactions;

-- STEP 3: Revoke all direct PostgREST API access from anonymous and authenticated public roles
REVOKE ALL ON TABLE public.users FROM anon, authenticated;
REVOKE ALL ON TABLE public.transaction_references FROM anon, authenticated;
REVOKE ALL ON TABLE public.verified_transactions FROM anon, authenticated;

-- STEP 4: Grant full administrative access to the service_role (used by server backend)
GRANT ALL ON TABLE public.users TO service_role;
GRANT ALL ON TABLE public.transaction_references TO service_role;
GRANT ALL ON TABLE public.verified_transactions TO service_role;

-- STEP 5: Create strict RLS Policies allowing ONLY service_role (and denying anon / public)
CREATE POLICY "Allow service role full access users"
  ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service role full access references"
  ON public.transaction_references
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service role full access transactions"
  ON public.verified_transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- STEP 6: Revoke column-level SELECT on sensitive user columns for public API roles
REVOKE SELECT (password, verification_code) ON public.users FROM anon, authenticated;

-- ====================================================================
-- DONE! All tables are now secured with RLS enabled, PostgREST API access
-- is blocked for unauthorized clients, and sensitive columns are shielded.
-- ====================================================================
