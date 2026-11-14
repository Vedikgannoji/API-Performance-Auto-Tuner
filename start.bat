@echo off
setlocal
cd /d "%~dp0"
if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" scripts\start.py %*
) else (
    python scripts\start.py %*
)
if errorlevel 1 (
    echo.
    echo Startup failed. See the message above.
    pause
)
endlocal
