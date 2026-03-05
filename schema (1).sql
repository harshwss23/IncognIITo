-- ============================================
-- IncognIITo Database Schema
-- Pure SQL - Works on Linux, Mac, Windows
-- ============================================

-- STEP 1: Run this as postgres superuser to create DB and user
-- psql -U postgres -f setup_database.sql

CREATE DATABASE incogniito_db;
CREATE USER incogniito_user WITH ENCRYPTED PASSWORD 'CS253_69_7';
GRANT ALL PRIVILEGES ON DATABASE incogniito_db TO incogniito_user;

-- STEP 2: Connect to the database
-- \c incogniito_db

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO incogniito_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO incogniito_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO incogniito_user;

-- ============================================
-- STEP 3: Run this as incogniito_user to create tables
-- psql -U incogniito_user -d incogniito_db -f schema.sql
-- ============================================

-- USERS TABLE (no created_at/updated_at columns)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) DEFAULT '',
    verified BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_verified ON users(verified);

-- VERIFICATION TOKENS TABLE
CREATE TABLE verification_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    token_type VARCHAR(50) NOT NULL CHECK (token_type IN ('email_verify', 'password_reset')),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_verification_tokens_token ON verification_tokens(token);
CREATE INDEX idx_verification_tokens_user_id ON verification_tokens(user_id);
CREATE INDEX idx_verification_tokens_expires_at ON verification_tokens(expires_at);

-- SESSIONS TABLE
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_session_id ON sessions(session_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- USER PROFILES TABLE
CREATE TABLE user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interests TEXT[] DEFAULT '{}',
    avatar_url VARCHAR(500) DEFAULT '',
    total_chats INTEGER DEFAULT 0,
    total_reports INTEGER DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
    is_banned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);

-- ============================================
-- TRIGGERS AND FUNCTIONS
-- ============================================

-- Auto-update timestamp for user_profiles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger ONLY to user_profiles (users table has no updated_at)
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile when user registers
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_profile
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile();

-- Cleanup expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM verification_tokens
    WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM sessions
    WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- NEW POSTGRESQL SCHEMA ADDED

-- ============================================
-- TABLE 1: matchmaking_queue
-- Who is waiting to be matched RIGHT NOW
-- ============================================
CREATE TABLE matchmaking_queue (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'expired')),
    preferred_interests TEXT[] DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_queue_status ON matchmaking_queue(status);
CREATE INDEX idx_queue_joined_at ON matchmaking_queue(joined_at);

-- ============================================
-- TABLE 2: matchmaking_sessions
-- Permanent record of every pair ever matched
-- ============================================
CREATE TABLE matchmaking_sessions (
    id SERIAL PRIMARY KEY,
    user1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    match_score DECIMAL(5,2) DEFAULT 0,
    session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_end TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    room_id VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT no_self_match CHECK (user1_id != user2_id)
);

CREATE INDEX idx_sessions_status ON matchmaking_sessions(status);
CREATE INDEX idx_sessions_room_id ON matchmaking_sessions(room_id);
CREATE INDEX idx_sessions_user1 ON matchmaking_sessions(user1_id);
CREATE INDEX idx_sessions_user2 ON matchmaking_sessions(user2_id);

-- ============================================
-- TABLE 3: user_blocks
-- Prevent re-matching with blocked users
-- ============================================
CREATE TABLE user_blocks (
    id SERIAL PRIMARY KEY,
    blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT no_self_block CHECK (blocker_id != blocked_id),
    UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX idx_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON user_blocks(blocked_id);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Uncomment to verify setup:
-- \dt
-- \d users
-- \d user_profiles
-- \d verification_tokens
-- \d sessions
