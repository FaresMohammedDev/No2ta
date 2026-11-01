@echo off
title No2ta NetSupport Lab Screen Agent
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0lab-agent.ps1" %*
pause
