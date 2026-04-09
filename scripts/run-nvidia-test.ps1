# Windows PowerShell script to run a quick local NVIDIA API wrapper test
# Usage: powershell -File scripts\run-nvidia-test.ps1 [-ApiKey <key>] [-ApiUrl <url>]

param(
  [string]$ApiKey,
  [string]$ApiUrl
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$rootDir = (Resolve-Path (Join-Path $scriptDir "..")).Path
$testScript = Join-Path $rootDir "test-run.js"

# Resolve API key
if (-not $ApiKey) {
  $ApiKey = $env:NVIDIA_API_KEY
}
if (-not $ApiKey) {
  Write-Error "NVIDIA_API_KEY is not defined. Pass -ApiKey or set NVIDIA_API_KEY env var."
  exit 1
}

# Set environment for child processes
$env:NVIDIA_API_KEY = $ApiKey
if ($ApiUrl) { $env:NVIDIA_API_URL = $ApiUrl }

$apiUrlDisplay = if ([string]::IsNullOrWhiteSpace($env:NVIDIA_API_URL)) { "(default)" } else { $env:NVIDIA_API_URL }
Write-Host "NVIDIA test: API URL = $apiUrlDisplay"

try {
  & node $testScript
} catch {
  Write-Error "NVIDIA test failed: $_"
  exit 1
}
