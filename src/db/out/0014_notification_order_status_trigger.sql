CREATE OR REPLACE FUNCTION notify_order_status_update() RETURNS TRIGGER AS
$$
DECLARE
    notif_title        VARCHAR;
    notif_body         TEXT;
    notif_type         notification_type;
    user_wants_updates BOOLEAN;
BEGIN
    -- Check if the status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Check User Settings
        -- We select the preference. If no row exists, we default to TRUE
        SELECT notify_order_updates
        INTO user_wants_updates
        FROM user_settings
        WHERE user_id = NEW.user_id;

        -- Only proceed if user wants updates
        IF user_wants_updates THEN

            IF NEW.status = 'shipped' THEN
                notif_title := 'Order Shipped';
                notif_body := 'Your order #' || NEW.order_number || ' is on its way.';
                notif_type := 'shipment_dispatched';
            ELSIF NEW.status = 'delivered' THEN
                notif_title := 'Order Delivered';
                notif_body := 'Your order #' || NEW.order_number || ' has been delivered.';
                notif_type := 'shipment_delivered';
            ELSIF NEW.status = 'cancelled' THEN
                notif_title := 'Order Cancelled';
                notif_body := 'Your order #' || NEW.order_number || ' was cancelled.';
                notif_type := 'order_cancelled';
            END IF;

            -- Insert Notification
            IF notif_title IS NOT NULL THEN
                INSERT INTO notifications (user_id, category, type, title, body, route, route_params, created_at)
                VALUES (NEW.user_id,
                        'order',
                        notif_type,
                        notif_title,
                        notif_body,
                        '/orders/[orderId]',
                        jsonb_build_object('orderId', NEW.id),
                        NOW());
            END IF;

        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_order_status_update
    AFTER UPDATE ON orders
    FOR EACH ROW
EXECUTE FUNCTION notify_order_status_update();