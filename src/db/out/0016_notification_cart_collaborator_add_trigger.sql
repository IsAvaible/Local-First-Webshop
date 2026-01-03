CREATE OR REPLACE FUNCTION notify_new_collaborator() RETURNS TRIGGER AS
$$
DECLARE
    cart_name_val VARCHAR;
BEGIN
    -- Get Cart Name
    SELECT name INTO cart_name_val FROM carts WHERE id = NEW.cart_id;

    INSERT INTO notifications (user_id,
                               category,
                               type,
                               title,
                               body,
                               route,
                               route_params,
                               created_at)
    VALUES (NEW.user_id,
            'social',
            'cart_collaborator_add',
            'Shared Cart Invitation',
            'You have been added to the cart "' || cart_name_val || '"',
            '/cart/[cartId]',
            jsonb_build_object('cartId', NEW.cart_id),
            NOW());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cart_collaborator_added
    AFTER INSERT
    ON cart_collaborators
    FOR EACH ROW
EXECUTE FUNCTION notify_new_collaborator();