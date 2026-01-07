CREATE OR REPLACE FUNCTION notify_new_collaborator() RETURNS TRIGGER AS
$$
DECLARE
    cart_name_val VARCHAR;
    cart_creator_id VARCHAR;
BEGIN
    -- Get Cart Name and Creator ID
    SELECT name, created_by_id
    INTO cart_name_val, cart_creator_id
    FROM carts
    WHERE id = NEW.cart_id;

    -- Only send notification if the new collaborator is NOT the cart owner (no self-notifications)
    IF cart_creator_id IS DISTINCT FROM NEW.user_id THEN
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
                '/cart/$cartId',
                jsonb_build_object('cartId', NEW.cart_id),
                NOW());
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;