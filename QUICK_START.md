# Quick Start Guide

Get your Gemini Document Chat up and running in 5 minutes!

## Prerequisites
- Python 3.8 or higher installed
- Google Gemini API key ([Get it here](https://makersuite.google.com/app/apikey))

## Installation Steps

### Step 1: Install Dependencies

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

**Mac/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Step 2: Configure API Key

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Edit `.env` file and add your Gemini API key:
```env
GEMINI_API_KEY=your_actual_api_key_here
```

### Step 3: Create Required Directories

```bash
mkdir uploads storage
```

### Step 4: Start the Backend

```bash
python main.py
```

The API will start on `http://localhost:8000`

### Step 5: Open the Frontend

**Option 1: Direct File (Simplest)**
- Just open `index.html` in your browser
- Note: CORS might block API calls in some browsers

**Option 2: Local Server (Recommended)**
```bash
# In a new terminal
python -m http.server 3000
```
Then visit: `http://localhost:3000`

## Using the App

1. **Upload Document**: Click "Choose PDF or TXT file" and upload your document
2. **Wait**: Processing takes a few seconds (or minutes for large files)
3. **Chat**: Once uploaded, type questions in the input box
4. **Get Answers**: Gemini responds based on document content

## Quick Launch Scripts

### Windows
Double-click `run.bat` or run:
```bash
run.bat
```

### Mac/Linux
```bash
chmod +x run.sh
./run.sh
```

## Example Questions to Ask

After uploading a document, try:
- "What is this document about?"
- "Summarize the main points"
- "What does section X say about Y?"
- "List all the key findings"
- "Explain [specific topic] mentioned in the document"

## Troubleshooting

### "Cannot connect to backend"
- Ensure backend is running: `python main.py`
- Check console for errors
- Verify port 8000 is available

### "No text extracted from PDF"
- PDF might be scanned/image-based
- Try a text-based PDF first
- For OCR support, install Tesseract

### "API key error"
- Verify API key in `.env` file
- Get new key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- Restart backend after changing `.env`

## Testing the Installation

1. Visit: `http://localhost:8000/docs`
2. You should see interactive API documentation
3. Try the `/stats` endpoint to verify everything works

## Next Steps

- Read the full [README.md](README.md) for advanced features
- Check API documentation at `http://localhost:8000/docs`
- Explore configuration options in `config.py`

## Getting Help

- Check the [README.md](README.md) troubleshooting section
- Review error messages in the console
- Ensure all dependencies are installed

---

That's it! You're ready to chat with your documents using Gemini AI.
