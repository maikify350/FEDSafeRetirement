#!/usr/bin/env pwsh
# deploy-mobile.ps1 — Automates Expo deployment for the FEDSafe/JobMaster mobile app.
#
# This script handles:
# 1. Expo Export (for web/static serving at /mobile)
# 2. EAS Build (for native Android/iOS releases)
# 3. Automatic syncing to the web project's public folder
#
# Usage:
#   .\deploy-mobile.ps1 -Platform web
#   .\deploy-mobile.ps1 -Platform android -Profile production
#   .\deploy-mobile.ps1 -Platform all
#

param (
    [Parameter(Mandatory=$false)]
    [ValidateSet("web", "android", "ios", "all")]
    [string]$Platform = "web",

    [Parameter(Mandatory=$false)]
    [string]$Profile = "production",

    [Parameter(Mandatory=$false)]
    [switch]$Submit = $false
)

$ErrorActionPreference = 'Stop'

# ── Configuration ────────────────────────────────────────────────────────────
$scriptDir  = $PSScriptRoot
if (-not $scriptDir) { $scriptDir = Get-Location }

# Paths
$mobileDir  = "C:\WIP\Sample\mobile"
$webPublicMobileDir = Join-Path $scriptDir "web\public\mobile"

Write-Host "── FEDSafe Mobile Deployment ──" -ForegroundColor Magent

# ── Validation ───────────────────────────────────────────────────────────────
if (-not (Test-Path $mobileDir)) {
    Write-Error "Mobile project directory not found at $mobileDir. Please update the path in this script."
    exit 1
}

# ── Execution ────────────────────────────────────────────────────────────────
Push-Location $mobileDir

try {
    Write-Host "`n[mobile-deploy] Target: $Platform ($Profile)" -ForegroundColor Cyan

    # 1. Web Export & Sync
    if ($Platform -eq "web" -or $Platform -eq "all") {
        Write-Host "`n[mobile-deploy] Step 1: Exporting for Web..." -ForegroundColor Yellow
        npx expo export --platform web

        if (-not (Test-Path $webPublicMobileDir)) {
            Write-Host "[mobile-deploy] Creating directory: $webPublicMobileDir" -ForegroundColor DarkGray
            New-Item -ItemType Directory -Path $webPublicMobileDir -Force | Out-Null
        }

        Write-Host "[mobile-deploy] Syncing to web/public/mobile..." -ForegroundColor DarkCyan
        # Clean old files but preserve the directory
        Get-ChildItem -Path $webPublicMobileDir -Recurse | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
        
        # Copy new build
        Copy-Item "dist\*" $webPublicMobileDir -Recurse -Force
        Write-Host "[mobile-deploy] Web export synced successfully. Ready for Next.js deploy." -ForegroundColor Green
    }

    # 2. Native EAS Builds
    if ($Platform -ne "web") {
        $platforms = if ($Platform -eq "all") { @("android", "ios") } else { @($Platform) }

        foreach ($p in $platforms) {
            Write-Host "`n[mobile-deploy] Step 2: Running EAS Build for $p..." -ForegroundColor Yellow
            $easCommand = "eas build --platform $p --profile $Profile --non-interactive"
            if ($Submit) { $easCommand += " --auto-submit" }
            
            Write-Host "[mobile-deploy] Executing: $easCommand" -ForegroundColor DarkGray
            # We use Start-Process to handle interactive/long-running EAS better if needed, 
            # but Invoke-Expression is fine for non-interactive.
            Invoke-Expression $easCommand
        }
    }

    Write-Host "`n✅ Mobile deployment process completed successfully!" -ForegroundColor Green
    Write-Host "Next steps:" -ForegroundColor Gray
    Write-Host "1. If you exported web, redeploy the web app (vercel --prod)" -ForegroundColor Gray
    Write-Host "2. If you built native, check EAS Dashboard: https://expo.dev/accounts/maikify350/projects/jobmaster/builds" -ForegroundColor Gray

} catch {
    Write-Error "Deployment failed: $($_.Exception.Message)"
} finally {
    Pop-Location
}
