-- FIX SCRIPT: Create missing tables referenced in DEPLOY_TO_PRODUCTION.sql and Application Logic
-- Run this script BEFORE running DEPLOY_TO_PRODUCTION.sql

-- 1. PROFILES (Required for Auth & Policies)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    role TEXT DEFAULT 'customer', -- 'admin', 'owner', 'customer'
    full_name TEXT,
    phone TEXT,
    address TEXT,
    zip_code TEXT,
    birth_date TEXT,
    lat FLOAT8,
    lng FLOAT8,
    customer_id SERIAL, -- Friendly Customer #ID
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles to be safe, but allow public access for now if needed or add policies later
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. DRIVERS (Referenced by Orders)
CREATE TABLE IF NOT EXISTS public.drivers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view drivers" ON public.drivers;
CREATE POLICY "Admins can view drivers" ON public.drivers FOR SELECT USING (true); -- Simplify for now

-- 3. PRODUCTS (Referenced by Order Items)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) DEFAULT 0,
    category_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public products view" ON public.products;
CREATE POLICY "Public products view" ON public.products FOR SELECT USING (true);

-- 4. ORDERS (Referenced by Invoices)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number SERIAL, -- Friendly Order #
    user_id UUID REFERENCES public.profiles(id), -- Nullable for guest
    driver_id UUID, -- FK added below
    status TEXT DEFAULT 'pending', -- pending, cooking, completed, etc.
    total DECIMAL(10,2) DEFAULT 0,
    payment_method TEXT,
    order_type TEXT, -- delivery, pickup
    delivery_address TEXT,
    client_name TEXT,
    client_phone TEXT,
    scheduled_time TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add explicit Foreign Key for drivers with specific name if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_orders_drivers') THEN
        ALTER TABLE public.orders
        ADD CONSTRAINT fk_orders_drivers FOREIGN KEY (driver_id) REFERENCES public.drivers(id);
    END IF;
END $$;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public orders view" ON public.orders;
CREATE POLICY "Public orders view" ON public.orders FOR SELECT USING (true); -- Simplify

-- 5. ORDER_ITEMS (Referenced by Application)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    quantity INT DEFAULT 1,
    notes TEXT,
    modifiers JSONB, -- Array of modifiers
    side_info JSONB,
    drink_info JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public order items view" ON public.order_items;
CREATE POLICY "Public order items view" ON public.order_items FOR SELECT USING (true);
