#!/bin/bash

echo "Starting Gemini Document Chat Application..."
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Check if dependencies are installed
echo "Checking dependencies..."
if ! pip show fastapi &> /dev/null; then
    echo "Installing dependencies..."
    pip install -r requirements.txt
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo ""
    echo "IMPORTANT: Please edit .env file and add your Gemini API key!"
    echo "Get your API key from: https://makersuite.google.com/app/apikey"
    echo ""
    read -p "Press enter to continue..."
fi

# Create necessary directories
mkdir -p uploads storage

# Start the backend server
echo ""
echo "Starting backend server on http://localhost:8000"
echo ""
echo "API Documentation: http://localhost:8000/docs"
echo ""
echo "To use the application:"
echo "1. Open index.html in your browser, or"
echo "2. Run 'python -m http.server 3000' in another terminal"
echo ""

python main.py
