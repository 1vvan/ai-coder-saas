# Stop and remove the Prelegal container (Windows / PowerShell).
$ErrorActionPreference = "Stop"

docker rm -f prelegal 2>$null | Out-Null
Write-Host "Prelegal stopped."
