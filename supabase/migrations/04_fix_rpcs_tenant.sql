-- ============================================================
-- Migration 04: Fix RPCs for Tenant Isolation
-- Stacked SaaS
-- ============================================================
-- INSTRUCTIONS:
--   Run in Supabase SQL Editor AFTER 02_tenant_rls_policies.sql
--   These RPCs need tenant_id awareness.
-- ============================================================

-- ============================================================
-- FIX: is_register_open
-- Before: checked ALL cash_registers globally
-- After: checks only the current tenant's registers
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_register_open()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result boolean;
    v_tenant_id uuid;
BEGIN
    -- Get the current user's tenant_id
    SELECT tenant_id INTO v_tenant_id
    FROM public.profiles
    WHERE id = auth.uid();

    -- Check if there's an open register for this tenant
    SELECT EXISTS(
        SELECT 1 FROM public.cash_registers
        WHERE status = 'open'
        AND tenant_id = v_tenant_id
    ) INTO result;

    RETURN result;
END;
$$;

-- ============================================================
-- FIX: redeem_reward
-- Before: redeemed from ALL rewards globally
-- After: validates reward belongs to the user's tenant
-- ============================================================
CREATE OR REPLACE FUNCTION public.redeem_reward(reward_id_input uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
    v_tenant_id uuid;
    v_stars integer;
    v_reward record;
    v_result json;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'No autenticado');
    END IF;

    -- Get user's tenant and stars
    SELECT tenant_id, stars INTO v_tenant_id, v_stars
    FROM public.profiles
    WHERE id = v_user_id;

    -- Get reward and validate it belongs to the same tenant
    SELECT * INTO v_reward
    FROM public.rewards
    WHERE id = reward_id_input
    AND tenant_id = v_tenant_id
    AND active = true;

    IF v_reward IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Recompensa no encontrada o no disponible');
    END IF;

    -- Check if user has enough stars
    IF v_stars < v_reward.cost THEN
        RETURN json_build_object('success', false, 'error', 'No tenés suficientes estrellas', 'required', v_reward.cost, 'current', v_stars);
    END IF;

    -- Deduct stars
    UPDATE public.profiles
    SET stars = stars - v_reward.cost
    WHERE id = v_user_id;

    -- Return success
    RETURN json_build_object(
        'success', true,
        'reward_name', v_reward.name,
        'stars_spent', v_reward.cost,
        'stars_remaining', v_stars - v_reward.cost
    );
END;
$$;
