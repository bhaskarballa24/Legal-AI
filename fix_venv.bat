@echo off
REM Script to fix the broken virtual environment

cd /d "d:\office pro\final year projects\Multi-Ai-new\Multi-Ai"

echo Removing old virtual environment...
if exist .venv (
    rmdir /s /q .venv
)

echo Creating new virtual environment...
python -m venv .venv

echo Activating and upgrading pip...
call .venv\Scripts\pip.exe install --upgrade pip

echo Installing requirements...
call .venv\Scripts\pip.exe install -r server\requirements.txt

echo.
echo Virtual environment fixed!
echo.
echo To activate the virtual environment, run:
echo   .venv\Scripts\activate.bat
echo.
pause

