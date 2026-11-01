@echo off
title No2ta NetSupport Student Agent Installer
color 0b
echo ========================================================
echo   [No2ta] NetSupport Student Silent Agent Installer
echo ========================================================
echo.

set "SERVER_URL=http://192.168.20.54:5000"
set "TARGET_DIR=%APPDATA%\No2taAgent"
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

REM 1. Copy or download lab-agent.ps1
if exist "%~dp0lab-agent.ps1" (
    echo [*] Copying lab-agent.ps1 from local directory...
    copy /Y "%~dp0lab-agent.ps1" "%TARGET_DIR%\lab-agent.ps1" >nul
) else (
    echo [*] Downloading lab-agent.ps1 from Teacher Server (%SERVER_URL%)...
    powershell -ExecutionPolicy Bypass -NoProfile -Command "(New-Object Net.WebClient).DownloadFile('%SERVER_URL%/agent/lab-agent.ps1', '%TARGET_DIR%\lab-agent.ps1')"
)

REM 2. Create run-agent-hidden.vbs directly inside TARGET_DIR
echo [*] Setting up hidden background runner...
(
echo Set WshShell = CreateObject("WScript.Shell"^)
echo WshShell.Run "powershell.exe -ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File ""%TARGET_DIR%\lab-agent.ps1""", 0, False
) > "%TARGET_DIR%\run-agent-hidden.vbs"

REM 3. Register in Windows Startup folder for automatic monitoring on PC boot
echo [*] Adding to Windows Startup folder...
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
copy /Y "%TARGET_DIR%\run-agent-hidden.vbs" "%STARTUP_DIR%\No2taLabAgent.vbs" >nul

REM 4. Kill any previous instance and start fresh silent background agent
powershell -ExecutionPolicy Bypass -NoProfile -Command "Get-Process powershell -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*lab-agent.ps1*' } | Stop-Process -Force -ErrorAction SilentlyContinue" >nul 2>&1
wscript.exe "%TARGET_DIR%\run-agent-hidden.vbs"

echo.
echo ========================================================
echo   [SUCCESS] Lab Agent installed and running silently!
echo   Full Windows desktop is now streaming to the teacher.
echo ========================================================
echo.
timeout /t 3 >nul
exit
