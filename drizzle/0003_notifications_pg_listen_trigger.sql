-- =============================================================================
-- Migration: Add pg_notify trigger for real-time notifications
-- =============================================================================
-- Fires pg_notify('new_notification', '{"id":"<uuid>","user_id":"<uuid>"}')
-- after each INSERT on the notifications table.
--
-- Payload contains only {id, user_id} — well under the 8KB pg_notify limit.
-- The SSE client fetches full notification data from existing API routes.
--
-- EXCEPTION block makes this PGlite-safe (pg_notify is unsupported in PGlite).
-- =============================================================================

CREATE OR REPLACE FUNCTION notify_new_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  payload TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    BEGIN
      payload := json_build_object(
        'id',      NEW.id,
        'user_id', NEW.recipient_id
      )::TEXT;
      PERFORM pg_notify('new_notification', payload);
    EXCEPTION WHEN OTHERS THEN
      -- pg_notify is unsupported in PGlite/test environments; silently skip
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS trigger_notify_new_notification ON notifications;
--> statement-breakpoint

CREATE TRIGGER trigger_notify_new_notification
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_notification();
