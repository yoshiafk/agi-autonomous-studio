# Antigravity Autonomous Studio - Windows PowerShell Installer
# Run via: irm https://raw.githubusercontent.com/yoshiafk/agi-autonomous-studio/master/install.ps1 | iex

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "   Antigravity Autonomous Studio - 1-Line Installer    " -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

$RepoUrl = "https://github.com/yoshiafk/agi-autonomous-studio.git"
$PluginsDir = Join-Path $env:USERPROFILE ".gemini\config\plugins"
$InstallDir = Join-Path $PluginsDir "antigravity-studio"

if (-not (Test-Path $PluginsDir)) {
    New-Item -ItemType Directory -Path $PluginsDir -Force | Out-Null
}

if (Test-Path (Join-Path $InstallDir ".git")) {
    Write-Host "Updating existing Antigravity Studio in $InstallDir..." -ForegroundColor Yellow
    Set-Location $InstallDir
    git pull --quiet origin master
} else {
    Write-Host "Installing Antigravity Studio plugin into: $InstallDir..." -ForegroundColor Green
    git clone --quiet $RepoUrl $InstallDir
    Set-Location $InstallDir
}

Write-Host ""
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host "  Plugin Location: $InstallDir"
Write-Host "  Chat Command:    /studio"
Write-Host ""
Write-Host "Launching Studio Visualizer..." -ForegroundColor Cyan

Start-Process -FilePath "cmd.exe" -ArgumentList "/c", (Join-Path $InstallDir "start.bat")
