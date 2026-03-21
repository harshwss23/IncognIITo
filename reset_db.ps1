# setup-db.ps1

$PgUser = "postgres" # Change this if your local superuser is named differently

# Check for both standard and downloaded file names
$SqlFile = if (Test-Path ".\schema.sql") { ".\schema.sql" } 
           elseif (Test-Path ".\schema (4).sql") { ".\schema (4).sql" } 
           else { $null }

Clear-Host
Write-Host "Starting Database Setup for IncognIITo..." -ForegroundColor Cyan

# 1. Check if PostgreSQL (psql) is installed and in PATH
if (-Not (Get-Command psql -ErrorAction SilentlyContinue)) {
    Write-Host "`nError: 'psql' command not found!" -ForegroundColor Red
    Write-Host "Please ensure PostgreSQL is installed and its 'bin' folder is added to your system's PATH environment variable." -ForegroundColor Yellow
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit
}

# 2. Check if SQL file exists
if ($null -eq $SqlFile) {
    Write-Host "`nError: Schema file not found!" -ForegroundColor Red
    Write-Host "Please make sure 'schema.sql' (or 'schema (4).sql') is in the same folder as this script." -ForegroundColor Yellow
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit
}

Write-Host "Found schema file: $SqlFile" -ForegroundColor DarkGray

# 3. Prompt for PostgreSQL superuser password securely
Write-Host "`nWe need the password for the PostgreSQL superuser ($PgUser) to run the script." -ForegroundColor Yellow
$PgPassword = Read-Host "Enter Password" -AsSecureString

# Convert SecureString to Plain Text securely
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($PgPassword)
try {
    $UnsecurePassword = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($BSTR)
    
    # Set the password in the environment variable for psql
    $env:PGPASSWORD = $UnsecurePassword

    Write-Host "`nRunning database migrations from $SqlFile..." -ForegroundColor Cyan

    # 4. Execute the psql command
    # Your schema connects to 'postgres' first to create the db, then connects to 'incogniito_db' internally
    psql -U $PgUser -d postgres -f $SqlFile

    # 5. Check execution result
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nDatabase setup completed successfully!" -ForegroundColor Green
        Write-Host "Database 'incogniito_db' and user 'incogniito_user' are ready." -ForegroundColor Green
    } else {
        Write-Host "`nSomething went wrong! Please check the error messages above." -ForegroundColor Red
    }
}
finally {
    # Clean up environment variable and memory for security
    $env:PGPASSWORD = $null
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
}

Write-Host "`nPress any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")