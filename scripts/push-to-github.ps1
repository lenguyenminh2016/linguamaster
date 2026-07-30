# push-to-github.ps1
# Script to initialize git and push to GitHub

$gitCommand = Get-Command git -ErrorAction SilentlyContinue
$REPO_URL = "https://github.com/lenguyenminh2016/linguamaster.git"
$PROJECT = Split-Path -Parent $PSScriptRoot

Set-Location $PROJECT

Write-Host ""
Write-Host "=== LinguaMaster — Push to GitHub ===" -ForegroundColor Cyan
Write-Host ""

# Check git
if (-not $gitCommand) {
    Write-Host "ERROR: Git was not found in PATH." -ForegroundColor Red
    exit 1
}
$GIT = $gitCommand.Source

# Init repo if needed
if (-not (Test-Path ".git")) {
    Write-Host "Initializing git repo..." -ForegroundColor Yellow
    & $GIT init
    & $GIT branch -M main
} else {
    Write-Host "Git repo already initialized." -ForegroundColor Green
}

# Set remote
$existingRemote = & $GIT remote 2>$null
if ($existingRemote -notcontains "origin") {
    Write-Host "Adding remote origin..." -ForegroundColor Yellow
    & $GIT remote add origin $REPO_URL
} else {
    Write-Host "Remote origin already exists, updating..." -ForegroundColor Yellow
    & $GIT remote set-url origin $REPO_URL
}

# Stage all files (respects .gitignore)
Write-Host ""
Write-Host "Staging files..." -ForegroundColor Yellow
& $GIT add .

# Show what will be committed
Write-Host ""
Write-Host "Files to be committed:" -ForegroundColor Cyan
& $GIT status --short

# Commit
Write-Host ""
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
& $GIT commit -m "feat: LinguaMaster v1.0 - AI language learning app ($timestamp)"

# Push
Write-Host ""
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
Write-Host "(You may be prompted for GitHub credentials)" -ForegroundColor Gray
& $GIT push -u origin main

Write-Host ""
Write-Host "Done! View at: https://github.com/lenguyenminh2016/linguamaster" -ForegroundColor Green
