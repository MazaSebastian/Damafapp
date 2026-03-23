-- ============================================================
-- Migration 06: Fix Anon RLS Access + Harden Orders INSERT
-- DamafAPP v2 — SaaS Infrastructure Hardening
-- ============================================================
-- FIXES:
--   1. Add anon SELECT policies for tables that guests need:
--      app_settings, coupons, rewards, news_events
--      (Same pattern as 05_fix_public_menu_rls.sql)
--
--   2. Harden orders/order_items INSERT to prevent cross-tenant
--      data injection (replace "tenant_id IS NOT NULL" with proper check)
-- ============================================================

-- ============================================================
-- PART 1: Anon SELECT Policies for Guest Access
-- ============================================================

-- App Settings: Allow anonymous reads (needed for theme, store hours, config)
CREATE POLICY "public_app_settings_anon_select" ON public.app_settings
    FOR SELECT
    TO anon
    USING (true);

-- Coupons: Allow anonymous reads (public coupons page)
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='coupons') THEN
    EXECUTE 'CREATE POLICY "public_coupons_anon_select" ON public.coupons FOR SELECT TO anon USING (true)';
END IF;
END $$;

-- Rewards: Allow anonymous reads (public rewards store)
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='rewards') THEN
    EXECUTE 'CREATE POLICY "public_rewards_anon_select" ON public.rewards FOR SELECT TO anon USING (true)';
END IF;
END $$;

-- News/Events: Allow anonymous reads (public home page novedades)
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='news_events') THEN
    EXECUTE 'CREATE POLICY "public_news_events_anon_select" ON public.news_events FOR SELECT TO anon USING (true)';
END IF;
END $$;

-- Production Slots: Allow anonymous reads (delivery slot selector on checkout)
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='production_slots') THEN
    EXECUTE 'CREATE POLICY "public_production_slots_anon_select" ON public.production_slots FOR SELECT TO anon USING (true)';
END IF;
END $$;

-- ============================================================
-- PART 2: Harden Orders INSERT (prevent cross-tenant injection)
-- ============================================================
-- OLD: WITH CHECK (tenant_id IS NOT NULL)
--   → Any user can insert into ANY tenant by knowing the UUID
-- NEW: For authenticated users, verify tenant_id matches their profile.
--      For anon users (guest checkout), still allow but only if tenant exists.
-- ============================================================

-- Drop the old permissive policies
DROP POLICY IF EXISTS "tenant_orders_insert" ON public.orders;
DROP POLICY IF EXISTS "tenant_order_items_insert" ON public.order_items;

-- Orders: Authenticated users can only insert into their own tenant
CREATE POLICY "tenant_orders_insert_auth" ON public.orders
    FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = public.current_tenant_id()
    );

-- Orders: Anon users (guest checkout) can insert if tenant exists and is active
CREATE POLICY "tenant_orders_insert_anon" ON public.orders
    FOR INSERT
    TO anon
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tenants
            WHERE tenants.id = tenant_id
            AND tenants.is_active = true
        )
    );

-- Order Items: Authenticated users can only insert into their own tenant
CREATE POLICY "tenant_order_items_insert_auth" ON public.order_items
    FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = public.current_tenant_id()
    );

-- Order Items: Anon users (guest checkout) can insert if tenant exists
CREATE POLICY "tenant_order_items_insert_anon" ON public.order_items
    FOR INSERT
    TO anon
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tenants
            WHERE tenants.id = tenant_id
            AND tenants.is_active = true
        )
    );
