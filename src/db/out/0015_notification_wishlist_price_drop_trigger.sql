CREATE OR REPLACE FUNCTION notify_wishlist_price_drop() RETURNS TRIGGER AS
$$
DECLARE
    is_base_tier BOOLEAN;
    savings NUMERIC;
    drop_percentage NUMERIC;
    product_name TEXT;
    target_group_key TEXT;
    notif_body TEXT;
    currency_symbol TEXT := '€';

    -- CONFIGURATION THRESHOLDS
    min_drop_percent CONSTANT NUMERIC := 0.05; -- 5% drop required
    min_drop_absolute CONSTANT NUMERIC := 2.00; -- OR a 2.00 drop required
BEGIN
    -- 1. BASE TIER CHECK
    SELECT NOT EXISTS (
        SELECT 1 FROM pricing_tiers
        WHERE product_id = NEW.product_id AND min_quantity < NEW.min_quantity
    ) INTO is_base_tier;

    IF NOT is_base_tier OR NEW.price_per_unit = OLD.price_per_unit THEN
        RETURN NEW;
    END IF;

    target_group_key := 'wishlist_price_drop_product_' || NEW.product_id;

    -- 2. BRANCH A: Price DROP Logic (Insert/Update)
    IF NEW.price_per_unit < OLD.price_per_unit THEN

        savings := OLD.price_per_unit - NEW.price_per_unit;
        drop_percentage := savings / OLD.price_per_unit;

        -- Significance Check
        IF drop_percentage >= min_drop_percent OR savings >= min_drop_absolute THEN

            SELECT name INTO product_name FROM products WHERE id = NEW.product_id;

            notif_body := format(
                    '%s is now cheaper: %s%s',
                    product_name, NEW.price_per_unit, currency_symbol
                          );

            WITH target_users AS (
                SELECT w.user_id
                FROM wishlist w
                         JOIN user_settings us ON w.user_id = us.user_id
                WHERE w.product_id = NEW.product_id
                  AND NEW.price_per_unit < w.price_snapshot
                  AND us.notify_price_changes = TRUE
            ),
                 existing_unseen AS (
                     SELECT n.id, n.user_id
                     FROM notifications n
                              JOIN target_users tu ON n.user_id = tu.user_id
                     WHERE n.group_key = target_group_key
                       AND n.seen_at IS NULL
                 ),
                 update_result AS (
                     UPDATE notifications n
                         SET body = notif_body,
                             updated_at = NOW(),
                             -- Reset expired flag if it was previously expired
                             title = 'Price Drop Alert!',
                             route_params = jsonb_build_object('productId', NEW.product_id)
                         FROM existing_unseen eu
                         WHERE n.id = eu.id
                         RETURNING n.user_id
                 )
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
                '/products/$productId',
                jsonb_build_object('productId', NEW.product_id),
                NOW(),
                NOW()
            FROM target_users tu
            WHERE tu.user_id NOT IN (SELECT user_id FROM update_result);

        END IF;

    -- 3. BRANCH B: Price RISE Logic (Cleanup & Expiry)
    ELSIF NEW.price_per_unit > OLD.price_per_unit THEN

        -- A. Delete UNSEEN notifications
        DELETE FROM notifications
        WHERE group_key = target_group_key
          AND seen_at IS NULL;

        -- B. Mark SEEN notifications as EXPIRED
        UPDATE notifications
        SET
            -- Append (Expired) only if it's not already there
            title = CASE
                        WHEN title LIKE '%(Expired)' THEN title
                        ELSE title || ' (Expired)'
                END,
            updated_at = NOW(),
            read_at = NOW()
        WHERE group_key = target_group_key
          AND seen_at IS NOT NULL;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_price_drop
    AFTER UPDATE ON pricing_tiers
    FOR EACH ROW
EXECUTE FUNCTION notify_wishlist_price_drop();