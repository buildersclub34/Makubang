
-- Drop existing tables if they exist
DROP TABLE IF EXISTS content_moderation_reports CASCADE;
DROP TABLE IF EXISTS video_likes CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;
DROP TABLE IF EXISTS restaurant_subscriptions CASCADE;
DROP TABLE IF EXISTS email_verifications CASCADE;
DROP TABLE IF EXISTS password_reset_tokens CASCADE;

-- Create enum types
DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('razorpay', 'cod', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password text,
ADD COLUMN IF NOT EXISTS fcm_token text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS profile_picture text,
ADD COLUMN IF NOT EXISTS date_of_birth timestamp;

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id text PRIMARY KEY,
    order_id text NOT NULL,
    user_id text NOT NULL REFERENCES users(id),
    amount decimal(10,2) NOT NULL,
    currency text DEFAULT 'INR',
    status payment_status DEFAULT 'pending',
    payment_method payment_method NOT NULL,
    external_payment_id text,
    metadata jsonb,
    created_at timestamp NOT NULL,
    updated_at timestamp
);

CREATE INDEX IF NOT EXISTS payments_order_id_idx ON payments(order_id);
CREATE INDEX IF NOT EXISTS payments_user_id_idx ON payments(user_id);

-- Create subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
    id text PRIMARY KEY,
    name text NOT NULL,
    description text,
    price decimal(10,2) NOT NULL,
    currency text DEFAULT 'INR',
    duration_days integer NOT NULL,
    max_orders integer,
    features jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp NOT NULL,
    updated_at timestamp
);

-- Create restaurant subscriptions table
CREATE TABLE IF NOT EXISTS restaurant_subscriptions (
    id text PRIMARY KEY,
    restaurant_id text NOT NULL REFERENCES restaurants(id),
    plan_id text NOT NULL REFERENCES subscription_plans(id),
    status text NOT NULL DEFAULT 'active',
    start_date timestamp NOT NULL,
    end_date timestamp NOT NULL,
    payment_id text REFERENCES payments(id),
    order_limit integer,
    order_count integer DEFAULT 0,
    metadata jsonb,
    created_at timestamp NOT NULL,
    updated_at timestamp
);

CREATE INDEX IF NOT EXISTS restaurant_subscriptions_restaurant_id_idx ON restaurant_subscriptions(restaurant_id);
CREATE INDEX IF NOT EXISTS restaurant_subscriptions_plan_id_idx ON restaurant_subscriptions(plan_id);

-- Create email verifications table
CREATE TABLE IF NOT EXISTS email_verifications (
    id text PRIMARY KEY,
    email text NOT NULL,
    token text NOT NULL,
    expires_at timestamp NOT NULL,
    created_at timestamp NOT NULL DEFAULT NOW(),
    updated_at timestamp
);

CREATE INDEX IF NOT EXISTS email_verifications_email_idx ON email_verifications(email);
CREATE INDEX IF NOT EXISTS email_verifications_token_idx ON email_verifications(token);

-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id text PRIMARY KEY,
    email text NOT NULL,
    token text NOT NULL,
    expires_at timestamp NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp NOT NULL DEFAULT NOW(),
    updated_at timestamp
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_email_idx ON password_reset_tokens(email);
CREATE INDEX IF NOT EXISTS password_reset_tokens_token_idx ON password_reset_tokens(token);

-- Create content moderation reports table
CREATE TABLE IF NOT EXISTS content_moderation_reports (
    id text PRIMARY KEY,
    content_type text NOT NULL,
    content_id text NOT NULL,
    reporter_id text REFERENCES users(id),
    reason text NOT NULL,
    description text,
    status text DEFAULT 'pending',
    moderator_id text REFERENCES users(id),
    moderator_notes text,
    auto_flagged boolean DEFAULT false,
    severity text DEFAULT 'medium',
    metadata jsonb,
    created_at timestamp NOT NULL,
    updated_at timestamp
);

CREATE INDEX IF NOT EXISTS content_moderation_content_type_idx ON content_moderation_reports(content_type);
CREATE INDEX IF NOT EXISTS content_moderation_status_idx ON content_moderation_reports(status);
CREATE INDEX IF NOT EXISTS content_moderation_reporter_idx ON content_moderation_reports(reporter_id);

-- Create video likes table
CREATE TABLE IF NOT EXISTS video_likes (
    id text PRIMARY KEY,
    video_id text NOT NULL REFERENCES videos(id),
    user_id text NOT NULL REFERENCES users(id),
    created_at timestamp NOT NULL,
    UNIQUE(video_id, user_id)
);

CREATE INDEX IF NOT EXISTS video_likes_video_user_idx ON video_likes(video_id, user_id);

-- Update existing tables with new columns
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS like_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS share_count integer DEFAULT 0;

ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS cuisine text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS image text;

-- Insert default subscription plans
INSERT INTO subscription_plans (id, name, description, price, duration_days, max_orders, features, created_at) 
VALUES 
    ('starter', 'Starter Plan', 'Perfect for small restaurants starting out', 1000.00, 30, 20, '["Basic analytics", "Video uploads", "Order management"]', NOW()),
    ('pro', 'Pro Plan', 'Great for growing restaurants', 3000.00, 30, 80, '["Advanced analytics", "Unlimited videos", "Priority support", "Custom branding"]', NOW()),
    ('unlimited', 'Unlimited Plan', 'For high-volume restaurants', 5000.00, 30, NULL, '["All Pro features", "Unlimited orders", "API access", "Dedicated support"]', NOW())
ON CONFLICT (id) DO NOTHING;
