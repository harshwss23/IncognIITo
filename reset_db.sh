#!/bin/bash

# ==============================================================================
# FILE: reset_db.sh
# PURPOSE: Development utility script to completely wipe and recreate the 
#          PostgreSQL database schema and dedicated user for IncognIITo.
# WARNING: This performs destructive DROP operations. Use only in local dev!
# ==============================================================================

# Exit immediately if any critical pipeline command fails
set -e

# ------------------------------------------------------------------------------
# Phase 1: Wipe Existing Data
# ------------------------------------------------------------------------------
echo "🧹 Dropping existing database and user (wiping the slate clean)..."

# Step-by-step: Force drop the database to kick out any lingering open connections.
# Connecting as default 'postgres' superuser to execute the command.
psql -U postgres -c "DROP DATABASE IF EXISTS incogniito_db WITH (FORCE);"

# Step-by-step: Once the database constraints are removed, it is safe to drop the user.
psql -U postgres -c "DROP USER IF EXISTS incogniito_user;"

# ------------------------------------------------------------------------------
# Phase 2: Provision New Infrastructure
# ------------------------------------------------------------------------------
echo "🌱 Recreating user and database..."

# Step-by-step: Recreate the dedicated application user and set the default password.
psql -U postgres -c "CREATE USER incogniito_user WITH ENCRYPTED PASSWORD 'CS253_69_7';"

# Step-by-step: Recreate the database and assign ownership immediately to the new user.
psql -U postgres -c "CREATE DATABASE incogniito_db OWNER incogniito_user;"

# ------------------------------------------------------------------------------
# Phase 3: Apply Granular Permissions
# ------------------------------------------------------------------------------
echo "🔑 Granting schema privileges..."

# Step-by-step: Ensure the dedicated user has absolute control over the public schema,
# granting permissions for tables and auto-incrementing sequences.
psql -U postgres -d incogniito_db -c "
GRANT ALL ON SCHEMA public TO incogniito_user; 
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO incogniito_user; 
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO incogniito_user;"

# ------------------------------------------------------------------------------
# Phase 4: Schema Seeding
# ------------------------------------------------------------------------------
echo "🏗️ Applying new schema..."

# Step-by-step: Execute the schema.sql script acting natively as the new user 
# on the newly created database to build the tables.
psql -U incogniito_user -d incogniito_db -f schema.sql

echo "✅ Clean reset complete! Zero errors."