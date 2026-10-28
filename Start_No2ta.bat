@echo off
chcp 65001 >nul
title No2ta - شبكة الفصل الاجتماعية والسرية
color 0B

cd /d "%~dp0"

echo =========================================================================
echo    ⚡🚀 مرحباً بك في منصة "نؤطة" (No2ta) - شبكة الفصل الاجتماعية 🚀⚡
echo =========================================================================
echo.
echo   اختر طريقة التشغيل على هذا الجهاز:
echo.
echo   [1] أنا جهاز طالب (Client) - الدخول الفوري للشات (بدون سيرفر أو حزم!)
echo   [2] أنا السيرفر المضيف (Host Server) - تشغيل السيرفر على هذا الجهاز (للأدمن)
echo.
echo =========================================================================
set /p MODE="أدخل رقم الاختيار [1 أو 2]: "

if "%MODE%"=="1" goto CLIENT_MODE
if "%MODE%"=="2" goto HOST_MODE

:: Default to Client mode if invalid
goto CLIENT_MODE

:CLIENT_MODE
echo.
echo -------------------------------------------------------------------------
echo  [+] وضع الطالب: لا تحتاج لتثبيت أي حزم أو تشغيل سيرفر على جهازك!
set /p HOST_IP="أدخل عنوان IP سيرفر الأدمن [اضغط Enter لاستخدام 192.168.20.54]: "
if not defined HOST_IP set HOST_IP=192.168.20.54
echo.
echo  [+] جاري فتح المتصفح والدخول للمنصة: http://%HOST_IP%:5000 ...
start "" "http://%HOST_IP%:5000"
timeout /t 3 /nobreak >nul
exit /b

:HOST_MODE
echo.
echo =========================================================================
echo  [+] وضع السيرفر المضيف (Host Server): جاري الفحص والتشغيل...
echo =========================================================================

:: 1. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [X] خطأ: برنامج Node.js غير مثبت على هذا الجهاز!
    echo يرجى تحميله وتثبيته أولاً من: https://nodejs.org
    echo ثم أعد تشغيل هذا الملف مجدداً.
    echo.
    pause
    exit /b
)

:: 2. Check and auto-install dependencies
echo.
echo [+] جاري فحص مكتبات التشغيل (Dependencies)...
node -e "require('express'); require('socket.io'); require('sqlite3'); require('multer'); require('cors'); require('qrcode');" >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo =========================================================================
    echo  [!] الحزم غير مثبتة! جاري التثبيت التلقائي لأول مرة عبر npm install...
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
        echo [X] حدث خطأ أثناء تثبيت الحزم! يرجى التأكد من اتصال الإنترنت لتنزيل المكتبات لأول مرة.
        pause
        exit /b
    )
    echo.
    echo  [+] تم تثبيت كافة الحزم والمكتبات بنجاح 100%%! 🚀
) else (
    echo  [+] تم التحقق: جميع الحزم مثبتة وجاهزة للعمل! ✅
)

echo.
echo =========================================================================
echo  [+] جاري تشغيل سيرفر الفصل...
echo.
echo  ⚠️  تنبيه هام لكي يراك زملاؤك في الفصل:
echo      1. يجب أن تفتح أنت: http://localhost:5000
echo      2. يجب أن يفتح زملاؤك عنوان الـ IP الخاص بك (مثلاً: 192.168.20.54)
echo         وليس localhost!
echo =========================================================================

:: Attempt to add Windows Firewall rule silently
netsh advfirewall firewall add rule name="No2ta Classroom Server" dir=in action=allow protocol=TCP localport=5000 >nul 2>nul

start "" "http://localhost:5000"
node server.js

pause
