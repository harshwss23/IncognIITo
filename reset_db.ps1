# ==============================================================================
# FILE: reset_db.ps1 (setup-db.ps1)
# PURPOSE: PowerShell development utility script to completely reset the 
#          PostgreSQL database structure via standard schemas.
# ==============================================================================

$PgUser = "postgres" # Change this if your local superuser is named differently

# ------------------------------------------------------------------------------
# Phase 1: Schema File Detection
# ------------------------------------------------------------------------------
# Check for both standard and downloaded typical file names gracefully
$SqlFile = if (Test-Path ".\schema.sql") { ".\schema.sql" } 
           elseif (Test-Path ".\schema (4).sql") { ".\schema (4).sql" } 
           else { $null }

Clear-Host
Write-Host "Starting Database Setup for IncognIITo..." -ForegroundColor Cyan

# ------------------------------------------------------------------------------
# Phase 2: Environment Pre-Checks
# ------------------------------------------------------------------------------

# Step-by-step: Verify if the 'psql' binary is resolvable within the system PATH.
# Fails securely with clear instructions if missing to prevent cascade failures.
if (-Not (Get-Command psql -ErrorAction SilentlyContinue)) {
    Write-Host "`nError: 'psql' command not found!" -ForegroundColor Red
    Write-Host "Please ensure PostgreSQL is installed and its 'bin' folder is added to your system's PATH environment variable." -ForegroundColor Yellow
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit
}

# Step-by-step: Halt execution if no fallback matching schema file was located.
if ($null -eq $SqlFile) {
    Write-Host "`nError: Schema file not found!" -ForegroundColor Red
    Write-Host "Please make sure 'schema.sql' (or 'schema (4).sql') is in the same folder as this script." -ForegroundColor Yellow
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit
}

Write-Host "Found schema file: $SqlFile" -ForegroundColor DarkGray

# ------------------------------------------------------------------------------
# Phase 3: Secure Superuser Authentication
# ------------------------------------------------------------------------------

# Step-by-step: Prompt for PostgreSQL superuser password seamlessly instead of 
# hardcoding sensitive master passwords in plaintext.
Write-Host "`nWe need the password for the PostgreSQL superuser ($PgUser) to run the script." -ForegroundColor Yellow
$PgPassword = Read-Host "Enter Password" -AsSecureString

# Step-by-step: Extract SecureString to Plain Text to pass to Postgres securely 
# purely residing in memory.
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($PgPassword)
try {
    $UnsecurePassword = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($BSTR)
    
    # Set the password in the local environment variable strictly for psql access
    $env:PGPASSWORD = $UnsecurePassword

    Write-Host "`nRunning database migrations from $SqlFile..." -ForegroundColor Cyan

    # --------------------------------------------------------------------------
    # Phase 4: Schema Execution
    # --------------------------------------------------------------------------
    # Executing the schema which inherently connects to 'postgres' first to create 
    # the new DB, then connects to 'incogniito_db' internally for the table logic.
    psql -U $PgUser -d postgres -f $SqlFile

    # Step-by-step: Check the execution exit code of psql to render success metric.
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nDatabase setup completed successfully!" -ForegroundColor Green
        Write-Host "Database 'incogniito_db' and user 'incogniito_user' are ready." -ForegroundColor Green
    } else {
        Write-Host "`nSomething went wrong! Please check the error messages above." -ForegroundColor Red
    }
}
finally {
    # --------------------------------------------------------------------------
    # Phase 5: Security Tear Down
    # --------------------------------------------------------------------------
    # Step-by-step: Scrub out environment variable and free the assigned memory
    # securely so passwords don't leak into ongoing shell processes.
    $env:PGPASSWORD = $null
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
}

Write-Host "`nPress any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")