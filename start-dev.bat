@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo ╔══════════════════════════════════════════╗
echo ║     미리내야담 대본 생성기 서버 실행      ║
echo ║     http://localhost:3721                ║
echo ╚══════════════════════════════════════════╝
echo.
call npm run dev
pause
