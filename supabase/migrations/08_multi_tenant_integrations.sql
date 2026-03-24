-- ============================================================
-- Migration 08: Multi-Tenant Integrations
-- DamafAPP v2
-- Run AFTER migrations 01–07
-- ============================================================
-- Creates:
--   - mp_credentials     (MercadoPago per-tenant access tokens)
--   - meta_credentials   (Instagram + WhatsApp Business per-tenant)
--   - push_subscriptions (FCM device tokens per-tenant)
-- Fixes:
--   - afip_credentials RLS (now filters by tenant_id)
--   - afip_tokens RLS (idem)
--   - invoices RLS (was DISABLED — now enabled with proper policy)
-- ============================================================


-- ============================================================
-- SECTION 1: ARCA tables — Create if missing, fix RLS
-- ============================================================
-- SQL_ARCA_SETUP.sql may or may not have been run.
-- We create the tables with tenant_id from the start if they don't exist,
-- and fix RLS policies in all cases.

-- 1a. afip_credentials
CREATE TABLE IF NOT EXISTS public.afip_credentials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    environment TEXT NOT NULL DEFAULT 'production',
    cuit TEXT NOT NULL,
    sales_point INT NOT NULL,
    cert_crt TEXT NOT NULL,
    private_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (tenant_id)
);

ALTER TABLE public.afip_credentials ENABLE ROW LEVEL SECURITY;

-- Add tenant_id if table existed without it
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='afip_credentials' AND column_name='tenant_id') THEN
        ALTER TABLE public.afip_credentials ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

DROP POLICY IF EXISTS "Admin can full access afip_credentials" ON public.afip_credentials;
DROP POLICY IF EXISTS "Tenant admin manages own afip_credentials" ON public.afip_credentials;

CREATE POLICY "Tenant admin manages own afip_credentials" ON public.afip_credentials
    FOR ALL
    USING (
        tenant_id = public.current_tenant_id()
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'owner')
        )
    );

CREATE INDEX IF NOT EXISTS idx_afip_credentials_tenant ON public.afip_credentials(tenant_id);


-- 1b. afip_tokens
CREATE TABLE IF NOT EXISTS public.afip_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    environment TEXT NOT NULL,
    token TEXT NOT NULL,
    sign TEXT NOT NULL,
    expiration_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.afip_tokens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='afip_tokens' AND column_name='tenant_id') THEN
        ALTER TABLE public.afip_tokens ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

DROP POLICY IF EXISTS "Admin can full access afip_tokens" ON public.afip_tokens;
DROP POLICY IF EXISTS "Tenant admin manages own afip_tokens" ON public.afip_tokens;

CREATE POLICY "Tenant admin manages own afip_tokens" ON public.afip_tokens
    FOR ALL
    USING (
        tenant_id = public.current_tenant_id()
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'owner')
        )
    );

CREATE INDEX IF NOT EXISTS idx_afip_tokens_tenant ON public.afip_tokens(tenant_id);


-- 1c. invoices
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id),
    cae TEXT,
    cae_due_date DATE,
    cbte_tipo INT NOT NULL DEFAULT 11,
    cbte_nro BIGINT,
    pt_vta INT NOT NULL DEFAULT 1,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    doc_tipo INT DEFAULT 99,
    doc_nro TEXT DEFAULT '0',
    status TEXT DEFAULT 'pending',
    error_msg TEXT,
    pdf_url TEXT,
    afip_response JSONB,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='invoices' AND column_name='tenant_id') THEN
        ALTER TABLE public.invoices ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

DROP POLICY IF EXISTS "Tenant admin manages own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Customer views own invoices" ON public.invoices;

CREATE POLICY "Tenant admin manages own invoices" ON public.invoices
    FOR ALL
    USING (
        tenant_id = public.current_tenant_id()
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'owner')
        )
    );

CREATE POLICY "Customer views own invoices" ON public.invoices
    FOR SELECT
    USING (
        order_id IN (
            SELECT id FROM public.orders WHERE user_id = auth.uid()
        )
    );

CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON public.invoices(tenant_id);


-- ============================================================
-- SECTION 2: MercadoPago Credentials
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mp_credentials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Sensible: Solo leído por Edge Functions con service_role
    access_token TEXT NOT NULL,

    -- Puede enviarse al frontend para inicializar el SDK de MP
    public_key TEXT NOT NULL,

    -- Flag de activación
    is_active BOOLEAN NOT NULL DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    -- Un solo registro activo por tenant
    UNIQUE (tenant_id)
);

ALTER TABLE public.mp_credentials ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_mp_credentials_tenant ON public.mp_credentials(tenant_id);

-- Admin del tenant puede gestionar sus credenciales MP
CREATE POLICY "Tenant admin manages own mp_credentials" ON public.mp_credentials
    FOR ALL
    USING (
        tenant_id = public.current_tenant_id()
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'owner')
        )
    );

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS mp_credentials_updated_at ON public.mp_credentials;
CREATE TRIGGER mp_credentials_updated_at
    BEFORE UPDATE ON public.mp_credentials
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- SECTION 3: Meta (Instagram + WhatsApp) Credentials
-- ============================================================

CREATE TABLE IF NOT EXISTS public.meta_credentials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Instagram Graph API
    ig_page_access_token TEXT,       -- Long-lived token (60 días, se renueva)
    ig_account_id TEXT,              -- Instagram Business Account ID
    ig_enabled BOOLEAN NOT NULL DEFAULT false,

    -- WhatsApp Business Cloud API
    wa_access_token TEXT,            -- System User Token (permanente)
    wa_phone_number_id TEXT,         -- Phone Number ID para enviar mensajes
    wa_business_account_id TEXT,     -- WABA ID
    wa_webhook_verify_token TEXT,    -- Token para verificar webhook de Meta
    wa_enabled BOOLEAN NOT NULL DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    -- Un solo registro por tenant
    UNIQUE (tenant_id)
);

ALTER TABLE public.meta_credentials ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_meta_credentials_tenant ON public.meta_credentials(tenant_id);

CREATE POLICY "Tenant admin manages own meta_credentials" ON public.meta_credentials
    FOR ALL
    USING (
        tenant_id = public.current_tenant_id()
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'owner')
        )
    );

DROP TRIGGER IF EXISTS meta_credentials_updated_at ON public.meta_credentials;
CREATE TRIGGER meta_credentials_updated_at
    BEFORE UPDATE ON public.meta_credentials
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- SECTION 4: Push Notification Subscriptions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Token FCM generado por el Service Worker
    fcm_token TEXT NOT NULL,

    -- Metadata del dispositivo para segmentación
    device_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Ejemplo: { "platform": "web", "browser": "Chrome", "role": "admin" }

    is_active BOOLEAN NOT NULL DEFAULT true,
    last_seen_at TIMESTAMPTZ DEFAULT now(),

    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    -- Un mismo token no puede estar registrado dos veces
    UNIQUE (fcm_token)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_tenant ON public.push_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON public.push_subscriptions(tenant_id, is_active);

-- Un usuario autenticado puede gestionar sus propias suscripciones
CREATE POLICY "User manages own push subscriptions" ON public.push_subscriptions
    FOR ALL
    USING (user_id = auth.uid());

-- Admin del tenant puede ver todas las suscripciones de su tenant (para stats)
CREATE POLICY "Tenant admin views all push subscriptions" ON public.push_subscriptions
    FOR SELECT
    USING (
        tenant_id = public.current_tenant_id()
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'owner')
        )
    );

-- Clientes anónimos pueden insertar (registrar dispositivo antes de login)
CREATE POLICY "Anyone can register push subscription" ON public.push_subscriptions
    FOR INSERT
    WITH CHECK (true);

DROP TRIGGER IF EXISTS push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER push_subscriptions_updated_at
    BEFORE UPDATE ON public.push_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- SECTION 5: New app_settings keys documentation
-- (No SQL needed — keys are free-form. These are the expected keys per tenant)
-- ============================================================

-- Google Maps:
--   gmaps_api_key          → 'AIzaSy...'
--   gmaps_enabled          → 'true' | 'false'
--   store_lat              → '-34.6037'
--   store_lng              → '-58.3816'
--   store_address          → 'Av. Corrientes 1234, CABA'

-- Push Notifications:
--   push_notifications_enabled  → 'true' | 'false'
--   push_on_new_order           → 'true' | 'false'
--   push_on_order_ready         → 'true' | 'false'
--   push_on_delivery_complete   → 'true' | 'false'

-- MercadoPago (public_key safe for frontend, stored in app_settings):
--   mp_public_key          → 'APP_USR-public...'
--   mp_enabled             → 'true' | 'false'


-- ============================================================
-- SUMMARY: Tables created / modified in this migration
-- ============================================================
-- [NEW]      public.mp_credentials
-- [NEW]      public.meta_credentials
-- [NEW]      public.push_subscriptions
-- [NEW]      public.update_updated_at_column() FUNCTION
-- [FIXED]    public.afip_credentials   → RLS policy now tenant-scoped
-- [FIXED]    public.afip_tokens        → RLS policy now tenant-scoped
-- [FIXED]    public.invoices           → RLS ENABLED (was disabled)
-- ============================================================
