$ErrorActionPreference = "Stop"

$Repo = "Donacgreece/World_Mood"
$RepoUrl = "https://github.com/$Repo.git"
$Source = Split-Path -Parent $MyInvocation.MyCommand.Path
$Work = Join-Path $env:TEMP "world-mood-deploy"

Write-Host ""
Write-Host "World Mood v0.0.1 deployment" -ForegroundColor Cyan
Write-Host "English-only UI, real data only, responsive light/dark mode, interactive map" -ForegroundColor DarkGray
Write-Host ""

$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "Git is not installed or is not available in PATH."
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "GitHub CLI is missing. Installing with winget..." -ForegroundColor Yellow
    winget install --id GitHub.cli -e --source winget --accept-package-agreements --accept-source-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
}

& gh auth status *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "GitHub login is required." -ForegroundColor Yellow
    & gh auth login --hostname github.com --git-protocol https --web
    & gh auth setup-git
}

if (-not (git config --global user.name)) {
    $login = (& gh api user --jq .login).Trim()
    git config --global user.name $login
}

if (-not (git config --global user.email)) {
    $login = (& gh api user --jq .login).Trim()
    $userId = (& gh api user --jq .id).Trim()
    git config --global user.email "$userId+$login@users.noreply.github.com"
}

if (Test-Path $Work) {
    Remove-Item $Work -Recurse -Force
}

git clone $RepoUrl $Work
if ($LASTEXITCODE -ne 0) { throw "Could not clone $RepoUrl" }

Write-Host "Syncing the complete project..." -ForegroundColor Cyan
$null = robocopy $Source $Work /MIR /XD .git node_modules dist /XF *.zip
if ($LASTEXITCODE -gt 7) { throw "Robocopy failed with exit code $LASTEXITCODE" }

Set-Location $Work

git add -A
$changes = git status --porcelain
if ($changes) {
    git commit -m "Refine World Mood v0.0.1: real data, English UI, map zoom, responsive light mode"
    git push origin main
    if ($LASTEXITCODE -ne 0) { throw "Git push failed." }
} else {
    Write-Host "Repository is already up to date." -ForegroundColor Green
}

& gh api "repos/$Repo/pages" *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Enabling GitHub Pages with GitHub Actions..." -ForegroundColor Cyan
    & gh api --method POST "repos/$Repo/pages" -f build_type=workflow *> $null
}

$sha = (git rev-parse HEAD).Trim()
$run = $null
for ($i = 0; $i -lt 15 -and -not $run; $i++) {
    Start-Sleep -Seconds 2
    $runsJson = & gh run list --workflow="deploy.yml" --branch main --limit 10 --json databaseId,headSha,status,conclusion
    if ($LASTEXITCODE -eq 0 -and $runsJson) {
        $runs = $runsJson | ConvertFrom-Json
        $run = $runs | Where-Object { $_.headSha -eq $sha } | Select-Object -First 1
    }
}

if ($run) {
    Write-Host "Watching GitHub Pages deployment run $($run.databaseId)..." -ForegroundColor Cyan
    & gh run watch $run.databaseId --exit-status
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Deployment failed. Showing failed log lines..." -ForegroundColor Red
        & gh run view $run.databaseId --log-failed
        throw "GitHub Pages deployment failed."
    }
} else {
    Write-Host "Push completed, but the new Actions run was not visible yet." -ForegroundColor Yellow
    Write-Host "Check: https://github.com/$Repo/actions"
}

Write-Host ""
Write-Host "Deployment finished." -ForegroundColor Green
Write-Host "Repository: https://github.com/$Repo"
Write-Host "Site: https://donacgreece.github.io/World_Mood/"
Write-Host ""
Write-Host "Important: the public mood map intentionally shows no fake data. Add the Supabase URL and anon key in GitHub Actions settings to enable real shared submissions." -ForegroundColor Yellow
