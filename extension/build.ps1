#!/usr/bin/env pwsh
# build.ps1 — Packages the FedSafe Retirement Copilot extension into a
# Chrome Web Store-ready ZIP. Run from the extension\ folder or repo root.
#
# Usage:
#   cd extension
#   .\build.ps1
#
#   Or from repo root:
#   .\extension\build.ps1

$ErrorActionPreference = 'Stop'

# ── Resolve paths ────────────────────────────────────────────────────────────
$scriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Definition
$distDir    = Join-Path $scriptDir 'dist'
$manifest   = Join-Path $scriptDir 'manifest.json'

if (-not (Test-Path $manifest)) {
    Write-Error "manifest.json not found. Run this script from the extension\ folder."
    exit 1
}

# ── Read version from manifest ───────────────────────────────────────────────
$manifestObj = Get-Content $manifest | ConvertFrom-Json
$version     = $manifestObj.version
$zipName     = "fedsafe-copilot-v$version.zip"
$zipPath     = Join-Path $distDir $zipName

# ── Files to include (everything except dev-only items) ──────────────────────
$include = @(
    'manifest.json',
    'background.js',
    'content.js',
    'field-mapper.js',
    'fegli_api.js',
    'panel.css',
    'icons\icon16.png',
    'icons\icon48.png',
    'icons\icon128.png'
)

# ── Warn if debug artifacts still present ────────────────────────────────────
$contentJs = Get-Content (Join-Path $scriptDir 'content.js') -Raw
$bgJs      = Get-Content (Join-Path $scriptDir 'background.js') -Raw
# Ungated console.log check (simple version)
$ungatedLogs = 0
$allLogs = [regex]::Matches($contentJs, 'console\.log')
foreach ($m in $allLogs) {
    $pre = $contentJs.Substring([Math]::Max(0, $m.Index - 40), 40)
    if ($pre -notmatch 'verboseDebug') {
        $ungatedLogs++
    }
}

if ($ungatedLogs -gt 0) {
    Write-Warning "$ungatedLogs ungated console.log statements found."
} else {
    Write-Host "[build] OK: All console.log statements are gated." -ForegroundColor DarkGreen
}

# ── Create dist folder ───────────────────────────────────────────────────────
if (-not (Test-Path $distDir)) {
    New-Item -ItemType Directory -Path $distDir | Out-Null
}

# ── Remove old ZIP for this version if it exists ─────────────────────────────
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

# ── Build ZIP ────────────────────────────────────────────────────────────────
Write-Host "`n[build] Packaging FedSafe Retirement Copilot v$version..." -ForegroundColor Cyan

$missing = @()
foreach ($rel in $include) {
    $abs = Join-Path $scriptDir $rel
    if (-not (Test-Path $abs)) {
        $missing += $rel
    }
}

if ($missing.Count -gt 0) {
    Write-Error "Missing files:`n$($missing -join "`n")"
    exit 1
}

# Use .NET Compression (no external tools required)
Add-Type -Assembly 'System.IO.Compression.FileSystem'
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')

foreach ($rel in $include) {
    $abs     = Join-Path $scriptDir $rel
    $entryName = $rel.Replace('\', '/')   # ZIP uses forward slashes
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
        $zip, $abs, $entryName,
        [System.IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
    Write-Host "  + $entryName"
}

$zip.Dispose()

$sizeKb = [math]::Round((Get-Item $zipPath).Length / 1KB, 1)
Write-Host "`n[build] Done: $zipPath ($sizeKb KB)" -ForegroundColor Green
Write-Host "[build] Upload this ZIP at: https://chrome.google.com/webstore/devconsole" -ForegroundColor DarkCyan
Write-Host ""
