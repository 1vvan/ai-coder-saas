# Build and start Prelegal in a Docker container (Windows / PowerShell).
$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

if (-not (Test-Path ".env")) {
    Write-Error ".env not found in $root (needs OPENROUTER_API_KEY). Create it from .env.example and add your key."
    exit 1
}

Write-Host "Building prelegal image..."
docker build -t prelegal:latest .

Write-Host "Starting container..."
docker rm -f prelegal 2>$null | Out-Null
docker run -d --name prelegal --env-file .env -p 8000:8000 prelegal:latest

Write-Host "Prelegal is running at http://localhost:8000"
