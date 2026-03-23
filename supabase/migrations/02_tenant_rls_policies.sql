-- ============================================================
-- Migration 02: Rewrite ALL RLS Policies for Tenant Isolation
-- DamafAPP v2 → SaaS Multitenant
-- ============================================================
-- INSTRUCTIONS:
--   Run AFTER 01_create_tenants.sql and 03_seed_default_tenant.sql
--   This drops all old policies and creates tenant-aware ones.
--   Old policies were role-based only. New ones add tenant isolation.
-- ============================================================

-- ============================================================
-- PROFILES
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;

-- Users can read profiles within their own tenant
CREATE POLICY "tenant_profiles_select" ON public.profiles
    FOR SELECT USING (
        tenant_id = public.current_tenant_id()
        OR id = auth.uid()  -- Users can always read their own profile
    );

-- Users can insert their own profile (during registration)
CREATE POLICY "tenant_profiles_insert" ON public.profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "tenant_profiles_update" ON public.profiles
    FOR UPDATE USING (id = auth.uid());

-- Admins can update profiles within their tenant (e.g., change roles)
CREATE POLICY "tenant_profiles_admin_update" ON public.profiles
    FOR UPDATE USING (
        tenant_id = public.current_tenant_id()
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('admin', 'owner')
        )
    );

-- ============================================================
-- CATEGORIES
-- ============================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Categories are viewable by everyone." ON public.categories;
DROP POLICY IF EXISTS "Admins can insert categories." ON public.categories;
DROP POLICY IF EXISTS "Admins can update categories." ON public.categories;
DROP POLICY IF EXISTS "Admins can delete categories." ON public.categories;

-- Public read within tenant (needed for menu page)
CREATE POLICY "tenant_categories_select" ON public.categories
    FOR SELECT USING (tenant_id = public.current_tenant_id());

-- Admin write within tenant
CREATE POLICY "tenant_categories_insert" ON public.categories
    FOR INSERT WITH CHECK (
        tenant_id = public.current_tenant_id()
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
    );

CREATE POLICY "tenant_categories_update" ON public.categories
    FOR UPDATE USING (
        tenant_id = public.current_tenant_id()
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
    );

CREATE POLICY "tenant_categories_delete" ON public.categories
    FOR DELETE USING (
        tenant_id = public.current_tenant_id()
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
    );

-- ============================================================
-- PRODUCTS
-- ============================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Products are viewable by everyone." ON public.products;
DROP POLICY IF EXISTS "Admins can insert products." ON public.products;
DROP POLICY IF EXISTS "Admins can update products." ON public.products;
DROP POLICY IF EXISTS "Admins can delete products." ON public.products;

CREATE POLICY "tenant_products_select" ON public.products
    FOR SELECT USING (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_products_insert" ON public.products
    FOR INSERT WITH CHECK (
        tenant_id = public.current_tenant_id()
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
    );

CREATE POLICY "tenant_products_update" ON public.products
    FOR UPDATE USING (
        tenant_id = public.current_tenant_id()
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
    );

CREATE POLICY "tenant_products_delete" ON public.products
    FOR DELETE USING (
        tenant_id = public.current_tenant_id()
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
    );

-- ============================================================
-- ORDERS
-- ============================================================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;

-- Admins can view orders within their tenant
CREATE POLICY "tenant_orders_admin_select" ON public.orders
    FOR SELECT USING (
        tenant_id = public.current_tenant_id()
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'kitchen'))
    );

-- Users can view their own orders
CREATE POLICY "tenant_orders_user_select" ON public.orders
    FOR SELECT USING (
        tenant_id = public.current_tenant_id()
        AND auth.uid() = user_id
    );

-- Anyone can insert orders within a tenant (guests ordering)
CREATE POLICY "tenant_orders_insert" ON public.orders
    FOR INSERT WITH CHECK (tenant_id IS NOT NULL);

-- Admins can update orders within their tenant
CREATE POLICY "tenant_orders_admin_update" ON public.orders
    FOR UPDATE USING (
        tenant_id = public.current_tenant_id()
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'kitchen'))
    );

-- Admins can delete orders within their tenant
CREATE POLICY "tenant_orders_admin_delete" ON public.orders
    FOR DELETE USING (
        tenant_id = public.current_tenant_id()
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
    );

-- ============================================================
-- ORDER_ITEMS
-- ============================================================
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Public can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "order_items_select_by_order" ON public.order_items;
DROP POLICY IF EXISTS "order_items_insert_open" ON public.order_items;
DROP POLICY IF EXISTS "order_items_all_for_admin" ON public.order_items;

CREATE POLICY "tenant_order_items_admin_select" ON public.order_items
    FOR SELECT USING (
        tenant_id = public.current_tenant_id()
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'kitchen'))
    );

CREATE POLICY "tenant_order_items_user_select" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND orders.user_id = auth.uid()
            AND orders.tenant_id = order_items.tenant_id
        )
    );

CREATE POLICY "tenant_order_items_insert" ON public.order_items
    FOR INSERT WITH CHECK (tenant_id IS NOT NULL);

CREATE POLICY "tenant_order_items_admin_update" ON public.order_items
    FOR UPDATE USING (
        tenant_id = public.current_tenant_id()
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
    );

CREATE POLICY "tenant_order_items_admin_delete" ON public.order_items
    FOR DELETE USING (
        tenant_id = public.current_tenant_id()
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
    );

-- ============================================================
-- APP_SETTINGS
-- ============================================================
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON public.app_settings;
DROP POLICY IF EXISTS "Anyone can read settings" ON public.app_settings;

-- All tenant members can read settings (needed for theme, store config, etc.)
CREATE POLICY "tenant_settings_select" ON public.app_settings
    FOR SELECT USING (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_settings_insert" ON public.app_settings
    FOR INSERT WITH CHECK (
        tenant_id = public.current_tenant_id()
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
    );

CREATE POLICY "tenant_settings_update" ON public.app_settings
    FOR UPDATE USING (
        tenant_id = public.current_tenant_id()
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
    );

CREATE POLICY "tenant_settings_delete" ON public.app_settings
    FOR DELETE USING (
        tenant_id = public.current_tenant_id()
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
    );

-- ============================================================
-- COUPONS
-- ============================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='coupons') THEN
    ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Everyone can read coupons" ON public.coupons;
    DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;

    EXECUTE 'CREATE POLICY "tenant_coupons_select" ON public.coupons FOR SELECT USING (tenant_id = public.current_tenant_id())';
    EXECUTE 'CREATE POLICY "tenant_coupons_insert" ON public.coupons FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'', ''owner'')))';
    EXECUTE 'CREATE POLICY "tenant_coupons_update" ON public.coupons FOR UPDATE USING (tenant_id = public.current_tenant_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'', ''owner'')))';
    EXECUTE 'CREATE POLICY "tenant_coupons_delete" ON public.coupons FOR DELETE USING (tenant_id = public.current_tenant_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'', ''owner'')))';
END IF;
END $$;

-- ============================================================
-- DRIVERS
-- ============================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='drivers') THEN
    ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Admins can manage drivers" ON public.drivers;
    DROP POLICY IF EXISTS "Anyone can read drivers" ON public.drivers;

    EXECUTE 'CREATE POLICY "tenant_drivers_select" ON public.drivers FOR SELECT USING (tenant_id = public.current_tenant_id())';
    EXECUTE 'CREATE POLICY "tenant_drivers_insert" ON public.drivers FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'', ''owner'')))';
    EXECUTE 'CREATE POLICY "tenant_drivers_update" ON public.drivers FOR UPDATE USING (tenant_id = public.current_tenant_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'', ''owner'')))';
    EXECUTE 'CREATE POLICY "tenant_drivers_delete" ON public.drivers FOR DELETE USING (tenant_id = public.current_tenant_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'', ''owner'')))';
END IF;
END $$;

-- ============================================================
-- INGREDIENTS
-- ============================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ingredients') THEN
    ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Anyone can read ingredients" ON public.ingredients;
    DROP POLICY IF EXISTS "Admins can manage ingredients" ON public.ingredients;

    EXECUTE 'CREATE POLICY "tenant_ingredients_select" ON public.ingredients FOR SELECT USING (tenant_id = public.current_tenant_id())';
    EXECUTE 'CREATE POLICY "tenant_ingredients_insert" ON public.ingredients FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'', ''owner'')))';
    EXECUTE 'CREATE POLICY "tenant_ingredients_update" ON public.ingredients FOR UPDATE USING (tenant_id = public.current_tenant_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'', ''owner'')))';
    EXECUTE 'CREATE POLICY "tenant_ingredients_delete" ON public.ingredients FOR DELETE USING (tenant_id = public.current_tenant_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'', ''owner'')))';
END IF;
END $$;

-- ============================================================
-- REWARDS
-- ============================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='rewards') THEN
    ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Anyone can read rewards" ON public.rewards;
    DROP POLICY IF EXISTS "Admins can manage rewards" ON public.rewards;

    EXECUTE 'CREATE POLICY "tenant_rewards_select" ON public.rewards FOR SELECT USING (tenant_id = public.current_tenant_id())';
    EXECUTE 'CREATE POLICY "tenant_rewards_insert" ON public.rewards FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'', ''owner'')))';
    EXECUTE 'CREATE POLICY "tenant_rewards_update" ON public.rewards FOR UPDATE USING (tenant_id = public.current_tenant_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'', ''owner'')))';
    EXECUTE 'CREATE POLICY "tenant_rewards_delete" ON public.rewards FOR DELETE USING (tenant_id = public.current_tenant_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'', ''owner'')))';
END IF;
END $$;

-- ============================================================
-- NEWS_EVENTS
-- ============================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='news_events') THEN
    ALTER TABLE public.news_events ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Anyone can read news" ON public.news_events;
    DROP POLICY IF EXISTS "Admins can manage news" ON public.news_events;

    EXECUTE 'CREATE POLICY "tenant_news_select" ON public.news_events FOR SELECT USING (tenant_id = public.current_tenant_id())';
    EXECUTE 'CREATE POLICY "tenant_news_insert" ON public.news_events FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'', ''owner'')))';
    EXECUTE 'CREATE POLICY "tenant_news_update" ON public.news_events FOR UPDATE USING (tenant_id = public.current_tenant_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'', ''owner'')))';
    EXECUTE 'CREATE POLICY "tenant_news_delete" ON public.news_events FOR DELETE USING (tenant_id = public.current_tenant_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'', ''owner'')))';
END IF;
END $$;

-- ============================================================
-- MODIFIERS
-- ============================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='modifiers') THEN
    ALTER TABLE public.modifiers ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "tenant_modifiers_select" ON public.modifiers FOR SELECT USING (tenant_id = public.current_tenant_id())';
    EXECUTE 'CREATE POLICY "tenant_modifiers_insert" ON public.modifiers FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'', ''owner'')))';
    EXECUTE 'CREATE POLICY "tenant_modifiers_update" ON public.modifiers FOR UPDATE USING (tenant_id = public.current_tenant_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'', ''owner'')))';
    EXECUTE 'CREATE POLICY "tenant_modifiers_delete" ON public.modifiers FOR DELETE USING (tenant_id = public.current_tenant_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'', ''owner'')))';
END IF;
END $$;

-- ============================================================
-- CASH_MOVEMENTS
-- ============================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cash_movements') THEN
    ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "tenant_cash_movements_select" ON public.cash_movements FOR SELECT USING (tenant_id = public.current_tenant_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'', ''owner'')))';
    EXECUTE 'CREATE POLICY "tenant_cash_movements_insert" ON public.cash_movements FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'', ''owner'')))';
    EXECUTE 'CREATE POLICY "tenant_cash_movements_update" ON public.cash_movements FOR UPDATE USING (tenant_id = public.current_tenant_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'', ''owner'')))';
    EXECUTE 'CREATE POLICY "tenant_cash_movements_delete" ON public.cash_movements FOR DELETE USING (tenant_id = public.current_tenant_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'', ''owner'')))';
END IF;
END $$;

-- ============================================================
-- CASH_REGISTERS
-- ============================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cash_registers') THEN
    ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "tenant_cash_registers_select" ON public.cash_registers FOR SELECT USING (tenant_id = public.current_tenant_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'', ''owner'')))';
    EXECUTE 'CREATE POLICY "tenant_cash_registers_insert" ON public.cash_registers FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'', ''owner'')))';
    EXECUTE 'CREATE POLICY "tenant_cash_registers_update" ON public.cash_registers FOR UPDATE USING (tenant_id = public.current_tenant_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'', ''owner'')))';
END IF;
END $$;

-- ============================================================
-- CHECKOUT_SESSIONS
-- ============================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='checkout_sessions') THEN
    ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "tenant_checkout_select" ON public.checkout_sessions FOR SELECT USING (tenant_id = public.current_tenant_id())';
    EXECUTE 'CREATE POLICY "tenant_checkout_insert" ON public.checkout_sessions FOR INSERT WITH CHECK (tenant_id IS NOT NULL)';
    EXECUTE 'CREATE POLICY "tenant_checkout_update" ON public.checkout_sessions FOR UPDATE USING (tenant_id = public.current_tenant_id())';
END IF;
END $$;

-- ============================================================
-- INVOICES
-- ============================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='invoices') THEN
    ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "tenant_invoices_select" ON public.invoices FOR SELECT USING (tenant_id = public.current_tenant_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'', ''owner'')))';
    EXECUTE 'CREATE POLICY "tenant_invoices_insert" ON public.invoices FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'', ''owner'')))';
    EXECUTE 'CREATE POLICY "tenant_invoices_update" ON public.invoices FOR UPDATE USING (tenant_id = public.current_tenant_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'', ''owner'')))';
END IF;
END $$;

-- ============================================================
-- AFIP_CREDENTIALS
-- ============================================================
ALTER TABLE public.afip_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can full access afip_credentials" ON public.afip_credentials;

CREATE POLICY "tenant_afip_credentials_select" ON public.afip_credentials
    FOR SELECT USING (
        tenant_id = public.current_tenant_id()
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
    );

CREATE POLICY "tenant_afip_credentials_all" ON public.afip_credentials
    FOR ALL USING (
        tenant_id = public.current_tenant_id()
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
    );

-- ============================================================
-- AFIP_TOKENS
-- ============================================================
ALTER TABLE public.afip_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can full access afip_tokens" ON public.afip_tokens;

CREATE POLICY "tenant_afip_tokens_all" ON public.afip_tokens
    FOR ALL USING (
        tenant_id = public.current_tenant_id()
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
    );

-- ============================================================
-- SOCIAL_MESSAGES
-- ============================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='social_messages') THEN
    ALTER TABLE public.social_messages ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "tenant_social_messages_select" ON public.social_messages FOR SELECT USING (tenant_id = public.current_tenant_id())';
    EXECUTE 'CREATE POLICY "tenant_social_messages_insert" ON public.social_messages FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id())';
    EXECUTE 'CREATE POLICY "tenant_social_messages_update" ON public.social_messages FOR UPDATE USING (tenant_id = public.current_tenant_id())';
END IF;
END $$;

-- ============================================================
-- PRODUCTION_SLOTS
-- ============================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='production_slots') THEN
    ALTER TABLE public.production_slots ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "tenant_slots_select" ON public.production_slots FOR SELECT USING (tenant_id = public.current_tenant_id())';
    EXECUTE 'CREATE POLICY "tenant_slots_insert" ON public.production_slots FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'', ''owner'')))';
    EXECUTE 'CREATE POLICY "tenant_slots_update" ON public.production_slots FOR UPDATE USING (tenant_id = public.current_tenant_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'', ''owner'')))';
    EXECUTE 'CREATE POLICY "tenant_slots_delete" ON public.production_slots FOR DELETE USING (tenant_id = public.current_tenant_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'', ''owner'')))';
END IF;
END $$;

-- ============================================================
-- MODIFIER_RECIPES, PRODUCT_MODIFIERS, PRODUCT_RECIPES
-- (Junction/recipe tables)
-- ============================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='modifier_recipes') THEN
    ALTER TABLE public.modifier_recipes ENABLE ROW LEVEL SECURITY;
    EXECUTE 'CREATE POLICY "tenant_modifier_recipes_select" ON public.modifier_recipes FOR SELECT USING (tenant_id = public.current_tenant_id())';
    EXECUTE 'CREATE POLICY "tenant_modifier_recipes_admin" ON public.modifier_recipes FOR ALL USING (tenant_id = public.current_tenant_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'', ''owner'')))';
END IF;

IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_modifiers') THEN
    ALTER TABLE public.product_modifiers ENABLE ROW LEVEL SECURITY;
    EXECUTE 'CREATE POLICY "tenant_product_modifiers_select" ON public.product_modifiers FOR SELECT USING (tenant_id = public.current_tenant_id())';
    EXECUTE 'CREATE POLICY "tenant_product_modifiers_admin" ON public.product_modifiers FOR ALL USING (tenant_id = public.current_tenant_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'', ''owner'')))';
END IF;

IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_recipes') THEN
    ALTER TABLE public.product_recipes ENABLE ROW LEVEL SECURITY;
    EXECUTE 'CREATE POLICY "tenant_product_recipes_select" ON public.product_recipes FOR SELECT USING (tenant_id = public.current_tenant_id())';
    EXECUTE 'CREATE POLICY "tenant_product_recipes_admin" ON public.product_recipes FOR ALL USING (tenant_id = public.current_tenant_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'', ''owner'')))';
END IF;
END $$;

-- ============================================================
-- BUSINESS_SETTINGS
-- ============================================================
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='business_settings') THEN
    ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
    EXECUTE 'CREATE POLICY "tenant_business_settings_select" ON public.business_settings FOR SELECT USING (tenant_id = public.current_tenant_id())';
    EXECUTE 'CREATE POLICY "tenant_business_settings_admin" ON public.business_settings FOR ALL USING (tenant_id = public.current_tenant_id() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'', ''owner'')))';
END IF;
END $$;
