@echo off
chcp 65001 >nul
title No2ta - شبكة الفصل الاجتماعية والسرية
color 0B

cd /d "%~dp0"

echo =========================================================================
echo    ⚡🚀 جاري تشغيل منصة "نؤطة" (No2ta) - شبكة الفصل الاجتماعية 🚀⚡
echo =========================================================================
echo.

:: 1. Hardware MAC Check: STRICTLY only device D0:8E:79:18:9F:A0 can host/be admin!
getmac /fo csv /nh | findstr /i "D0-8E-79-18-9F-A0" >nul
if %errorlevel% equ 0 (
    goto ADMIN_HOST_MODE
) else (
    goto STUDENT_CLIENT_MODE
)

:STUDENT_CLIENT_MODE
echo  [+] تم فحص الجهاز عبر كارت الشبكة: جهاز طالب في الفصل.
echo  [+] جاري فتح المتصفح والدخول المباشر للشات مع زملائك...
echo.
start "" "http://192.168.20.54:5000"
timeout /t 2 /nobreak >nul
exit /b

:ADMIN_HOST_MODE
echo  [+] تم التحقق بالماك الفيزيائي: جهاز الأدمن الحصري (Admin Host) 👑⚡
echo.

:: 2. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [X] خطأ: برنامج Node.js غير مثبت على هذا الجهاز!
    echo يرجى تحميله وتثبيته أولاً من: https://nodejs.org
    pause
    exit /b
)

:: 3. Check and auto-install dependencies
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
        echo [X] حدث خطأ أثناء تثبيت الحزم! يرجى التأكد من اتصال الإنترنت لأول مرة.
        pause
        exit /b
    )
    echo  [+] تم تثبيت كافة الحزم والمكتبات بنجاح 100%%! 🚀
) else (
    echo  [+] تم التحقق: جميع الحزم مثبتة وجاهزة للعمل! ✅
)

echo.
echo =========================================================================
echo  [+] جاري تشغيل سيرفر الفصل الرئيسي (Host Server)...
echo.
echo  📡 رابط السيرفر لجميع الطلاب في الفصل:
echo     http://192.168.20.54:5000
echo =========================================================================

:: Attempt to open port 5000 in Windows Firewall silently
netsh advfirewall firewall add rule name="No2ta Classroom Server" dir=in action=allow protocol=TCP localport=5000 >nul 2>nul

start "" "http://localhost:5000"
node server.js

pause
