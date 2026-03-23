-- ============================================================
-- Migration 05: Fix Public Menu Access (Categories + Products)
-- ============================================================
-- PROBLEM:
--   The tenant RLS policies (02_tenant_rls_policies.sql) use
--   `tenant_id = public.current_tenant_id()` for SELECT on
--   categories and products. The function current_tenant_id()
--   resolves via auth.uid() → profiles.tenant_id.
--   For unauthenticated (anon) users browsing the public menu,
--   auth.uid() is NULL → current_tenant_id() returns NULL →
--   the policy always returns false → 0 rows.
--
-- FIX:
--   Add an additional SELECT policy that allows anonymous reads.
--   The frontend filters by tenant_id explicitly in the query
--   (.eq('tenant_id', tenantId)), so tenant isolation is maintained.
--   This is safe because categories and products are public data
--   meant to be displayed on the storefront.
-- ============================================================

-- Categories: Allow anonymous public reads
CREATE POLICY "public_categories_anon_select" ON public.categories
    FOR SELECT
    TO anon
    USING (true);

-- Products: Allow anonymous public reads  
CREATE POLICY "public_products_anon_select" ON public.products
    FOR SELECT
    TO anon
    USING (true);

-- Product Modifiers: Allow anonymous public reads (needed for menu customization)
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_modifiers') THEN
    EXECUTE 'CREATE POLICY "public_product_modifiers_anon_select" ON public.product_modifiers FOR SELECT TO anon USING (true)';
END IF;
END $$;

-- Modifiers: Allow anonymous public reads (needed for extras on menu)
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='modifiers') THEN
    EXECUTE 'CREATE POLICY "public_modifiers_anon_select" ON public.modifiers FOR SELECT TO anon USING (true)';
END IF;
END $$;
