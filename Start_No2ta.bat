@echo off
chcp 65001 >nul
title No2ta - شبكة الفصل الاجتماعية والسرية
color 0B

cd /d "%~dp0"

echo =========================================================================
echo    ⚡🚀 مرحباً بك في منصة "نؤطة" (No2ta) - شبكة الفصل الاجتماعية 🚀⚡
echo =========================================================================
echo.

:: 1. Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [X] خطأ: برنامج Node.js غير مثبت على هذا الجهاز!
    echo يرجى تحميله وتثبيته أولاً من: https://nodejs.org
    echo ثم أعد تشغيل هذا الملف مجدداً.
    echo.
    pause
    exit /b
)

:: 2. Check and auto-install dependencies if missing
echo [+] جاري فحص مكتبات وحزم التشغيل...
node -e "require('express'); require('socket.io'); require('sqlite3'); require('multer');" >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo =========================================================================
    echo  [!] تنبيه: الحزم والمكتبات غير مثبتة على هذا الجهاز!
    echo  [!] جاري تثبيت جميع مكاتب المشروع تلقائياً (npm install)...
    echo  [!] قد يستغرق هذا بضع ثوانٍ لأول مرة فقط...
    echo =========================================================================
    echo.
    
    where npm.cmd >nul 2>nul
    if %errorlevel% equ 0 (
        call npm.cmd install --no-audit --no-fund
    ) else (
        call npm install --no-audit --no-fund
    )
    
    if %errorlevel% neq 0 (
        echo.
        echo [X] حدث خطأ أثناء تثبيت الحزم! يرجى التأكد من اتصال الإنترنت ثم إعادة المحاولة.
        pause
        exit /b
    )
    
    echo.
    echo  [+] تم تثبيت كافة الحزم والمكتبات بنجاح 100%%! 🚀
    echo =========================================================================
) else (
    echo  [+] تم التحقق: جميع الحزم والمكتبات مثبتة وجاهزة للعمل! ✅
)

echo.
echo  [+] السيرفر يعمل على منفذ الشبكة المحلية: 5000
echo  [+] كلمة السر الرئيسية للمنصة: SdSdSdSd
echo  [+] زر البشمهندسة مفعل عبر اختصار F2 أو الضغط مرتين على Esc
echo.
echo =========================================================================
echo  [+] جاري إطلاق السيرفر وفتح المتصفح تلقائياً...
echo =========================================================================

:: Launch default browser
start "" "http://localhost:5000"

:: Start Node.js Server
node server.js

pause
