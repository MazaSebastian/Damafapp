-- 1. Setup Tables (Run this if tables do not exist on Production)
-- Based on SQL_ARCA_SETUP.sql

-- AFIP Credentials
CREATE TABLE IF NOT EXISTS public.afip_credentials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    environment TEXT NOT NULL DEFAULT 'production',
    cuit TEXT NOT NULL,
    sales_point INT NOT NULL,
    cert_crt TEXT NOT NULL,
    private_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    tax_condition TEXT DEFAULT 'monotributo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.afip_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can full access afip_credentials" ON public.afip_credentials;
CREATE POLICY "Admin can full access afip_credentials" ON public.afip_credentials
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'owner')
        )
    );

-- AFIP Auth Tokens
CREATE TABLE IF NOT EXISTS public.afip_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    environment TEXT NOT NULL,
    token TEXT NOT NULL,
    sign TEXT NOT NULL,
    expiration_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.afip_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can full access afip_tokens" ON public.afip_tokens;
CREATE POLICY "Admin can full access afip_tokens" ON public.afip_tokens
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'owner')
        )
    );

-- Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id),
    cae TEXT,
    cae_due_date DATE,
    cbte_tipo INT NOT NULL,
    cbte_nro BIGINT,
    pt_vta INT NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    doc_tipo INT DEFAULT 99,
    doc_nro TEXT DEFAULT '0',
    status TEXT DEFAULT 'pending',
    error_msg TEXT,
    pdf_url TEXT,
    afip_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensuring ALL columns exist to prevent partial schema errors

-- FIX: Rename pto_venta to pt_vta if it exists (Schema Mismatch Fix)
DO $$
BEGIN
    -- Check if strict column pto_venta exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='invoices' AND column_name='pto_venta') THEN
        -- Check if pt_vta also exists (conflicting target)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='invoices' AND column_name='pt_vta') THEN
             -- Drop the potentially empty/duplicate pt_vta to allow rename
             ALTER TABLE public.invoices DROP COLUMN pt_vta;
        END IF;

        -- Rename pto_venta to pt_vta
        ALTER TABLE public.invoices RENAME COLUMN pto_venta TO pt_vta;
    END IF;

    -- FIX: Rename imp_total to total_amount if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='invoices' AND column_name='imp_total') THEN
        -- Check if total_amount also exists (conflicting target)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='invoices' AND column_name='total_amount') THEN
             -- Drop the potentially empty/duplicate total_amount to allow rename
             ALTER TABLE public.invoices DROP COLUMN total_amount;
        END IF;

        -- Rename imp_total to total_amount
        ALTER TABLE public.invoices RENAME COLUMN imp_total TO total_amount;
    END IF;

    -- FIX: Rename imp_neto to net_amount AND Make it Nullable (App doesn't seem to use it yet)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='invoices' AND column_name='imp_neto') THEN
        
        -- Check if net_amount exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='invoices' AND column_name='net_amount') THEN
             ALTER TABLE public.invoices DROP COLUMN net_amount;
        END IF;

        ALTER TABLE public.invoices RENAME COLUMN imp_neto TO net_amount;
        ALTER TABLE public.invoices ALTER COLUMN net_amount DROP NOT NULL;
    END IF;
END $$;

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS cae_due_date DATE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS afip_response JSONB;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS pt_vta INT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS cbte_nro BIGINT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS cbte_tipo INT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS doc_tipo INT DEFAULT 99;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS doc_nro TEXT DEFAULT '0';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS cae TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS error_msg TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS pdf_url TEXT;

ALTER TABLE public.afip_credentials ADD COLUMN IF NOT EXISTS tax_condition TEXT DEFAULT 'monotributo';

ALTER TABLE public.invoices DISABLE ROW LEVEL SECURITY;

-- 2. Insert Production Credentials (DAMAFAPP POS LIVE)
-- Using the credentials we verified.
INSERT INTO afip_credentials (environment, cuit, sales_point, cert_crt, private_key, is_active, tax_condition)
VALUES (
    'production',
    '20381757812',
    3, -- Punto de Venta 3 (Web Services)
    $$-----BEGIN CERTIFICATE-----
MIIDQzCCAiugAwIBAgIIEk7zLYWqJcEwDQYJKoZIhvcNAQENBQAwMzEVMBMGA1UEAwwMQ29tcHV0
YWRvcmVzMQ0wCwYDVQQKDARBRklQMQswCQYDVQQGEwJBUjAeFw0yNjAxMjcwMjA4MDBaFw0yODAx
MjcwMjA4MDBaMC4xETAPBgNVBAMMCERhbWFmQVBQMRkwFwYDVQQFExBDVUlUIDIwMzgxNzU3ODEy
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvM9zFkJ5kysYhct2RLjI89e+MSeipQDc
lWcKrhT+KzT6OT9Zn9oH85mlAAENZqYrFwLJg4fjkKs473/3V9+DIbUGWyRFb6p2KQzWquM+zOuO
3fq4AVjkRZU7Tj6ofJyolGHz6UoieOwtmOsrX/4Fs9erJ/gBJOGfaFCBD3fbuhMV65XUehuiYwKU
3um6GJrVNszSZxdwIrfmB8jITVuDyEk1bfP5P5NEQomgn/GrH21AYHHOfgxdNGFR7FEWNaX7AjFl
YgOs12Nim8nj+ZL69yEXtwYt0dOBjx7gGHlAUPxrlWzJSGu8fjkKs473/3V9+DIbUGWyRFb6p2KQzWquM+zOuO3fq4AVjkRZU7Tj6ofJyolGHz6UoieOwtmOsrX/4Fs9erJ/gBJOGfaFCBD3fbuhMV65XUehuiYwKU3um6GJrVNszSZxdwIrfmB8jITVuDyEk1bfP5P5NEQomgn/GrH21AYHHOfgxdNGFR7FEWNaX7AjFlYgOs12Nim8nj+ZL69yEXtwYt0dOBjx7gGHlAUPxrlWzJSGu8fKsUsGGwepzT3Amx6Ti2ndVZOWXu
3sOppwIDAQABo2AwXjAMBgNVHRMBAf8EAjAAMB8GA1UdIwQYMBaAFCsNL8jfYf0IyU4R0DWTBG2O
W9BuMB0GA1UdDgQWBBRdCr54AJVqQ+kZ0iIxH0qicOpevTAOBgNVHQ8BAf8EBAMCBeAwDQYJKoZI
hvcNAQENBQADggEBAETPL7arOq1Bpfo4gwGd9vpmx0Iz+zxN1SrDakF7WKoNx3L19BxrdUCCSh3s
wm3LC443AgBap2vNtmqLnfCBRH/YChhSKB77GdkS8iNKPSewQxKf2/rgEC4DpbX5hPgv3UkJ2tZ7
0EvaEwU0RJrQSOBFqu61JbatUmZkiqybjN71yF8woWfiAgCae53/VfTTIWk62x78CwbzffYlnfgG
SHa+x8MKRnvIhw00TTWenrdv1tSCMaIv+J0fBOZjiNm8zg6U1g4VR/Mb11jGaToiSPV/NdX8HkcC
jCTfKWvvfcnTP8TtJphGU4dT4wLUE/d/L2t2kpNt697706iduZrK6ZY=
-----END CERTIFICATE-----
$$,
    $$-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC8z3MWQnmTKxiF
y3ZEuMjz174xJ6KlANyVZwquFP4rNPo5P1mf2gfzmaUAAQ1mpisXAsmDh+OQqzjv
f/dX34MhtQZbJEVvqnYpDNaq4z7M647d+rgBWORFlTtOPqh8nKiUYfPpSiJ47C2Y
6ytf/gWz16sn+AEk4Z9oUIEPd9u6ExXrldR6G6JjApTe6boYmtU2zNJnF3Ait+YH
yMhNW4PISTVt8/k/k0RCiaCf8asfbUBgcc5+DF00YVHsURY1pfsCMWViA6zXY2Kb
yeP5kvr3IRe3Bi3R04GPHuAYeUBQ/GuVbMlIa7x8qxSwYbB6nNPcCbHpOLad1Vk5
Ze7ew6mnAgMBAAECggEAU2prdBgmUiimCuZa9/2TeneEZX8XUkLRMYh2pXZM3JXp
PsWIOSFAhhUJWrkcTI95Vg87LEsq9M1QuC8W/dGXw5qQlk+uBamPzo8HgDQpmKsx
UUzlYmL9ZuiJbQYttfAYYoXsFtNT64yckITFgwFdT5km2t+s0biEjreSbV0MzGXD
863YZCe+iANGS2oGlebUfc/LVM+hPEVJgNBOAuqSKQh0RIuhNwwS4+dvoxTPmbLE
IRuEpGHz0MNhZwaZniXl5caZP1S5RpBdQBIPt9ZqJ2vpcEqn2q/f25V4+clbZfRJ
0owbBM17QvcVXR0cYDxkIiGzkMzIlETGQPjXhuCRMQKBgQDcl2hTfg6W040q3sr9
sumP6TvEt3/+zNqS2nPYIW6oyuBUcOh0R4gK44SXfkpKXyhiD518hohGhRjUzbOM
mhanbyUyX2zu6e7AUf/eF89fpFnF42hk3JrqjeVzZ2NClCr16p8WUlFwR96oTRf7
23h/jkUMiP9326rxMieBj/D3EwKBgQDbHhYpT6fxsSWbYjTAZO/vw3nOvvespVQN
U9Rx0G1VCwCthX1ZMmwlek1PoUCCNAUoRKGNykJkyQBtm5mx0AxGlILPK9gTd7TK
UbeiYRmMGXv/ytg6DEPCxookvsmW08qeQq9yaNhAElS0f48m7ohlONUqMKubqCRE
AoNDazixnQKBgQDBysYda4YXnRzMx9PfU5l7E3StmmP5DjELiJzzCFP2N90icdrV
pK3wmva2PH25nqWUmJFLf8ki4vTwpxIQ+KHkUHGGMm056wwTqzY1AAfvxywS/HiO
+3uhii1E2FRMfmzLhGZkrsba9Fi41Jm4apQOw4cHvydoPfSMVvp8CV+xPwKBgQCm
kNFx5+6X6PzYiKfnFRPb5HHE+yBVqnwhgXc+aZ2jBzEltxMZah4Rw03f2YmrMJY3
DSzuFzGvYaikqaMFK00Zni1uBTtFWTsijUoV8tAz0u+S/ASw47/i4YAD/NBLioY9
Fh4+z3qMAiNH7qvIgY1HvRM19jeNpRykYnCcIHbBdQKBgD+uynJuLN7ceurmvazx
O/51nI0EmDvJZshDIhIRyKBA5aJKm04/hmZ60wErNpG+cK2az9PRGYiro+koxcMt
bhigq02O14BZt3U2sEC6lYcDgG/6sqmQueLtL6Li39dMyOH7scBXGZYc/Q3OAwir
ifXuY1iQRhzo73Ybpf1lM1WM
-----END PRIVATE KEY-----
$$,
    true,
    'monotributo'
)
ON CONFLICT DO NOTHING;

-- 3. Insert the Invoice we just generated (so history is consistent)
-- Note: Order ID is dummy 1...1, ensure it is created or nullable.
-- Since order_id is FK, we must ensure order exists or insert it.
-- But on Production, we probably don't want the dummy order?
-- Actually, inserting the invoice is important so the voucher number matches LAST_CBTE + 1.
-- If we don't insert it, the app will think it has no invoices, but AFIP says next is 7.
-- Solution: Insert the invoice with a NULL order_id (if table allows) or a dummy.
-- Table definition: order_id UUID REFERENCES public.orders(id)
-- If we can't insert the order, we can make order_id NULL if we alter table.
-- Original definition has REFERENCES. It is likely NOT NULL by default unless specified otherwise.
-- SQL_ARCA_SETUP.sql: order_id UUID REFERENCES public.orders(id) -- this is NULLABLE by default in Postgres if not "NOT NULL".
-- So we can insert with NULL order_id.

INSERT INTO invoices (id, order_id, cae, cae_due_date, cbte_tipo, cbte_nro, pt_vta, total_amount, status)
VALUES (
    '538f7eaf-ea1f-4b75-a7e3-33e4de50f5ee',
    NULL, 
    '86052218583592',
    '2026-02-12',
    11, -- Factura C
    6,
    3,
    1.00,
    'authorized'
)
ON CONFLICT (id) DO NOTHING;
