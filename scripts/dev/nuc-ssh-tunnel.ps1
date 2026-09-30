#Requires -Version 5.1
<#
.SYNOPSIS
  Pont SSH vers le NUC (WAN Freebox) pour joindre les apps lab depuis l'extérieur.

.USAGE
  .\scripts\dev\nuc-ssh-tunnel.ps1          # démarre en arrière-plan
  .\scripts\dev\nuc-ssh-tunnel.ps1 -Stop    # coupe le pont
  .\scripts\dev\nuc-ssh-tunnel.ps1 -Status  # ports / process

Puis ouvrir :
  http://127.0.0.1:3030  Comp AI
  http://127.0.0.1:3001  QAtrial
  http://127.0.0.1:3020  Grace
  http://127.0.0.1:8090  TenderAI MCP
  https://127.0.0.1:8443 CRM (Host: crm.global-it-ss.com si besoin)
#>
param(
  [switch]$Stop,
  [switch]$Status
)

$ErrorActionPreference = 'Stop'
$hostAlias = 'jarvis-nuc-tunnel'
$ports = @(3030, 3001, 3020, 3333, 8090, 8096, 8443, 8080)

function Get-TunnelProcesses {
  Get-CimInstance Win32_Process -Filter "Name='ssh.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match 'jarvis-nuc-tunnel' -or ($_.CommandLine -match '41222' -and $_.CommandLine -match '-N') }
}

if ($Status) {
  $procs = @(Get-TunnelProcesses)
  if ($procs.Count -eq 0) { Write-Host 'tunnel: DOWN' } else {
    Write-Host "tunnel: UP ($($procs.Count) ssh)"
    $procs | ForEach-Object { Write-Host "  pid $($_.ProcessId)" }
  }
  Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalPort -in $ports } |
    Select-Object LocalAddress, LocalPort |
    Format-Table -AutoSize
  exit 0
}

if ($Stop) {
  Get-TunnelProcesses | ForEach-Object {
    Write-Host "kill ssh pid $($_.ProcessId)"
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }
  exit 0
}

$existing = @(Get-TunnelProcesses)
if ($existing.Count -gt 0) {
  Write-Host "tunnel déjà UP (pid $($existing[0].ProcessId))"
  exit 0
}

$ssh = Get-Command ssh -ErrorAction Stop
$args = @('-N', $hostAlias)
Write-Host "start: ssh $($args -join ' ')"
Start-Process -FilePath $ssh.Source -ArgumentList $args -WindowStyle Hidden
Start-Sleep -Seconds 2

$procs = @(Get-TunnelProcesses)
if ($procs.Count -eq 0) {
  Write-Error 'tunnel non démarré — vérifie ssh jarvis-nuc-wan'
  exit 1
}
Write-Host "tunnel UP pid $($procs[0].ProcessId)"
Write-Host 'Comp  http://127.0.0.1:3030'
Write-Host 'QAtrial http://127.0.0.1:3001'
Write-Host 'Grace http://127.0.0.1:3020'
Write-Host 'Tender http://127.0.0.1:8090'
Write-Host 'CRM   https://127.0.0.1:8443'
