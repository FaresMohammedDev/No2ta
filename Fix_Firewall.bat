@echo off
chcp 65001 >nul
title السماح لـ No2ta في جدار حماية ويندوز
color 0A

echo =========================================================================
echo  ⚡ جاري فتح المنفذ 5000 في جدار الحماية (Windows Firewall) ⚡
echo =========================================================================
echo.

netsh advfirewall firewall add rule name="No2ta Classroom Server" dir=in action=allow protocol=TCP localport=5000

if %errorlevel% equ 0 (
    echo.
    echo  [OK] تم فتح المنفذ بنجاح تام!
    echo  الآن يمكن لجميع أجهزة وموبايلات الفصل الدخول إلى السيرفر الخاص بك.
) else (
    echo.
    echo  [!] يتطلب صلاحيات الأدمن:
    echo      اضغط كليك يمين على هذا الملف واشغل: "Run as administrator"
)

echo.
echo =========================================================================
pause
