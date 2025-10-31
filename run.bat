@echo off
echo Starting Gemini Document Chat Application...
echo.

REM Check if virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Check if dependencies are installed
echo Checking dependencies...
pip list | findstr /i "fastapi" >nul
if errorlevel 1 (
    echo Installing dependencies...
    pip install -r requirements.txt
)

REM Check if .env exists
if not exist ".env" (
    echo Creating .env file from .env.example...
    copy .env.example .env
    echo.
    echo IMPORTANT: Please edit .env file and add your Gemini API key!
    echo Get your API key from: https://makersuite.google.com/app/apikey
    echo.
    pause
)

REM Create necessary directories
if not exist "uploads" mkdir uploads
if not exist "storage" mkdir storage

REM Start the backend server
echo.
echo Starting backend server on http://localhost:8000
echo.
echo API Documentation: http://localhost:8000/docs
echo.
echo To use the application:
echo 1. Open index.html in your browser, or
echo 2. Run 'python -m http.server 3000' in another terminal
echo.

python main.py
