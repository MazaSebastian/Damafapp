-- ============================================================
-- Migration 03: Seed Default Tenant + Migrate Existing Data
-- DamafAPP v2 → SaaS Multitenant
-- ============================================================
-- INSTRUCTIONS:
--   Run AFTER 01_create_tenants.sql
--   Run BEFORE 02_tenant_rls_policies.sql
--   This creates the default "DamafAPP" tenant and assigns ALL 
--   existing data to it. Then makes tenant_id NOT NULL.
-- ============================================================

-- ============================================================
-- STEP 1: Create the default tenant for DamafAPP
-- ============================================================

-- Use a fixed UUID so we can reference it in the rest of the script
-- and it's reproducible across environments
INSERT INTO public.tenants (id, name, slug, plan, is_active, contact_email)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'DamafAPP',
    'damaf',
    'pro',
    true,
    'contacto@damafapp.com'
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- STEP 2: Assign ALL existing rows to the default tenant
-- ============================================================

-- Profiles
UPDATE public.profiles 
SET tenant_id = 'a0000000-0000-0000-0000-000000000001' 
WHERE tenant_id IS NULL;

-- Products
UPDATE public.products 
SET tenant_id = 'a0000000-0000-0000-0000-000000000001' 
WHERE tenant_id IS NULL;

-- Categories
UPDATE public.categories 
SET tenant_id = 'a0000000-0000-0000-0000-000000000001' 
WHERE tenant_id IS NULL;

-- Orders
UPDATE public.orders 
SET tenant_id = 'a0000000-0000-0000-0000-000000000001' 
WHERE tenant_id IS NULL;

-- Order Items
UPDATE public.order_items 
SET tenant_id = 'a0000000-0000-0000-0000-000000000001' 
WHERE tenant_id IS NULL;

-- App Settings
UPDATE public.app_settings 
SET tenant_id = 'a0000000-0000-0000-0000-000000000001' 
WHERE tenant_id IS NULL;

-- Coupons (if exists)
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='coupons') THEN
    EXECUTE 'UPDATE public.coupons SET tenant_id = ''a0000000-0000-0000-0000-000000000001'' WHERE tenant_id IS NULL';
END IF;
END $$;

-- Drivers
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='drivers') THEN
    EXECUTE 'UPDATE public.drivers SET tenant_id = ''a0000000-0000-0000-0000-000000000001'' WHERE tenant_id IS NULL';
END IF;
END $$;

-- Ingredients
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ingredients') THEN
    EXECUTE 'UPDATE public.ingredients SET tenant_id = ''a0000000-0000-0000-0000-000000000001'' WHERE tenant_id IS NULL';
END IF;
END $$;

-- Rewards
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='rewards') THEN
    EXECUTE 'UPDATE public.rewards SET tenant_id = ''a0000000-0000-0000-0000-000000000001'' WHERE tenant_id IS NULL';
END IF;
END $$;

-- News Events
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='news_events') THEN
    EXECUTE 'UPDATE public.news_events SET tenant_id = ''a0000000-0000-0000-0000-000000000001'' WHERE tenant_id IS NULL';
END IF;
END $$;

-- Modifiers
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='modifiers') THEN
    EXECUTE 'UPDATE public.modifiers SET tenant_id = ''a0000000-0000-0000-0000-000000000001'' WHERE tenant_id IS NULL';
END IF;
END $$;

-- Modifier Recipes
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='modifier_recipes') THEN
    EXECUTE 'UPDATE public.modifier_recipes SET tenant_id = ''a0000000-0000-0000-0000-000000000001'' WHERE tenant_id IS NULL';
END IF;
END $$;

-- Product Modifiers
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_modifiers') THEN
    EXECUTE 'UPDATE public.product_modifiers SET tenant_id = ''a0000000-0000-0000-0000-000000000001'' WHERE tenant_id IS NULL';
END IF;
END $$;

-- Product Recipes
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_recipes') THEN
    EXECUTE 'UPDATE public.product_recipes SET tenant_id = ''a0000000-0000-0000-0000-000000000001'' WHERE tenant_id IS NULL';
END IF;
END $$;

-- Production Slots
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='production_slots') THEN
    EXECUTE 'UPDATE public.production_slots SET tenant_id = ''a0000000-0000-0000-0000-000000000001'' WHERE tenant_id IS NULL';
END IF;
END $$;

-- Cash Movements
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cash_movements') THEN
    EXECUTE 'UPDATE public.cash_movements SET tenant_id = ''a0000000-0000-0000-0000-000000000001'' WHERE tenant_id IS NULL';
END IF;
END $$;

-- Cash Registers
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cash_registers') THEN
    EXECUTE 'UPDATE public.cash_registers SET tenant_id = ''a0000000-0000-0000-0000-000000000001'' WHERE tenant_id IS NULL';
END IF;
END $$;

-- Checkout Sessions
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='checkout_sessions') THEN
    EXECUTE 'UPDATE public.checkout_sessions SET tenant_id = ''a0000000-0000-0000-0000-000000000001'' WHERE tenant_id IS NULL';
END IF;
END $$;

-- Invoices
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='invoices') THEN
    EXECUTE 'UPDATE public.invoices SET tenant_id = ''a0000000-0000-0000-0000-000000000001'' WHERE tenant_id IS NULL';
END IF;
END $$;

-- AFIP Credentials
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='afip_credentials') THEN
    EXECUTE 'UPDATE public.afip_credentials SET tenant_id = ''a0000000-0000-0000-0000-000000000001'' WHERE tenant_id IS NULL';
END IF;
END $$;

-- AFIP Tokens
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='afip_tokens') THEN
    EXECUTE 'UPDATE public.afip_tokens SET tenant_id = ''a0000000-0000-0000-0000-000000000001'' WHERE tenant_id IS NULL';
END IF;
END $$;

-- Social Messages
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='social_messages') THEN
    EXECUTE 'UPDATE public.social_messages SET tenant_id = ''a0000000-0000-0000-0000-000000000001'' WHERE tenant_id IS NULL';
END IF;
END $$;

-- Business Settings
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='business_settings') THEN
    EXECUTE 'UPDATE public.business_settings SET tenant_id = ''a0000000-0000-0000-0000-000000000001'' WHERE tenant_id IS NULL';
END IF;
END $$;

-- ============================================================
-- STEP 2.5: Fix app_settings PK to be composite (key, tenant_id)
-- Must happen AFTER data migration fills tenant_id values
-- ============================================================

ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_pkey;
ALTER TABLE public.app_settings ADD PRIMARY KEY (key, tenant_id);

-- ============================================================
-- STEP 3: Make tenant_id NOT NULL on core tables
-- (Only after all data has been migrated)
-- ============================================================

ALTER TABLE public.profiles ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.categories ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.orders ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.order_items ALTER COLUMN tenant_id SET NOT NULL;

-- Optional tables (only if they exist)
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='coupons') THEN
    EXECUTE 'ALTER TABLE public.coupons ALTER COLUMN tenant_id SET NOT NULL';
END IF;
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ingredients') THEN
    EXECUTE 'ALTER TABLE public.ingredients ALTER COLUMN tenant_id SET NOT NULL';
END IF;
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='modifiers') THEN
    EXECUTE 'ALTER TABLE public.modifiers ALTER COLUMN tenant_id SET NOT NULL';
END IF;
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='rewards') THEN
    EXECUTE 'ALTER TABLE public.rewards ALTER COLUMN tenant_id SET NOT NULL';
END IF;
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='drivers') THEN
    EXECUTE 'ALTER TABLE public.drivers ALTER COLUMN tenant_id SET NOT NULL';
END IF;
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='invoices') THEN
    EXECUTE 'ALTER TABLE public.invoices ALTER COLUMN tenant_id SET NOT NULL';
END IF;
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cash_movements') THEN
    EXECUTE 'ALTER TABLE public.cash_movements ALTER COLUMN tenant_id SET NOT NULL';
END IF;
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cash_registers') THEN
    EXECUTE 'ALTER TABLE public.cash_registers ALTER COLUMN tenant_id SET NOT NULL';
END IF;
END $$;

-- ============================================================
-- STEP 4: Update the auth trigger to include tenant_id
-- The handle_new_user() function needs to know which tenant
-- the new user belongs to. This is passed via user metadata
-- during registration from the frontend.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role, tenant_id)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
        (NEW.raw_user_meta_data->>'tenant_id')::UUID
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger already exists, so we just need to update the function (done above)
-- No need to recreate the trigger since it calls the same function name

-- ============================================================
-- STEP 5: Verify migration success
-- Run these queries to validate:
-- ============================================================

-- SELECT count(*) as total, count(tenant_id) as with_tenant FROM profiles;
-- SELECT count(*) as total, count(tenant_id) as with_tenant FROM products;
-- SELECT count(*) as total, count(tenant_id) as with_tenant FROM orders;
-- SELECT * FROM tenants;
