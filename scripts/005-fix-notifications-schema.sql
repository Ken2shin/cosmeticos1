-- Fix missing user_type column in notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_type VARCHAR(50) DEFAULT 'customer';

-- Update existing notifications to have a default user_type
UPDATE notifications SET user_type = 'customer' WHERE user_type IS NULL;
