-- 1. Create Modifier Recipes Table (If not exists)
CREATE TABLE IF NOT EXISTS modifier_recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    modifier_id UUID REFERENCES modifiers(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity FLOAT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(modifier_id, ingredient_id)
);

-- Enable RLS
ALTER TABLE modifier_recipes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public Read Modifier Recipes" ON modifier_recipes;
DROP POLICY IF EXISTS "Admin Full Access Modifier Recipes" ON modifier_recipes;

-- Re-create policies
CREATE POLICY "Public Read Modifier Recipes" ON modifier_recipes FOR SELECT USING (true);
CREATE POLICY "Admin Full Access Modifier Recipes" ON modifier_recipes FOR ALL USING (auth.role() = 'service_role' OR auth.email() = 'damafapp@gmail.com');


-- 2. UPDATE Trigger Function to Deduct Stock (Including Modifiers)
CREATE OR REPLACE FUNCTION deduct_stock_on_order()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
    recipe RECORD;
    mod_recipe RECORD;
    modifier JSONB;
    mod_id UUID;
    mod_qty INT;
BEGIN
    -- A. Deduct Product Ingredients
    FOR recipe IN 
        SELECT * FROM product_recipes WHERE product_id = NEW.product_id
    LOOP
        UPDATE ingredients 
        SET stock = stock - (recipe.quantity * NEW.quantity)
        WHERE id = recipe.ingredient_id;
    END LOOP;

    -- B. Deduct Modifier Ingredients
    IF NEW.modifiers IS NOT NULL AND jsonb_typeof(NEW.modifiers) = 'array' THEN
        FOR modifier IN SELECT * FROM jsonb_array_elements(NEW.modifiers)
        LOOP
            BEGIN
                -- Extract with safety
                mod_id := (modifier->>'id')::UUID;
                -- Handle quantity: if missing or null, default to 1. 
                -- Ideally the JSON has {id, quantity, price, name}
                mod_qty := COALESCE((modifier->>'quantity')::INT, 1);
                
                IF mod_qty < 1 THEN mod_qty := 1; END IF;

                FOR mod_recipe IN 
                    SELECT * FROM modifier_recipes WHERE modifier_id = mod_id
                LOOP
                    -- Calculation: Recipe Qty * Modifier Qty * Order Item Qty
                    UPDATE ingredients 
                    SET stock = stock - (mod_recipe.quantity * mod_qty * NEW.quantity)
                    WHERE id = mod_recipe.ingredient_id;
                END LOOP;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Skipping malformed modifier: %', modifier;
            END;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. UPDATE Trigger Function to Replenish Stock on Cancel (Including Modifiers)
CREATE OR REPLACE FUNCTION replenish_stock_on_cancel()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
    recipe RECORD;
    mod_recipe RECORD;
    modifier JSONB;
    mod_id UUID;
    mod_qty INT;
BEGIN
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        FOR item IN SELECT * FROM order_items WHERE order_id = NEW.id LOOP
            
            -- A. Replenish Product Ingredients
            FOR recipe IN SELECT * FROM product_recipes WHERE product_id = item.product_id LOOP
                UPDATE ingredients 
                SET stock = stock + (recipe.quantity * item.quantity)
                WHERE id = recipe.ingredient_id;
            END LOOP;

            -- B. Replenish Modifier Ingredients
            IF item.modifiers IS NOT NULL AND jsonb_typeof(item.modifiers) = 'array' THEN
                FOR modifier IN SELECT * FROM jsonb_array_elements(item.modifiers)
                LOOP
                    BEGIN
                        mod_id := (modifier->>'id')::UUID;
                        mod_qty := COALESCE((modifier->>'quantity')::INT, 1);
                        IF mod_qty < 1 THEN mod_qty := 1; END IF;

                        FOR mod_recipe IN SELECT * FROM modifier_recipes WHERE modifier_id = mod_id LOOP
                            UPDATE ingredients 
                            SET stock = stock + (mod_recipe.quantity * mod_qty * item.quantity)
                            WHERE id = mod_recipe.ingredient_id;
                        END LOOP;
                    EXCEPTION WHEN OTHERS THEN
                         RAISE NOTICE 'Skipping malformed modifier restore: %', modifier;
                    END;
                END LOOP;
            END IF;

        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
