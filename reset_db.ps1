# setup-db.ps1

$SqlFile = ".\schema.sql"
$PgUser = "postgres" # Tumhara main superuser yahan daalo agar alag hai

Clear-Host
Write-Host "🚀 Starting Database Setup for IncognIITo..." -ForegroundColor Cyan

# Check if SQL file exists
if (-Not (Test-Path $SqlFile)) {
    Write-Host "❌ Error: '$SqlFile' not found in the current directory!" -ForegroundColor Red
    Write-Host "Please make sure setup-db.ps1 and schema.sql are in the same folder." -ForegroundColor Yellow
    exit
}

# Prompt for PostgreSQL superuser password securely
Write-Host "🔑 We need the password for the PostgreSQL superuser ($PgUser) to run the script." -ForegroundColor Yellow
$PgPassword = Read-Host "Enter Password" -AsSecureString

# Convert SecureString to Plain Text to pass to psql environment variable
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($PgPassword)
$UnsecurePassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# Set the password in the environment variable so psql doesn't prompt you again mid-script
$env:PGPASSWORD = $UnsecurePassword

Write-Host "`n⏳ Running database migrations from schema.sql..." -ForegroundColor Cyan

# Execute the psql command
psql -U $PgUser -d postgres -f $SqlFile

# Check if the command was successful
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Database setup completed successfully!" -ForegroundColor Green
    Write-Host "👉 Database 'incogniito_db' and user 'incogniito_user' are ready." -ForegroundColor Green
} else {
    Write-Host "`n❌ Something went wrong! Please check the error messages above." -ForegroundColor Red
    Write-Host "Make sure PostgreSQL is installed and added to your system PATH." -ForegroundColor Yellow
}

# Clean up the environment variable for security
$env:PGPASSWORD = $null

Write-Host "`nPress any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")