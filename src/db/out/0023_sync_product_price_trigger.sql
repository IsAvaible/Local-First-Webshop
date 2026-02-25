-- Create the function that calculates and updates the denormalized price
CREATE OR REPLACE FUNCTION update_product_base_price()
    RETURNS TRIGGER AS
$$
BEGIN
    -- Applies to INSERT and UPDATE
    IF (TG_OP IN ('INSERT', 'UPDATE')) THEN
        UPDATE products
        SET base_price = (SELECT price_per_unit
                          FROM pricing_tiers
                          WHERE product_id = NEW.product_id
                          ORDER BY min_quantity
                          LIMIT 1)
        WHERE id = NEW.product_id;
    END IF;

    -- Applies to DELETE, and UPDATEs that shift the product_id
    IF (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.product_id IS DISTINCT FROM NEW.product_id)) THEN
        UPDATE products
        SET base_price = (SELECT price_per_unit
                          FROM pricing_tiers
                          WHERE product_id = OLD.product_id
                          ORDER BY min_quantity
                          LIMIT 1)
        WHERE id = OLD.product_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on the pricing_tiers table
DROP TRIGGER IF EXISTS sync_product_base_price ON pricing_tiers;

CREATE TRIGGER sync_product_base_price
    AFTER INSERT OR DELETE OR UPDATE OF product_id, price_per_unit, min_quantity
    ON pricing_tiers
    FOR EACH ROW
EXECUTE FUNCTION update_product_base_price();

-- Initial synchronization of base_price for all products
UPDATE products p
SET base_price = (SELECT price_per_unit
                  FROM pricing_tiers pt
                  WHERE pt.product_id = p.id
                  ORDER BY min_quantity
                  LIMIT 1);