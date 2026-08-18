# Sync script to push all latest social media outputs, videos, images, and strategy docs to Google Drive

$SourceDir = "c:\WIP\FEDSafeRetirement\SocialMedia\GoogleDrive_Export"
$TargetDir = "G:\My Drive\_Etzy_Alternative\Projects\FedSafeRetirement\Social"

# Refresh export bundle
Write-Host "Updating export bundle..."
Copy-Item "c:\WIP\FEDSafeRetirement\Marketing\social_plan.md" "$SourceDir\01_FedSafe_Social_Plan_for_Mike.md" -Force
Copy-Item "c:\WIP\FEDSafeRetirement\Marketing\SS_Presence.md" "$SourceDir\02_Social_Media_Strategy.md" -Force
Copy-Item "c:\WIP\FEDSafeRetirement\Marketing\From_Mike_Content\Social_Media_Directives.md" "$SourceDir\02b_Mike_Directives_Summary.md" -Force

# Copy latest rendered MP4s if they exist
if (Test-Path "c:\WIP\FEDSafeRetirement\SocialMedia\June28WebinarReel\out\fedsafe-postal-retirement-reel.mp4") {
    Copy-Item "c:\WIP\FEDSafeRetirement\SocialMedia\June28WebinarReel\out\fedsafe-postal-retirement-reel.mp4" "$SourceDir\03_Video_Postal_Retirement_Reel.mp4" -Force
}
if (Test-Path "c:\WIP\FEDSafeRetirement\SocialMedia\June28WebinarReel\out\fedsafe-fegli-shock-reel.mp4") {
    Copy-Item "c:\WIP\FEDSafeRetirement\SocialMedia\June28WebinarReel\out\fedsafe-fegli-shock-reel.mp4" "$SourceDir\04_Video_FEGLI_Shock_Alert_Reel.mp4" -Force
}

# Sync to Google Drive
if (Test-Path $TargetDir) {
    Copy-Item "$SourceDir\*" $TargetDir -Recurse -Force
    Write-Host "Successfully synced all latest docs, images, and videos to Google Drive!"
} else {
    Write-Warning "Google Drive target directory not found: $TargetDir"
}
