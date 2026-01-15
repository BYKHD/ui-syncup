-- Enable Realtime for notifications table
-- This allows Supabase Realtime to broadcast INSERT events to subscribed clients

-- Add the notifications table to the realtime publication
-- This enables real-time updates for the notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Set replica identity to FULL to include all column values in the replication stream
-- This is needed so clients receive the full notification data on INSERT
ALTER TABLE notifications REPLICA IDENTITY FULL;
