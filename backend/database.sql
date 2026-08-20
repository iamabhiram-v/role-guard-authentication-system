-- ============================================================
-- RoleGuard - Complete PostgreSQL Database Schema
-- ============================================================
-- This schema matches the tables/columns used by the backend.
-- Designed for PostgreSQL 16 + Docker.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,

    password_hash TEXT NOT NULL,

    full_name VARCHAR(100),
    bio VARCHAR(500),
    avatar_url TEXT,
    phone VARCHAR(20),

    role VARCHAR(20) NOT NULL DEFAULT 'user'
        CHECK (role IN ('admin', 'manager', 'user')),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    last_login TIMESTAMP,

    -- Two-factor authentication
    two_fa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    otp_code_hash TEXT,
    otp_expires_at TIMESTAMP,

    -- Notification master switch
    notifications_muted BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Existing database compatibility
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS two_fa_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS otp_code_hash TEXT;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS notifications_muted BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_email
    ON users(email);

CREATE INDEX IF NOT EXISTS idx_users_username
    ON users(username);

CREATE INDEX IF NOT EXISTS idx_users_role
    ON users(role);

CREATE INDEX IF NOT EXISTS idx_users_is_active
    ON users(is_active);


-- ============================================================
-- TOKEN BLACKLIST
-- ============================================================

CREATE TABLE IF NOT EXISTS token_blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    token TEXT NOT NULL UNIQUE,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    expires_at TIMESTAMP NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires_at
    ON token_blacklist(expires_at);

CREATE INDEX IF NOT EXISTS idx_token_blacklist_user_id
    ON token_blacklist(user_id);


-- ============================================================
-- AUTHENTICATION LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS auth_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    action VARCHAR(50) NOT NULL,

    ip_address INET,

    user_agent TEXT,

    success BOOLEAN NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id
    ON auth_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_auth_logs_created_at
    ON auth_logs(created_at);


-- ============================================================
-- ACCOUNT DELETIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS account_deletions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL,

    email VARCHAR(255) NOT NULL,

    deleted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_account_deletions_email
    ON account_deletions(email);

CREATE INDEX IF NOT EXISTS idx_account_deletions_user_id
    ON account_deletions(user_id);


-- ============================================================
-- WORKER HEARTBEAT
-- ============================================================

CREATE TABLE IF NOT EXISTS worker_heartbeat (
    id INTEGER PRIMARY KEY,

    last_poll_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    is_paused BOOLEAN NOT NULL DEFAULT FALSE,

    paused_by UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    paused_at TIMESTAMP
);

ALTER TABLE worker_heartbeat
    ADD COLUMN IF NOT EXISTS is_paused BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE worker_heartbeat
    ADD COLUMN IF NOT EXISTS paused_by UUID
        REFERENCES users(id)
        ON DELETE SET NULL;

ALTER TABLE worker_heartbeat
    ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_worker_heartbeat_last_poll_at
    ON worker_heartbeat(last_poll_at);

INSERT INTO worker_heartbeat (
    id,
    last_poll_at,
    is_paused
)
VALUES (
    1,
    NOW(),
    FALSE
)
ON CONFLICT (id)
DO UPDATE SET
    last_poll_at = NOW();


-- ============================================================
-- JOBS
-- BullMQ/PostgreSQL job history
-- ============================================================

CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    type VARCHAR(50) NOT NULL
        CHECK (type IN ('email', 'notification', 'sms')),

    payload JSONB NOT NULL DEFAULT '{}'::jsonb,

    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'processing',
                'completed',
                'failed'
            )
        ),

    attempts INTEGER NOT NULL DEFAULT 0
        CHECK (attempts >= 0),

    max_attempts INTEGER NOT NULL DEFAULT 3
        CHECK (max_attempts > 0),

    error TEXT,

    scheduled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    started_at TIMESTAMP,

    completed_at TIMESTAMP,

    created_by UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    is_held BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS is_held BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS created_by UUID
        REFERENCES users(id)
        ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_status
    ON jobs(status);

CREATE INDEX IF NOT EXISTS idx_jobs_type
    ON jobs(type);

CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_at
    ON jobs(scheduled_at);

CREATE INDEX IF NOT EXISTS idx_jobs_created_at
    ON jobs(created_at);

CREATE INDEX IF NOT EXISTS idx_jobs_completed_at
    ON jobs(completed_at);

CREATE INDEX IF NOT EXISTS idx_jobs_status_scheduled
    ON jobs(status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_jobs_created_by
    ON jobs(created_by);


-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    title VARCHAR(255) NOT NULL,

    message TEXT,

    category VARCHAR(50) NOT NULL DEFAULT 'general',

    type VARCHAR(50),

    is_read BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    read_at TIMESTAMP
);

ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS category VARCHAR(50);

ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS type VARCHAR(50);

ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id
    ON notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_is_read
    ON notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
    ON notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read
    ON notifications(user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
    ON notifications(user_id, created_at DESC);


-- ============================================================
-- NOTIFICATION PREFERENCES
-- IMPORTANT:
-- Backend expects:
-- email_enabled
-- in_app_enabled
-- sms_enabled
-- ============================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    category VARCHAR(50) NOT NULL,

    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,

    in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,

    sms_enabled BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, category)
);


-- ============================================================
-- Repair old notification_preferences column names
-- ============================================================

DO $$
BEGIN

    -- email -> email_enabled
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'notification_preferences'
          AND column_name = 'email'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'notification_preferences'
          AND column_name = 'email_enabled'
    )
    THEN
        ALTER TABLE notification_preferences
            RENAME COLUMN email TO email_enabled;
    END IF;


    -- in_app -> in_app_enabled
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'notification_preferences'
          AND column_name = 'in_app'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'notification_preferences'
          AND column_name = 'in_app_enabled'
    )
    THEN
        ALTER TABLE notification_preferences
            RENAME COLUMN in_app TO in_app_enabled;
    END IF;


    -- push -> sms_enabled
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'notification_preferences'
          AND column_name = 'push'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'notification_preferences'
          AND column_name = 'sms_enabled'
    )
    THEN
        ALTER TABLE notification_preferences
            RENAME COLUMN push TO sms_enabled;
    END IF;

END
$$;


ALTER TABLE notification_preferences
    ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE notification_preferences
    ADD COLUMN IF NOT EXISTS in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE notification_preferences
    ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id
    ON notification_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_category
    ON notification_preferences(category);


-- ============================================================
-- NOTIFICATION MUTE
-- ============================================================

CREATE TABLE IF NOT EXISTS notification_mute (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    category VARCHAR(50),

    muted_until TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_mute_user_id
    ON notification_mute(user_id);


-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    title VARCHAR(255) NOT NULL,

    message TEXT NOT NULL,

    created_by UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE announcements
    ADD COLUMN IF NOT EXISTS created_by UUID
        REFERENCES users(id)
        ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_announcements_active
    ON announcements(is_active);

CREATE INDEX IF NOT EXISTS idx_announcements_created_at
    ON announcements(created_at);

CREATE INDEX IF NOT EXISTS idx_announcements_created_by
    ON announcements(created_by);


-- ============================================================
-- ANNOUNCEMENT DISMISSALS
-- ============================================================

CREATE TABLE IF NOT EXISTS announcement_dismissals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    announcement_id UUID NOT NULL
        REFERENCES announcements(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    dismissed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_announcement_dismissals_announcement
    ON announcement_dismissals(announcement_id);

CREATE INDEX IF NOT EXISTS idx_announcement_dismissals_user
    ON announcement_dismissals(user_id);


-- ============================================================
-- PUSH SUBSCRIPTIONS
-- Backend expects p256dh_key + auth_key
-- ============================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    endpoint TEXT NOT NULL,

    p256dh_key TEXT,

    auth_key TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, endpoint)
);


-- ============================================================
-- Repair old push subscription column names
-- ============================================================

DO $$
BEGIN

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'push_subscriptions'
          AND column_name = 'p256dh'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'push_subscriptions'
          AND column_name = 'p256dh_key'
    )
    THEN
        ALTER TABLE push_subscriptions
            RENAME COLUMN p256dh TO p256dh_key;
    END IF;


    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'push_subscriptions'
          AND column_name = 'auth'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'push_subscriptions'
          AND column_name = 'auth_key'
    )
    THEN
        ALTER TABLE push_subscriptions
            RENAME COLUMN auth TO auth_key;
    END IF;

END
$$;


ALTER TABLE push_subscriptions
    ADD COLUMN IF NOT EXISTS p256dh_key TEXT;

ALTER TABLE push_subscriptions
    ADD COLUMN IF NOT EXISTS auth_key TEXT;

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
    ON push_subscriptions(user_id);


-- ============================================================
-- WORKSPACES
-- ============================================================

CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(150) NOT NULL,

    slug VARCHAR(100) NOT NULL UNIQUE,

    description TEXT,

    owner_id UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id
    ON workspaces(owner_id);

CREATE INDEX IF NOT EXISTS idx_workspaces_created_at
    ON workspaces(created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_slug
    ON workspaces(slug);


-- ============================================================
-- WORKSPACE MEMBERS
-- ============================================================

CREATE TABLE IF NOT EXISTS workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workspace_id UUID NOT NULL
        REFERENCES workspaces(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    role VARCHAR(20) NOT NULL
        CHECK (role IN ('owner', 'admin', 'member')),

    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace
    ON workspace_members(workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user
    ON workspace_members(user_id);

CREATE INDEX IF NOT EXISTS idx_workspace_members_role
    ON workspace_members(role);


-- ============================================================
-- WORKSPACE INVITES
-- ============================================================

CREATE TABLE IF NOT EXISTS workspace_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workspace_id UUID NOT NULL
        REFERENCES workspaces(id)
        ON DELETE CASCADE,

    email VARCHAR(255) NOT NULL,

    role VARCHAR(20) NOT NULL
        CHECK (role IN ('admin', 'member')),

    invited_by UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    token TEXT NOT NULL UNIQUE,

    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'accepted',
                'revoked',
                'expired',
                'declined'
            )
        ),

    expires_at TIMESTAMP NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workspace_invites_workspace
    ON workspace_invites(workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_invites_email
    ON workspace_invites(email);

CREATE INDEX IF NOT EXISTS idx_workspace_invites_status
    ON workspace_invites(status);

CREATE INDEX IF NOT EXISTS idx_workspace_invites_expires
    ON workspace_invites(expires_at);

CREATE INDEX IF NOT EXISTS idx_workspace_invites_invited_by
    ON workspace_invites(invited_by);


-- ============================================================
-- FINAL DATA / DEFAULTS
-- ============================================================

INSERT INTO worker_heartbeat (
    id,
    last_poll_at,
    is_paused
)
VALUES (
    1,
    NOW(),
    FALSE
)
ON CONFLICT (id)
DO NOTHING;


-- ============================================================
-- SCHEMA VERIFICATION
-- ============================================================

-- Expected application tables:
--
-- users
-- token_blacklist
-- auth_logs
-- account_deletions
-- worker_heartbeat
-- jobs
-- notifications
-- notification_preferences
-- notification_mute
-- announcements
-- announcement_dismissals
-- push_subscriptions
-- workspaces
-- workspace_members
-- workspace_invites
--
-- ============================================================
-- END
-- ============================================================