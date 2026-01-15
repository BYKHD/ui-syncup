-- Enable Realtime for notifications table
-- This allows Supabase Realtime to broadcast INSERT events to subscribed clients

-- Add the notifications table to the realtime publication (idempotent)
-- Only add if not already in publication to prevent errors on re-run
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;

-- Set replica identity to FULL to include all column values in the replication stream
-- This is needed so clients receive the full notification data on INSERT
-- Note: This command is already idempotent (safe to run multiple times)
ALTER TABLE notifications REPLICA IDENTITY FULL;
