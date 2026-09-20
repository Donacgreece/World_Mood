$ErrorActionPreference = "Stop"

$RepoUrl = "https://github.com/Donacgreece/World_Mood.git"
$Repo = "Donacgreece/World_Mood"
$RepoApi = "repos/Donacgreece/World_Mood"
$Version = "0.0.1"
$Downloads = Join-Path $HOME "Downloads"
$Zip = Join-Path $Downloads "World_Mood-v$Version.zip"
$Project = Join-Path $Downloads "World_Mood-v$Version"

Write-Host "`nWorld Mood v$Version deployment" -ForegroundColor Cyan

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "Git is not installed or is not available in PATH."
}

if (-not (Test-Path $Project)) {
    if (-not (Test-Path $Zip)) {
        throw "Could not find $Zip or $Project"
    }
    Write-Host "Extracting ZIP..." -ForegroundColor Yellow
    Expand-Archive -Path $Zip -DestinationPath $Downloads -Force
}

# Try to make GitHub CLI available so Pages can be enabled automatically.
$Gh = Get-Command gh -ErrorAction SilentlyContinue
if (-not $Gh -and (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Host "GitHub CLI not found. Installing it with winget..." -ForegroundColor Yellow
    try {
        winget install --id GitHub.cli -e --source winget --accept-package-agreements --accept-source-agreements --silent
        $env:Path += ";$env:ProgramFiles\GitHub CLI"
        $Gh = Get-Command gh -ErrorAction SilentlyContinue
    } catch {
        Write-Host "Could not install GitHub CLI automatically. Git push will still be attempted." -ForegroundColor DarkYellow
    }
}

if ($Gh) {
    try {
        gh auth status | Out-Null
    } catch {
        Write-Host "GitHub authentication is required. A browser login will open." -ForegroundColor Yellow
        gh auth login --hostname github.com --git-protocol https --web
    }
    try { gh auth setup-git | Out-Null } catch {}
}

Set-Location $Project

if (Test-Path ".git") {
    Remove-Item ".git" -Recurse -Force
}

git init
git branch -M main
git config core.autocrlf false
git add .
git commit -m "World Mood v$Version"
git remote add origin $RepoUrl

Write-Host "Pushing World Mood to GitHub..." -ForegroundColor Yellow
git push -u origin main --force

if ($Gh) {
    Write-Host "Enabling GitHub Pages with GitHub Actions..." -ForegroundColor Yellow
    try {
        gh api "$RepoApi/pages" -X POST -f build_type=workflow | Out-Null
    } catch {
        try {
            gh api "$RepoApi/pages" -X PUT -f build_type=workflow | Out-Null
        } catch {
            Write-Host "Pages appears to be already configured, or GitHub returned a non-blocking configuration response." -ForegroundColor DarkYellow
        }
    }

    Write-Host "Starting the deployment workflow..." -ForegroundColor Yellow
    try { gh workflow run deploy.yml --repo $Repo } catch {}
    Start-Sleep -Seconds 4

    try {
        $runJson = gh run list --repo $Repo --workflow deploy.yml --limit 1 --json databaseId,status,conclusion | ConvertFrom-Json
        if ($runJson.Count -gt 0) {
            $runId = $runJson[0].databaseId
            Write-Host "Watching deployment run $runId..." -ForegroundColor Yellow
            gh run watch $runId --repo $Repo --exit-status
        }
    } catch {
        Write-Host "The push completed, but the workflow status could not be watched automatically." -ForegroundColor DarkYellow
    }
} else {
    Write-Host "GitHub CLI is unavailable. Push completed. If the site does not deploy, open Repository Settings > Pages and set Source to GitHub Actions." -ForegroundColor DarkYellow
}

Write-Host "`nDeployment finished." -ForegroundColor Green
Write-Host "Repository: https://github.com/Donacgreece/World_Mood"
Write-Host "Site: https://donacgreece.github.io/World_Mood/"
