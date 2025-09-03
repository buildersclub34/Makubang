-- Add new columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_failed_login TIMESTAMP WITH TIME ZONE;

-- Add index for better performance on login attempts
CREATE INDEX IF NOT EXISTS idx_users_email_login_attempts ON users(email, failed_login_attempts);

-- Add comment for the new columns
COMMENT ON COLUMN users.failed_login_attempts IS 'Number of consecutive failed login attempts';
COMMENT ON COLUMN users.last_failed_login IS 'Timestamp of the last failed login attempt';

-- Update existing users to have default values
UPDATE users SET 
  failed_login_attempts = COALESCE(failed_login_attempts, 0),
  last_failed_login = NULL
WHERE failed_login_attempts IS NULL;
