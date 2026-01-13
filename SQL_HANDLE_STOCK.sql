-- Function to decrement stock when order is placed
CREATE OR REPLACE FUNCTION decrement_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if stock is tracked (not null)
    UPDATE products
    SET stock = stock - NEW.quantity
    WHERE id = NEW.product_id
      AND stock IS NOT NULL;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for INSERT on order_items
DROP TRIGGER IF EXISTS trigger_decrement_stock ON order_items;
CREATE TRIGGER trigger_decrement_stock
AFTER INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION decrement_stock_on_order();


-- Function to RESTORE stock when order item is deleted (cancelled/cleaned)
CREATE OR REPLACE FUNCTION restore_stock_on_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if stock is tracked (not null)
    UPDATE products
    SET stock = stock + OLD.quantity
    WHERE id = OLD.product_id
      AND stock IS NOT NULL;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger for DELETE on order_items
DROP TRIGGER IF EXISTS trigger_restore_stock ON order_items;
CREATE TRIGGER trigger_restore_stock
AFTER DELETE ON order_items
FOR EACH ROW
EXECUTE FUNCTION restore_stock_on_delete();
