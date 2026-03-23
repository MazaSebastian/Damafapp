-- ============================================================
-- Migration 01: Create Tenants Table + Add tenant_id to all tables
-- DamafAPP v2 → SaaS Multitenant
-- ============================================================
-- INSTRUCTIONS: 
--   Run this FIRST in Supabase SQL Editor (staging, then production).
--   This creates the tenants table and adds tenant_id columns.
--   After this, run 02_tenant_rls_policies.sql and 03_seed_default_tenant.sql
-- ============================================================

-- 1. Create the tenants (organizations) table
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,              -- URL identifier: damafapp.com/:slug/menu
    logo_url TEXT,
    theme JSONB DEFAULT '{}'::jsonb,        -- Dynamic branding: colors, fonts
    settings JSONB DEFAULT '{}'::jsonb,     -- Tenant-level config overrides
    plan TEXT DEFAULT 'free',               -- 'free', 'basic', 'pro', 'enterprise'
    is_active BOOLEAN DEFAULT true,
    contact_email TEXT,
    contact_phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Tenants are readable by anyone (needed to resolve slug → tenant on public pages)
CREATE POLICY "tenants_public_read" ON public.tenants
    FOR SELECT USING (true);

-- Only super-admins (platform level) can manage tenants
-- For now, we allow admin/owner of ANY tenant to read, 
-- but INSERT/UPDATE/DELETE is restricted
CREATE POLICY "tenants_admin_manage" ON public.tenants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'owner')
        )
    );

-- 2. Add tenant_id to ALL business tables
-- Using IF NOT EXISTS pattern via DO blocks to make migration idempotent

DO $$ BEGIN
    -- profiles (the central user table)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='tenant_id') THEN
        ALTER TABLE public.profiles ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
    END IF;

    -- products
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='tenant_id') THEN
        ALTER TABLE public.products ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
    END IF;

    -- categories
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='categories' AND column_name='tenant_id') THEN
        ALTER TABLE public.categories ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
    END IF;

    -- orders
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='tenant_id') THEN
        ALTER TABLE public.orders ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
    END IF;

    -- order_items
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='order_items' AND column_name='tenant_id') THEN
        ALTER TABLE public.order_items ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
    END IF;

    -- app_settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_settings' AND column_name='tenant_id') THEN
        ALTER TABLE public.app_settings ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        -- NOTE: The composite PK (key, tenant_id) is created in 03_seed_default_tenant.sql
        -- AFTER data has been migrated and tenant_id is no longer NULL
    END IF;

    -- business_settings (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='business_settings') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='business_settings' AND column_name='tenant_id') THEN
            ALTER TABLE public.business_settings ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        END IF;
    END IF;

    -- coupons
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='coupons') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='coupons' AND column_name='tenant_id') THEN
            ALTER TABLE public.coupons ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        END IF;
    END IF;

    -- drivers
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='drivers') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='drivers' AND column_name='tenant_id') THEN
            ALTER TABLE public.drivers ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        END IF;
    END IF;

    -- ingredients
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ingredients') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ingredients' AND column_name='tenant_id') THEN
            ALTER TABLE public.ingredients ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        END IF;
    END IF;

    -- rewards
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='rewards') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='rewards' AND column_name='tenant_id') THEN
            ALTER TABLE public.rewards ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        END IF;
    END IF;

    -- news_events
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='news_events') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='news_events' AND column_name='tenant_id') THEN
            ALTER TABLE public.news_events ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        END IF;
    END IF;

    -- modifiers
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='modifiers') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='modifiers' AND column_name='tenant_id') THEN
            ALTER TABLE public.modifiers ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        END IF;
    END IF;

    -- modifier_recipes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='modifier_recipes') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='modifier_recipes' AND column_name='tenant_id') THEN
            ALTER TABLE public.modifier_recipes ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        END IF;
    END IF;

    -- product_modifiers
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_modifiers') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_modifiers' AND column_name='tenant_id') THEN
            ALTER TABLE public.product_modifiers ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        END IF;
    END IF;

    -- product_recipes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_recipes') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_recipes' AND column_name='tenant_id') THEN
            ALTER TABLE public.product_recipes ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        END IF;
    END IF;

    -- production_slots
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='production_slots') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='production_slots' AND column_name='tenant_id') THEN
            ALTER TABLE public.production_slots ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        END IF;
    END IF;

    -- cash_movements
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cash_movements') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cash_movements' AND column_name='tenant_id') THEN
            ALTER TABLE public.cash_movements ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        END IF;
    END IF;

    -- cash_registers
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cash_registers') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cash_registers' AND column_name='tenant_id') THEN
            ALTER TABLE public.cash_registers ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        END IF;
    END IF;

    -- checkout_sessions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='checkout_sessions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='checkout_sessions' AND column_name='tenant_id') THEN
            ALTER TABLE public.checkout_sessions ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        END IF;
    END IF;

    -- invoices
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='invoices') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='invoices' AND column_name='tenant_id') THEN
            ALTER TABLE public.invoices ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        END IF;
    END IF;

    -- afip_credentials
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='afip_credentials') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='afip_credentials' AND column_name='tenant_id') THEN
            ALTER TABLE public.afip_credentials ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        END IF;
    END IF;

    -- afip_tokens
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='afip_tokens') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='afip_tokens' AND column_name='tenant_id') THEN
            ALTER TABLE public.afip_tokens ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        END IF;
    END IF;

    -- social_messages
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='social_messages') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='social_messages' AND column_name='tenant_id') THEN
            ALTER TABLE public.social_messages ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        END IF;
    END IF;

END $$;

-- 3. Create indexes on tenant_id for performance
-- These are critical for RLS policy queries to be fast
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_categories_tenant ON public.categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant ON public.orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_tenant ON public.order_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_coupons_tenant ON public.coupons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_tenant ON public.ingredients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_modifiers_tenant ON public.modifiers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rewards_tenant ON public.rewards(tenant_id);
CREATE INDEX IF NOT EXISTS idx_news_events_tenant ON public.news_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_drivers_tenant ON public.drivers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_tenant ON public.cash_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cash_registers_tenant ON public.cash_registers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON public.invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_production_slots_tenant ON public.production_slots(tenant_id);

-- 4. Helper function: Get the current user's tenant_id
-- Used by RLS policies for automatic tenant isolation
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID AS $$
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 5. Helper function: Update tenant updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_tenant_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.tenants SET updated_at = now() WHERE id = NEW.tenant_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
