# AskAtlas - Multimodal RAG Chat Application

A powerful, cost-efficient application that allows users to upload documents, images, videos, and chat with Google Gemini LLM about their content using Retrieval-Augmented Generation (RAG). Features **full visual analysis** of images and videos using Gemini Vision API.

## ✨ Key Features

- **📄 Document Processing**: Support for PDF, TXT, MD, DOCX, PPTX files up to 50MB
- **🖼️ Image Analysis**: **Full visual understanding** using Gemini Vision API (not just OCR)
- **🎥 Video Analysis**: Automatic frame extraction and visual analysis with Gemini Vision
- **🎤 Audio Processing**: Extract transcripts from MP3, MP4, WAV, M4A files using Whisper
- **🔍 Intelligent Text Chunking**: Semantic chunking with overlap for better context
- **📊 Vector Embeddings**: Fast similarity search using FAISS and Sentence Transformers
- **💬 RAG-based Chat**: Context-aware responses using Google Gemini API
- **🎯 Session Management**: Maintain conversation context across queries
- **🎨 Modern UI**: Bright, vibrant, responsive chat interface
- **💰 Cost Optimized**: Free-tier friendly with local embeddings and minimal API calls
- **📺 YouTube Support**: Extract and process YouTube video transcripts

## 🎯 Visual Analysis Capabilities

**This application uses Gemini Vision API for true visual understanding:**

- **Images (PNG, JPG, JPEG)**: Direct visual analysis - understands content, objects, text, layout, scenes
- **Videos (MP4)**: Extracts key frames and analyzes visual content frame-by-frame
- **Combined Context**: Can combine visual analysis with text content for comprehensive answers

## 🏗️ Architecture

```
┌─────────────┐
│   Frontend  │  Next.js (React) - Bright, Modern Chat Interface
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  Next.js API│  Backend API (Node.js)
└──────┬──────┘
       │
       ├─→ Document Processor (PDF, DOCX, PPTX, TXT, MD)
       │
       ├─→ Image Processor (Gemini Vision API)
       │
       ├─→ Video Processor (Frame extraction + Gemini Vision)
       │
       ├─→ Audio Processor (Whisper ASR)
       │
       ├─→ Text Chunker (Semantic chunking)
       │
       ├─→ Vector Store (FAISS + Sentence Transformers)
       │
       └─→ Gemini Handler (Text + Vision API)
```

## 🛠️ Tech Stack

### Backend
- **Next.js API Routes**: Node.js-based API
- **pdf-parse**: PDF text extraction
- **mammoth**: DOCX processing
- **JSZip**: PPTX processing
- **Tesseract.js**: OCR for images (fallback)
- **@xenova/transformers**: Whisper for audio transcription
- **ffmpeg-static**: Video frame extraction
- **Sentence Transformers**: Free local embeddings (Xenova/all-MiniLM-L6-v2)
- **better-sqlite3**: Vector database storage
- **Google Gemini API**: LLM for text and vision analysis
- **youtube-transcript**: YouTube video transcript extraction

### Frontend
- **Next.js (React)**: App Router with React components
- **TypeScript**: Type-safe development
- **CSS**: Modern gradient-based styling with bright colors

## 📦 Installation

### Prerequisites
- Node.js 18.17.0 or higher
- Google Gemini API key (get from [Google AI Studio](https://makersuite.google.com/app/apikey))

### Setup

1. **Clone or navigate to the project directory**
```bash
cd docs-chat-master
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Create a `.env.local` file in the root directory:
```bash
GEMINI_API_KEY=your_actual_api_key_here
MAX_CHUNK_SIZE=1000
CHUNK_OVERLAP=200
MAX_FILE_SIZE_MB=50
EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2
GEMINI_MODEL=gemini-2.0-flash-exp
TEMPERATURE=0.7
MAX_OUTPUT_TOKENS=2048
ENABLE_OCR=true
ENABLE_YOUTUBE=true
```

4. **Start the development server**
```bash
npm run dev
```

The app runs at `http://localhost:3000`.

## 🚀 Usage

### 1. Upload Documents

**Supported File Types:**
- **Documents**: PDF, TXT, MD, DOCX, PPTX
- **Images**: PNG, JPG, JPEG (visual analysis)
- **Videos**: MP4 (frame extraction + visual analysis)
- **Audio**: MP3, WAV, M4A (transcript extraction)

**Upload Process:**
1. Click "Choose file" and select your file
2. Wait for processing
3. Images/Videos are stored and ready for visual analysis
4. Text documents are chunked and indexed

### 2. Upload YouTube Videos

1. Paste a YouTube URL in the input field
2. Click "Add YouTube"
3. Transcript is extracted and indexed

### 3. Start Chatting

1. Ask questions about your uploaded content
2. For images/videos, the AI analyzes visual content
3. For documents, the AI uses RAG-based retrieval
4. Get comprehensive, context-aware answers

## 📡 API Endpoints

### Document Upload
```http
POST /api/upload
Content-Type: multipart/form-data

file: <PDF/TXT/MD/DOCX/PPTX/PNG/JPG/MP4/MP3/WAV file>
```

**Response:**
```json
{
  "filename": "example.jpg",
  "total_chunks": 0,
  "media_id": "1234567890_abc123",
  "message": "Image uploaded successfully. Ready for visual analysis!"
}
```

### Chat
```http
POST /api/chat
Content-Type: application/json

{
  "session_id": "uuid",
  "query": "What is in this image?",
  "top_k": 5
}
```

**Response:**
```json
{
  "session_id": "uuid",
  "query": "What is in this image?",
  "response": "This image shows...",
  "media_analyzed": 1,
  "relevant_chunks": [],
  "chunk_count": 0
}
```

### Create Session
```http
POST /api/session/new
```

### Get Statistics
```http
GET /api/stats
```

### Clear All Data
```http
DELETE /api/clear
```

### YouTube Upload
```http
POST /api/upload/url
Content-Type: application/json

{
  "url": "https://www.youtube.com/watch?v=..."
}
```

## ⚙️ Configuration

Edit `.env.local` file to customize:

```bash
# Document Processing
MAX_CHUNK_SIZE=1000        # Tokens per chunk
CHUNK_OVERLAP=200          # Overlap between chunks
MAX_FILE_SIZE_MB=50        # Maximum upload size

# Embeddings
EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2  # Sentence transformer model

# Gemini Settings
GEMINI_MODEL=gemini-2.0-flash-exp
TEMPERATURE=0.7
MAX_OUTPUT_TOKENS=2048

# Features
ENABLE_OCR=true            # Enable OCR for images (fallback)
ENABLE_YOUTUBE=true        # Enable YouTube transcript extraction
```

## 💡 How It Works

### 1. Document Processing
```
PDF/DOCX/PPTX/TXT/MD → Text Extraction → Cleaning → Semantic Chunking → ~500-1000 chunks
```

### 2. Image Processing
```
PNG/JPG → Store File → Send to Gemini Vision API → Visual Analysis
        → (Optional) OCR for text search fallback
```

### 3. Video Processing
```
MP4 → Store File → Extract Key Frames (5 frames) → Send to Gemini Vision API → Visual Analysis
    → Extract Audio Transcript → Index for text search
```

### 4. Audio Processing
```
MP3/WAV/M4A → Convert to WAV → Whisper ASR → Transcript → Chunking → Indexing
```

### 5. Query Processing (RAG)
```
User Query → Embed Query → Search FAISS → Top-K Chunks
          → If Media Files Exist → Include in Gemini Vision API
          → Build Prompt with Context + Media → Gemini → Response
```

## 🎨 UI Features

- **Bright, vibrant color scheme** with gradients
- **Responsive design** for all screen sizes
- **Real-time chat interface** with message history
- **Upload progress indicators**
- **File type support indicators**
- **Status messages** for success/error states

## 💰 Cost Optimization Strategy

This application is designed for minimal cost:

1. **Local Embeddings**: Uses free Sentence Transformers instead of paid embedding APIs
2. **FAISS Vector Store**: Zero-cost local similarity search
3. **Smart Chunking**: Only sends relevant chunks to Gemini, not entire documents
4. **Caching**: Embeddings are cached in SQLite database
5. **Free Tier**: Gemini offers generous free tier (60 requests/minute)

### Estimated Costs

For a 1000-page PDF (~500,000 words):
- **Embedding**: FREE (local model)
- **Storage**: FREE (local SQLite)
- **Chat queries**: ~$0.00 with Gemini free tier (up to 60 RPM)
- **Vision API**: Included in Gemini free tier

## 🐛 Troubleshooting

### Issue: "GEMINI_API_KEY not set"
- **Solution**: Create `.env.local` file with your API key

### Issue: "OCR is disabled by settings"
- **Solution**: Set `ENABLE_OCR=true` in `.env.local` or enable it in settings

### Issue: "No text could be extracted from PDF"
- **Solution**: PDF might be scanned. Enable OCR in settings

### Issue: "Video frame extraction failed"
- **Solution**: Ensure `ffmpeg-static` is properly installed. The package should be automatically installed with npm.

### Issue: "Cannot connect to backend API"
- **Solution**: Ensure the Next.js server is running: `npm run dev`

## 📁 Project Structure

```
docs-chat-master/
├── app/
│   ├── api/              # API routes
│   │   ├── chat/         # Chat endpoint
│   │   ├── upload/        # File upload
│   │   ├── session/      # Session management
│   │   └── _state.ts     # Shared state
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Main page
├── lib/
│   ├── documentProcessor.ts  # File processing
│   ├── gemini.ts            # Gemini API integration
│   ├── vectorStore.ts        # Vector database
│   ├── textChunker.ts        # Text chunking
│   └── settings.ts          # Configuration
├── data/                     # SQLite database storage
├── uploads/                  # Uploaded media files
├── package.json
├── tsconfig.json
└── README.md
```

## 🚀 Deployment

### Build for Production
```bash
npm run build
npm start
```

### Environment Variables
Make sure to set all required environment variables in your deployment platform:
- `GEMINI_API_KEY` (required)
- Other optional settings (see Configuration section)

## 📝 License

MIT License - feel free to use and modify for your projects.

## 🤝 Contributing

Contributions welcome! Areas for improvement:
- Support for more video formats
- Batch image/video processing
- Export chat history
- Advanced analytics
- Multi-language support

## 🙏 Acknowledgments

- Google Gemini for the LLM and Vision API
- Facebook AI for FAISS (now Meta)
- Xenova for Transformers.js
- Sentence Transformers project
- Next.js framework

---

Built with efficiency, cost-optimization, and **true visual understanding** in mind. Happy chatting with your documents, images, and videos! 🎉
