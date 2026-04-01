@echo off
echo Launching Chrome with remote debugging on port 9222...
echo.
echo IMPORTANT: Close ALL Chrome windows first!
echo.
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%TEMP%\chrome_debug_profile"
echo Chrome launched. You can now run:
echo   python scraper_cdp.py --limit 10
echo.
pause
