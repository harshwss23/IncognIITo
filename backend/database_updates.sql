-- Add columns to chats table for per-user chat clearing
ALTER TABLE chats ADD COLUMN IF NOT EXISTS user1_cleared_at TIMESTAMP;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS user2_cleared_at TIMESTAMP;
