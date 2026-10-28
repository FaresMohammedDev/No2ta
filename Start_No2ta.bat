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
:: 3. Fast LAN Auto-Discovery: Listen for active No2ta Host server on network
echo [+] جاري فحص شبكة الفصل لاكتشاف سيرفر الأدمن تلقائياً...
node services/find_server.js > "%temp%\no2ta_discovery.tmp" 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=2,3 delims=:" %%a in ('type "%temp%\no2ta_discovery.tmp" ^| findstr "FOUND:"') do set "DISCOVERED_URL=http:%%a:%%b"
)

if defined DISCOVERED_URL (
    echo.
    echo =========================================================================
    echo  [+] تم العثور على سيرفر الفصل الرئيسي تلقائياً على الشبكة! 📡
    echo      الرابط: %DISCOVERED_URL%
    echo  [+] جاري فتح المتصفح والاتصال بزميلك فوراً...
    echo =========================================================================
    start "" "%DISCOVERED_URL%"
    timeout /t 3 /nobreak >nul
    exit /b
)

:: 4. If no server was auto-detected, ask user for mode
echo.
echo =========================================================================
echo   اختر طريقة التشغيل على هذا الجهاز:
echo.
echo   [1] تشغيل كـ "سيرفر الفصل الرئيسي (Host)" - (جهاز الأدمن فقط)
echo   [2] أنا جهاز طالب (Client) - الاتصال بسيرفر زميلي في الفصل
echo.
echo =========================================================================
set /p MODE="أدخل رقم الاختيار [1 أو 2]: "

if "%MODE%"=="2" (
    echo.
    echo -------------------------------------------------------------------------
    set /p HOST_IP="أدخل عنوان IP جهاز زميلك الأدمن (مثال: 192.168.20.54): "
    if not defined HOST_IP set HOST_IP=192.168.20.54
    echo.
    echo [+] جاري فتح المتصفح والاتصال بـ http://%HOST_IP%:5000 ...
    start "" "http://%HOST_IP%:5000"
    timeout /t 3 /nobreak >nul
    exit /b
)

:: Mode 1: Host Server
echo.
echo =========================================================================
echo  [+] جاري تشغيل سيرفر الفصل الرئيسي (Host Server)...
echo.
echo  ⚠️  تنبيه هام لكي يراك زملاؤك في الفصل:
echo      1. يجب أن تفتح أنت: http://localhost:5000
echo      2. يجب أن يفتح زملاؤك عنوان الـ IP الخاص بك (مثلاً: 192.168.20.54)
echo         وليس localhost!
echo.
echo =========================================================================

:: Attempt to add Windows Firewall rule silently
netsh advfirewall firewall add rule name="No2ta Classroom Server" dir=in action=allow protocol=TCP localport=5000 >nul 2>nul

start "" "http://localhost:5000"
node server.js

pause
