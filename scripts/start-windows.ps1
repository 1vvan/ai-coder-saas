# Build and start Prelegal in a Docker container (Windows).
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "Building prelegal image..."
docker build -t prelegal:latest .

Write-Host "Starting container..."
docker rm -f prelegal *> $null
docker run -d --name prelegal -p 8000:8000 prelegal:latest

Write-Host "Prelegal is running at http://localhost:8000"
