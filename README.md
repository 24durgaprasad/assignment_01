# Gemini Document Chat - RAG-based PDF/Text Chat Application

A powerful, cost-efficient application that allows users to upload PDF or text documents and chat with Google Gemini LLM about their content using Retrieval-Augmented Generation (RAG). Designed to handle large documents (1000+ pages) efficiently with minimal cost.

## Features

- **Document Upload & Processing**: Support for PDF and TXT files up to 50MB
- **Intelligent Text Chunking**: Semantic chunking with overlap for better context
- **Vector Embeddings**: Fast similarity search using FAISS and Sentence Transformers
- **RAG-based Chat**: Context-aware responses using Google Gemini API
- **Session Management**: Maintain conversation context across queries
- **Modern UI**: Clean, responsive chat interface
- **Cost Optimized**: Free-tier friendly with local embeddings and minimal API calls

## Architecture

```
┌─────────────┐
│   Frontend  │  Next.js (React) - Chat Interface
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  Next.js API│  Backend API (Node)
└──────┬──────┘
       │
       ├─→ Document Processor (PyMuPDF, pdfplumber)
       │
       ├─→ Text Chunker (Semantic chunking)
       │
       ├─→ Vector Store (FAISS + Sentence Transformers)
       │
       └─→ Gemini Handler (Google Gemini API)
```

## Tech Stack

### Backend
- **Next.js API Routes**: Node-based API
- **PyMuPDF & pdfplumber**: PDF text extraction
- **Sentence Transformers**: Free local embeddings (all-MiniLM-L6-v2)
- **FAISS**: Facebook AI Similarity Search (vector database)
- **Google Gemini API**: LLM for response generation

### Frontend
- **Next.js (React)**: App Router with React components
- **CSS**: Global styles in `app/globals.css`

## Installation

### Prerequisites
- Python 3.8+
- Google Gemini API key (get from [Google AI Studio](https://makersuite.google.com/app/apikey))

### Setup

1. **Clone or navigate to the project directory**
```bash
cd jyoProject
```

2. **Create virtual environment**
```bash
python -m venv venv

# On Windows
venv\Scripts\activate

# On Mac/Linux
source venv/bin/activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Configure environment variables**
```bash
# Copy example env file
cp .env.example .env

# Edit .env and add your Gemini API key
# GEMINI_API_KEY=your_actual_api_key_here
```

5. **Create necessary directories**
```bash
mkdir uploads storage
```

## Usage

### 1. Start the App (Frontend + Backend in Next.js)

```bash
npm install
npm run dev
```

The app (frontend + API) runs at `http://localhost:3000`.

### 2. Start the Frontend (Next.js)

From the project root:

```bash
npm install
npm run dev
# Then visit http://localhost:3000
```

### 3. Use the Application

1. **Upload a Document**: Click "Choose PDF or TXT file" and select your document
2. **Wait for Processing**: The system will extract text, chunk it, and create embeddings
3. **Start Chatting**: Once uploaded, ask questions about your document
4. **Get Answers**: Gemini will respond based only on the document content

## API Endpoints

### Document Upload
```http
POST /upload
Content-Type: multipart/form-data

file: <PDF or TXT file>
```

### Chat
```http
POST /chat
Content-Type: application/json

{
  "session_id": "uuid",
  "query": "What is this document about?",
  "top_k": 5
}
```

### Create Session
```http
POST /session/new
```

### Get Statistics
```http
GET /stats
```

### Clear All Data
```http
DELETE /clear
```

## Configuration

Edit `config.py` or `.env` file to customize:

```python
# Document Processing
MAX_CHUNK_SIZE = 1000        # Tokens per chunk
CHUNK_OVERLAP = 200          # Overlap between chunks
MAX_FILE_SIZE_MB = 50        # Maximum upload size

# Embeddings
EMBEDDING_MODEL = "all-MiniLM-L6-v2"  # Sentence transformer model

# Gemini Settings
GEMINI_MODEL = "gemini-pro"
TEMPERATURE = 0.7
MAX_OUTPUT_TOKENS = 2048
```

## Cost Optimization Strategy

This application is designed for minimal cost:

1. **Local Embeddings**: Uses free Sentence Transformers instead of paid embedding APIs
2. **FAISS Vector Store**: Zero-cost local similarity search
3. **Smart Chunking**: Only sends relevant chunks to Gemini, not entire documents
4. **Caching**: Embeddings are cached to avoid recomputation
5. **Free Tier**: Gemini offers generous free tier (60 requests/minute)

### Estimated Costs

For a 1000-page PDF (~500,000 words):
- **Embedding**: FREE (local model)
- **Storage**: FREE (local FAISS)
- **Chat queries**: ~$0.00 with Gemini free tier (up to 60 RPM)

## How It Works

### 1. Document Processing
```
PDF/TXT → Text Extraction → Cleaning → Semantic Chunking → ~500-1000 chunks
```

### 2. Indexing
```
Chunks → Embeddings (Sentence Transformers) → FAISS Index → Fast Search
```

### 3. Query Processing (RAG)
```
User Query → Embed Query → Search FAISS → Top-K Chunks → Build Prompt → Gemini → Response
```

### 4. Prompt Engineering
The system uses a structured prompt:
```
System: You are a helpful assistant answering ONLY based on provided context...

Context: [Retrieved relevant chunks]

Conversation History: [Last 5 messages]

User Question: [Current query]

Answer:
```

## Advanced Features

### Custom Chunking Strategies

The `TextChunker` class supports two strategies:

1. **Word-based chunking**: Fixed token size with overlap
2. **Sentence-based chunking**: Maintains semantic coherence

### Session Management

Each user gets a unique session with:
- Persistent chat history
- Context-aware responses
- Independent document processing

### Vector Search

FAISS provides:
- Sub-linear search time O(log n)
- Efficient memory usage
- Scalable to millions of vectors

## Troubleshooting

### Issue: "No text could be extracted from PDF"
- **Solution**: PDF might be scanned. Enable OCR by installing Tesseract
```bash
# Install Tesseract OCR
# Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki
# Mac: brew install tesseract
# Linux: sudo apt-get install tesseract-ocr
```

### Issue: "Gemini API quota exceeded"
- **Solution**:
  - Wait for quota reset (60 requests/minute)
  - Upgrade to paid tier
  - Fallback to local LLM (LLaMA, Falcon)

### Issue: "Out of memory"
- **Solution**:
  - Reduce `MAX_CHUNK_SIZE`
  - Process documents in batches
  - Use smaller embedding model

### Issue: "Cannot connect to backend"
- **Solution**:
  - Ensure backend is running: `python main.py`
  - Check port 8000 is available
  - Verify CORS settings

## Performance Optimization

### For Large Documents (10,000+ pages)

1. **Batch Processing**
```python
# Process in chunks of 100 pages
for batch in document_batches:
    process_batch(batch)
```

2. **Hierarchical Chunking**
```python
# Create summary chunks + detailed chunks
summary_chunks = create_summaries(document)
detail_chunks = create_detailed_chunks(document)
```

3. **Hybrid Search**
```python
# Combine vector search with keyword search
results = vector_search(query) + keyword_search(query)
```

## Extending the Application

### Add Support for More File Types
```python
# In document_processor.py
def process_docx(file_path):
    from docx import Document
    doc = Document(file_path)
    return '\n'.join([p.text for p in doc.paragraphs])
```

### Use Alternative LLMs
```python
# Local LLM fallback
from transformers import pipeline

llm = pipeline("text-generation", model="meta-llama/Llama-2-7b")
```

### Add Authentication
```python
# In main.py
from fastapi.security import HTTPBearer

security = HTTPBearer()

@app.post("/upload")
async def upload(file: UploadFile, token: str = Depends(security)):
    # Validate token
    ...
```

## Deployment

### Docker Deployment
```dockerfile
FROM python:3.10-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Cloud Deployment Options
- **Heroku**: Free tier available
- **Railway**: Easy deployment
- **Vercel**: Frontend hosting
- **Google Cloud Run**: Serverless backend

## License

MIT License - feel free to use and modify for your projects.

## Contributing

Contributions welcome! Areas for improvement:
- OCR support for scanned PDFs
- Multi-language support
- Document comparison features
- Export chat history
- Advanced analytics

## Support

For issues and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review API documentation at `/docs`

## Acknowledgments

- Google Gemini for the LLM API
- Facebook AI for FAISS
- Sentence Transformers project
- FastAPI framework

---

Built with efficiency and cost-optimization in mind. Happy chatting with your documents!
