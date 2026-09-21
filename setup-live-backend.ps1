param(
    [string]$SupabaseUrl = "",
    [string]$AnonKey = ""
)

$ErrorActionPreference = "Stop"
$Repo = "Donacgreece/World_Mood"
$Source = Split-Path -Parent $MyInvocation.MyCommand.Path
$Schema = Join-Path $Source "supabase\schema.sql"

Write-Host ""
Write-Host "Moodaro v0.0.4 live backend setup" -ForegroundColor Cyan
Write-Host "Real shared data through Supabase" -ForegroundColor DarkGray
Write-Host ""

$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "GitHub CLI is missing. Installing with winget..." -ForegroundColor Yellow
    winget install --id GitHub.cli -e --source winget --accept-package-agreements --accept-source-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
}

& gh auth status *> $null
if ($LASTEXITCODE -ne 0) {
    & gh auth login --hostname github.com --git-protocol https --web
    & gh auth setup-git
}

if (Test-Path $Schema) {
    Get-Content $Schema -Raw | Set-Clipboard
    Write-Host "The Supabase SQL schema has been copied to your clipboard." -ForegroundColor Green
    Write-Host "Paste and run it once in the SQL Editor of your Supabase project before using the live network." -ForegroundColor Yellow
}

if (-not $SupabaseUrl) {
    $SupabaseUrl = Read-Host "Paste your Supabase Project URL"
}
if (-not $AnonKey) {
    $secure = Read-Host "Paste your Supabase publishable key (sb_publishable_... recommended)" -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        $AnonKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
}

if ($SupabaseUrl -notmatch '^https://.+\.supabase\.co/?$') {
    throw "The Supabase URL does not look valid. Expected https://PROJECT.supabase.co"
}
if ([string]::IsNullOrWhiteSpace($AnonKey)) {
    throw "The Supabase anonymous key cannot be empty."
}

$SupabaseUrl = $SupabaseUrl.TrimEnd('/')

Write-Host "Saving GitHub Actions configuration..." -ForegroundColor Cyan
& gh variable set VITE_SUPABASE_URL --repo $Repo --body $SupabaseUrl
if ($LASTEXITCODE -ne 0) { throw "Could not save VITE_SUPABASE_URL." }

$AnonKey | & gh secret set VITE_SUPABASE_ANON_KEY --repo $Repo
if ($LASTEXITCODE -ne 0) { throw "Could not save VITE_SUPABASE_ANON_KEY." }

Write-Host "Starting a fresh GitHub Pages deployment..." -ForegroundColor Cyan
& gh workflow run deploy.yml --repo $Repo --ref main
if ($LASTEXITCODE -ne 0) { throw "Could not start deploy.yml." }

Start-Sleep -Seconds 3
$runId = (& gh run list --repo $Repo --workflow deploy.yml --branch main --limit 1 --json databaseId --jq '.[0].databaseId').Trim()
if ($runId) {
    & gh run watch $runId --repo $Repo --exit-status
    if ($LASTEXITCODE -ne 0) {
        & gh run view $runId --repo $Repo --log-failed
        throw "The deployment failed."
    }
}

Write-Host ""
Write-Host "Live backend configuration saved." -ForegroundColor Green
Write-Host "Site: https://donacgreece.github.io/World_Mood/"
Write-Host ""
Write-Host "If the site says the live network is unavailable, confirm that supabase/schema.sql was run successfully in the same Supabase project." -ForegroundColor Yellow
