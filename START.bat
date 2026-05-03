@echo off
REM Quick Start Script for Multi-AI Chatbot

echo.
echo ===================================
echo Multi-AI Chatbot - Quick Start
echo ===================================
echo.

REM Check if we have node and python
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js/npm not installed. Please install from https://nodejs.org
    pause
    exit /b 1
)

where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python not installed. Please install from https://python.org
    pause
    exit /b 1
)

echo Dependencies check: OK
echo.
echo Starting application...
echo.

REM Start backend server
echo [1/2] Starting Flask API Server...
start cmd /k "cd server && .\.venv\Scripts\python.exe app.py"
timeout /t 3

REM Start frontend
echo [2/2] Starting React Frontend...
start cmd /k "cd Frontend && npm start"

echo.
echo ===================================
echo Application is starting!
echo ===================================
echo.
echo Backend (API): http://127.0.0.1:5000
echo Frontend UI: http://localhost:3000
echo.
echo Setup:
echo 1. If using Ollama: install and run 'ollama serve'
echo 2. If using OpenAI: add OPENAI_API_KEY to server/.env
echo.
echo Press Ctrl+C to stop when done.
pause
