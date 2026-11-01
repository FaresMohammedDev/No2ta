@echo off
title No2ta NetSupport Student Agent Installer
color 0b
echo ========================================================
echo   [No2ta] NetSupport Student Silent Agent Installer
echo ========================================================
echo.

set "TARGET_DIR=%APPDATA%\No2taAgent"
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

echo [*] Copying agent files to: %TARGET_DIR%...
copy /Y "%~dp0lab-agent.ps1" "%TARGET_DIR%\lab-agent.ps1" >nul
copy /Y "%~dp0run-agent-hidden.vbs" "%TARGET_DIR%\run-agent-hidden.vbs" >nul

echo [*] Registering in Windows Startup folder...
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
copy /Y "%~dp0run-agent-hidden.vbs" "%STARTUP_DIR%\No2taLabAgent.vbs" >nul

echo [*] Starting silent agent in background...
wscript.exe "%TARGET_DIR%\run-agent-hidden.vbs"

echo.
echo ========================================================
echo   [SUCCESS] NetSupport Agent is running silently!
echo   Full Windows desktop is now streaming to Teacher.
echo ========================================================
echo.
timeout /t 3 >nul
exit
