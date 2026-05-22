@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo ╔══════════════════════════════════════════╗
echo ║     미리내야담 대본 생성기 서버 종료      ║
echo ╚══════════════════════════════════════════╝
echo.
echo [정보] 3721 포트를 사용하는 프로세스를 검색하고 있습니다...

set "found="
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3721 ^| findstr LISTENING') do (
    set "found=true"
    echo [안내] 3721 포트 프로세스(PID: %%a)를 강제 종료합니다...
    taskkill /F /PID %%a >nul 2>&1
    if errorlevel 1 (
        echo [오류] PID %%a 프로세스 종료에 실패했습니다. (관리자 권한 필요 또는 이미 종료됨)
    ) else (
        echo [성공] PID %%a 프로세스를 종료했습니다.
    )
)

if not defined found (
    echo [안내] 현재 3721 포트에서 실행 중인 서버 프로세스가 없습니다.
)

echo.
echo [완료] 종료 프로세스가 완료되었습니다.
echo.
pause
