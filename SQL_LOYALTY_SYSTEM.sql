-- 1. Ensure 'stars' column exists in profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stars integer DEFAULT 0;

-- 2. Create Redemptions table (requests)
CREATE TABLE IF NOT EXISTS redemptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    reward_id uuid REFERENCES rewards(id) NOT NULL,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'delivered')),
    points_cost integer NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Redemptions
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own redemptions
CREATE POLICY "Users can view own redemptions" ON redemptions
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Admins can view all and update
CREATE POLICY "Admins can manage redemptions" ON redemptions
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'owner')))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'owner')));

-- 3. Function to Redeem Reward (Transaction: Deduct points + Create Redemption)
CREATE OR REPLACE FUNCTION redeem_reward(reward_id_input uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_stars integer;
    reward_cost integer;
    new_redemption_id uuid;
BEGIN
    -- Check current stars
    SELECT stars INTO user_stars FROM profiles WHERE id = auth.uid();
    
    -- Check reward cost
    SELECT cost INTO reward_cost FROM rewards WHERE id = reward_id_input;
    
    IF reward_cost IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Premio no encontrado');
    END IF;

    IF user_stars < reward_cost THEN
        RETURN json_build_object('success', false, 'message', 'Estrellas insuficientes');
    END IF;

    -- Deduct stars
    UPDATE profiles SET stars = stars - reward_cost WHERE id = auth.uid();

    -- Create redemption record
    INSERT INTO redemptions (user_id, reward_id, points_cost)
    VALUES (auth.uid(), reward_id_input, reward_cost)
    RETURNING id INTO new_redemption_id;

    RETURN json_build_object('success', true, 'message', 'Canje exitoso', 'redemption_id', new_redemption_id);
END;
$$;


-- 4. Trigger to Accrue Points on Order Completion
CREATE OR REPLACE FUNCTION add_stars_on_order_complete()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    stars_to_add integer;
BEGIN
    -- Only run if status changed to 'completed'
    IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.user_id IS NOT NULL THEN
        -- Logic: 10 stars per $1. Round down.
        stars_to_add := floor(NEW.final_total * 10);
        
        UPDATE profiles 
        SET stars = stars + stars_to_add 
        WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_complete_add_stars ON orders;
CREATE TRIGGER on_order_complete_add_stars
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION add_stars_on_order_complete();
