# Dependencies and Setup Guide

## Installed Dependencies Summary

All Python dependencies have been installed automatically via `pip install -r requirements.txt`. Here's what was added:

### Core Dependencies (Already Installed)
- `langchain`, `langgraph` — LLM orchestration and agent framework
- `langchain-perplexity` — Perplexity API integration (sonar model)
- `langchain-community`, `langchain-huggingface` — Community integrations
- `langchain-chroma` — Chroma vector database client
- `chromadb` — Local vector database for PDF embeddings
- `sentence-transformers` — Embedding models for semantic search
- `pypdf` — PDF text extraction (PyPDFLoader)
- Flask, Flask-CORS, Flask-SQLAlchemy — Web framework and database

### Newly Installed Dependencies

#### Image Extraction & OCR (for PDF Chat)
- **`easyocr` (v1.7.2)** — Pure Python OCR library, no system dependencies
  - Used as fallback when Tesseract is not installed
  - Extracts text from images within PDFs
  - Supports multiple languages (default: English)

- **`pdf2image` (v1.17.0)** — Already installed, converts PDF pages to images
  
- **`pillow` (v10.4.0)** — Image processing library (already installed)

- **`pytesseract` (v0.3.13)** — Python wrapper for Tesseract OCR
  - Optional system installation for better quality/speed
  - Falls back to EasyOCR if Tesseract not available

#### Additional Image Processing
- **`scikit-image` (v0.26.0)** — Image processing utilities used by EasyOCR
- **`ninja` (v1.13.0)** — Build tool for compiling optimized libraries
- **`tifffile` (v2024.12.12)** — TIFF image format support
- **`imageio` (v2.37.3)** — Image I/O library used by scikit-image

#### Version Management
- **`numpy` (v1.26.4)** — Pinned to <2.0 for scispy/scispacy compatibility
- **`tifffile` (v2024.12.12)** — Pinned to <2025.0 for numpy 1.26 compatibility

## PDF Chat Image Extraction Features

### How It Works
1. **Text Extraction**: PyPDFLoader extracts text from PDF pages
2. **Image Detection**: pdf2image converts PDF pages to images
3. **OCR Processing**: Converts images to text using:
   - **Attempt 1**: Tesseract (if system-installed) — faster, better quality
   - **Attempt 2**: EasyOCR (pure Python fallback) — works out of the box
4. **Embedding**: All text (both PDF text + OCR'd images) is embedded in Chroma vector store
5. **Search**: User queries match against both sources equally

### Optional: Install Tesseract OCR for Better Quality

Tesseract is **optional**. EasyOCR is already installed and will work perfectly.

If you want the faster, higher-quality Tesseract:

#### Windows
1. Download installer: https://github.com/UB-Mannheim/tesseract/wiki
2. Run the .exe file with default settings
3. No additional Python configuration needed — pytesseract will auto-detect

#### macOS
```bash
brew install tesseract
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get install tesseract-ocr
```

### Verification

To verify image extraction is working:

1. Start the backend: `python run.py` in `/backend` directory
2. Upload a PDF with images (e.g., DBMS notes with diagrams)
3. Ask about content in the images
4. Check backend logs for `[OCR]` messages showing image extraction

Example log output:
```
[PDF PROCESSING] Extracting text content...
[PDF PROCESSING] Attempting image/OCR extraction...
[OCR] Using EasyOCR for image extraction
[OCR] Converting 15 PDF pages to images
[OCR] Page 1: Extracted 842 characters with EasyOCR
[PDF PROCESSING] Extracted 12500 characters from images
```

## Setup Checklist

- [x] Core Python dependencies installed
- [x] OCR libraries installed (EasyOCR enabled by default)
- [x] numpy version pinned to <2.0 for compatibility
- [x] tifffile version pinned to <2025.0 for compatibility
- [ ] (Optional) Tesseract system installation for faster OCR
- [ ] Backend environment variables set in `.env` (copy from `.env.example`)
- [ ] Backend can start: `python run.py`
- [ ] Frontend can start: `npm run dev` (in `/frontend` directory)

## API Keys Required

See `backend/.env.example` for:
- `PERPLEXITY_API_KEY` — For doubt solver & PDF chat LLM
- `TAVILY_API_KEY` — For doubt solver web search
- `ASSEMBLYAI_API_KEY` — For speech-to-text features
- Other keys for YouTube, Pipedream, etc.

## Troubleshooting

### Issue: "No module named 'easyocr'"
**Solution**: Run `pip install -r requirements.txt` again, or specifically: `pip install easyocr`

### Issue: "numpy incompatibility with scispacy"
**Solution**: Already fixed in requirements.txt. Numpy is pinned to <2.0.

### Issue: PDF images still not being extracted
**Solution**: Check backend logs for `[OCR]` messages. If you see "No OCR library available", reinstall:
```bash
pip install easyocr --force-reinstall
```

### Issue: Tesseract not found error
**Solution**: EasyOCR will automatically fallback. Tesseract is optional. To fix, either:
1. Install Tesseract system-wide (see instructions above)
2. Ignore the warning — EasyOCR will work fine

## File Changes Made

1. **`requirements.txt`** — Added: pdf2image, pillow, easyocr, pytesseract, numpy, tifffile
2. **`.env.example`** — Added documentation about OCR setup
3. **`app/services/rag_service.py`** — Already has OCR integration (no changes needed)

## Next Steps

1. Verify dependencies: `pip freeze | grep -E "easyocr|pdf2image|pillow"`
2. Test PDF upload with image content
3. Ask questions about diagrams to verify OCR is working
4. Optionally install Tesseract for performance improvement
