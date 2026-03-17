Write-Host "Dropping existing database..." -ForegroundColor Yellow
& psql -U postgres -c "DROP DATABASE IF EXISTS incogniito_db WITH (FORCE);"

Write-Host "Updating user password and recreating database..." -ForegroundColor Yellow
# Delete karne ke bajaye, existing user ka password update kar rahe hain
& psql -U postgres -c "ALTER USER incogniito_user WITH ENCRYPTED PASSWORD 'CS253_69_7';"
& psql -U postgres -c "CREATE DATABASE incogniito_db OWNER incogniito_user;"

Write-Host "Granting schema privileges..." -ForegroundColor Yellow
& psql -U postgres -d incogniito_db -c "GRANT ALL ON SCHEMA public TO incogniito_user; GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO incogniito_user; GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO incogniito_user;"

Write-Host "Applying new schema..." -ForegroundColor Yellow
# Yeh temporary environment variable tumhe aakhri step mein password type karne se bacha lega
$env:PGPASSWORD="CS253_69_7"
& psql -U incogniito_user -d incogniito_db -f schema.sql
$env:PGPASSWORD=""

Write-Host "Clean reset complete! Database is ready." -ForegroundColor Green