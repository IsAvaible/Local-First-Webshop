CREATE OR REPLACE FUNCTION notify_security_alert() RETURNS TRIGGER AS
$$
BEGIN
    INSERT INTO notifications (user_id,
                               category,
                               type,
                               title,
                               body,
                               created_at)
    VALUES (NEW.user_id,
            'account',
            'password_changed',
            'Security Alert',
            'Your password was just changed. If this wasn''t you, contact support immediately.',
            NOW());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER trigger_security_password_change
    AFTER UPDATE
    ON accounts
    FOR EACH ROW
    WHEN (OLD.password IS DISTINCT FROM NEW.password)
EXECUTE FUNCTION notify_security_alert();