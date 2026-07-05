# Stop and remove the Prelegal container (Windows).
$ErrorActionPreference = "SilentlyContinue"

docker rm -f prelegal *> $null
Write-Host "Prelegal stopped."
