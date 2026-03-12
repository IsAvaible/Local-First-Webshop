CREATE OR REPLACE FUNCTION update_product_stock()
    RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE products
        SET stock_sum = stock_sum + NEW.quantity_change
        WHERE id = NEW.product_id;
        RETURN NEW;

    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE products
        SET stock_sum = stock_sum - OLD.quantity_change
        WHERE id = OLD.product_id;
        RETURN OLD;

    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE products
        SET stock_sum = stock_sum - OLD.quantity_change + NEW.quantity_change
        WHERE id = NEW.product_id;
        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Attach the trigger to the inventory_ledger table
CREATE OR REPLACE TRIGGER inventory_ledger_stock_trigger
    AFTER INSERT OR UPDATE OR DELETE ON inventory_ledger
    FOR EACH ROW
EXECUTE FUNCTION update_product_stock();