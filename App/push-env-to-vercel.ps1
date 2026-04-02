# Push all required env vars to Vercel production
# Run from: c:\WIP\FEDSafeRetirement_App\App

$env_vars = @{
    "NEXT_PUBLIC_APP_URL"                        = "https://fsr.mustautomate.ai"
    "NEXT_PUBLIC_APP_VERSION"                    = "04.01.01"
    "NEXT_PUBLIC_SUPABASE_URL"                   = "https://gqarlkfmpgaotbezpkbs.supabase.co"
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY" = "sb_publishable_ZDXaKMDm3JHJGF3Z8gZI3g_GdRls9Tg"
    "NEXT_PUBLIC_PROJECT_ID"                     = "gqarlkfmpgaotbezpkbs"
    "NEXT_PUBLIC_SECRET_KEY"                     = "sb_secret_H9tjR··························"
    "NEXT_PUBLIC_SUPABASE_PERSONAL_ACCESS_TOKEN" = "sbp_edb5a6c6044368687551033d083a29327c4b96c9"
    "NEXT_PUBLIC_GOOGLE_API_KEY"                 = "AIzaSyAVwR_ZDXDK9wceFBc1Q3W4oXrVJPOjS-Y"
    "NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN"            = "pk.eyJ1IjoicmdhcmNpYTM1MCIsImEiOiJjbWp1Y3B0ZHg1cHBwM2VvdGwydHFjMDJlIn0.2fL2EUfHFVlCfEB_bYG_gg"
    "NEXT_PUBLIC_RTRVR_API_KEY"                  = "rtrvr__ekDCTKPv2ErN-yF9ANjH2VwwSSC9PgHQBDuy1gzOiY"
    # NOTE: AI keys below — only add if needed server-side. These are NEXT_PUBLIC so they're client-visible anyway.
    "NEXT_PUBLIC_OPENAI_API_KEY"                 = "sk-proj-anielepohng9eing5Ol6Phex3oin9geg-n0tr3al"
    "NEXT_PUBLIC_ANTHROPIC_API_KEY"              = "sk-ant-api03-gu2gohc4sha1Thohpeep7ro9vie1ikai-n0tr3al"
    "NEXT_PUBLIC_GROK_API_KEY"                   = "xai-ahDi8ofei1Em2chaichoac2Beehi8thu-n0tr3al"
    "NEXT_PUBLIC_ELEVENLABS_API_KEY"             = "elevenlabs-api-key-oa9Shahx4Zi4oof2bei5kee9nee7eeng-n0tr3al"
}

foreach ($key in $env_vars.Keys) {
    $value = $env_vars[$key]
    Write-Host "Setting $key ..." -ForegroundColor Cyan
    $value | vercel env add $key production --force 2>&1
    Start-Sleep -Milliseconds 500
}

Write-Host "`n✅ All env vars pushed to Vercel production!" -ForegroundColor Green
Write-Host "Run: vercel --prod --yes" -ForegroundColor Yellow
