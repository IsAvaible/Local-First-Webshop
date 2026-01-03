CREATE OR REPLACE FUNCTION notify_wishlist_price_drop() RETURNS TRIGGER AS
$$
DECLARE
    is_base_tier BOOLEAN;
    savings NUMERIC;
    product_name TEXT;
    target_group_key TEXT;
    notif_body TEXT;
BEGIN
    -- If NO row exists with the same product_id and a smaller quantity, this is the base tier.
    SELECT NOT EXISTS (
        SELECT 1
        FROM pricing_tiers
        WHERE product_id = NEW.product_id
          AND min_quantity < NEW.min_quantity
    ) INTO is_base_tier;

    -- Exit immediately if this isn't the base price tier or price didn't drop
    IF NOT is_base_tier OR NEW.price_per_unit >= OLD.price_per_unit THEN
        RETURN NEW;
    END IF;

    savings := OLD.price_per_unit - NEW.price_per_unit;

    SELECT name INTO product_name FROM products WHERE id = NEW.product_id;

    target_group_key := 'wishlist_price_drop_product_' || NEW.product_id;
    -- Hardcoded Euro symbol, no localization
    notif_body := product_name || ' from your wishlist is now cheaper: ' || NEW.price_per_unit || '€ (Saved ' || savings || '€)';

    -- Create CTE to find target users and update/insert notifications
    WITH target_users AS (
        -- Select users who need notifying
        SELECT w.user_id
        FROM wishlist w
                 JOIN user_settings us ON w.user_id = us.user_id
        WHERE w.product_id = NEW.product_id
          AND NEW.price_per_unit < w.price_snapshot -- Only if cheaper than snapshot
          AND us.notify_price_changes = TRUE
    ),
         updated_rows AS (
             -- Update existing UNSEEN notifications
             UPDATE notifications n
                 SET body = notif_body,
                     updated_at = NOW()
                 FROM target_users tu
                 WHERE n.user_id = tu.user_id
                     AND n.group_key = target_group_key
                     AND n.seen_at IS NULL
                 RETURNING n.user_id
         )
    -- Insert NEW notifications for users who were NOT updated
    INSERT INTO notifications (
        user_id, category, type, group_key, title, body,
        route, route_params, created_at, updated_at
    )
    SELECT
        tu.user_id,
        'inventory',
        'price_drop',
        target_group_key,
        'Price Drop Alert!',
        notif_body,
        '/products/[productId]',
        jsonb_build_object('productId', NEW.product_id),
        NOW(),
        NOW()
    FROM target_users tu
    WHERE tu.user_id NOT IN (SELECT user_id FROM updated_rows);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_price_drop
    AFTER UPDATE ON pricing_tiers
    FOR EACH ROW
EXECUTE FUNCTION notify_wishlist_price_drop();