#!/bin/bash

# Exit immediately if a critical command fails
set -e

echo "🧹 Dropping existing database and user (wiping the slate clean)..."
# WITH (FORCE) kicks out any lingering connections
psql -U postgres -c "DROP DATABASE IF EXISTS incogniito_db WITH (FORCE);"

# Now that the DB is gone, we can safely drop the user
psql -U postgres -c "DROP USER IF EXISTS incogniito_user;"

echo "🌱 Recreating user and database..."
psql -U postgres -c "CREATE USER incogniito_user WITH ENCRYPTED PASSWORD 'CS253_69_7';"
psql -U postgres -c "CREATE DATABASE incogniito_db OWNER incogniito_user;"

echo "🔑 Granting schema privileges..."
psql -U postgres -d incogniito_db -c "
GRANT ALL ON SCHEMA public TO incogniito_user; 
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO incogniito_user; 
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO incogniito_user;"

echo "🏗️ Applying new schema..."
psql -U incogniito_user -d incogniito_db -f schema.sql

echo "✅ Clean reset complete! Zero errors."