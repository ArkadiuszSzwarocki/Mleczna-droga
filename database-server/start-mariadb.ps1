<#
Helper PowerShell script to prepare data dir and start MariaDB via Docker Compose.
Usage: run this in the repository root in PowerShell:
  .\database-server\start-mariadb.ps1
#>
$root = Get-Location
New-Item -ItemType Directory -Force -Path "$root\database-server\mysql-data" | Out-Null
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Error 'Docker nie jest zainstalowany lub dostępny w PATH'
  exit 2
}
if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
  docker-compose up -d
} else {
  docker compose up -d
}
