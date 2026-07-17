# OCR Image Extraction - Quick Start Guide

## ✅ Status: READY TO USE

All dependencies are installed. EasyOCR is working out of the box.

## How to Test Image Extraction

### Step 1: Start Backend
```bash
cd backend
python run.py
```

### Step 2: Start Frontend
```bash
cd frontend
npm run dev
```

### Step 3: Test Image Extraction

1. Go to **Notes → PDF Chat**
2. Upload a PDF that contains **images/diagrams**
   - Example: DBMS notes, networking diagrams, flowcharts, etc.
3. Ask a question about something **in the images**
   - Example: "What is this diagram showing?"
   - Example: "Describe the flowchart in this PDF"
   - Example: "What does this circuit diagram represent?"

### Step 4: Check Backend Logs

Watch the backend console for messages like:

```
[PDF PROCESSING] Building vector store for hash 04e93157...
[PDF PROCESSING] Extracting text content...
[PDF PROCESSING] Attempting image/OCR extraction...
[OCR] Using EasyOCR for image extraction
[OCR] Converting 10 PDF pages to images
[OCR] Page 1: Extracted 842 characters with EasyOCR
[OCR] Page 2: Extracted 1205 characters with EasyOCR
[PDF PROCESSING] Extracted 12400 characters from images
[PDF PROCESSING] Splitting into chunks...
[PDF PROCESSING] Created 18 chunks
[PDF PROCESSING] Creating vector embeddings...
[PDF PROCESSING] Vector store created successfully
```

### Expected Behavior

- **If PDF has no images**: Log shows "No images found or OCR not available" - still works fine
- **If images are found**: Log shows extraction happening with character counts
- **When asking about images**: LLM can now reference extracted image text

## OCR Implementation Details

### Architecture
```
PDF Upload
   ↓
PyPDFLoader (extract text)
   ↓
pdf2image (convert pages to images)
   ↓
EasyOCR (extract text from images)
   ↓
Combine text + OCR content
   ↓
RecursiveCharacterTextSplitter (chunk)
   ↓
HuggingFace Embeddings (embed)
   ↓
Chroma VectorStore (store)
   ↓
User Query → Similarity Search → LLM Response
```

### Models Used
- **Embedding**: `sentence-transformers/all-mpnet-base-v2` (384-dim, ~110M params)
- **OCR**: EasyOCR with PyTorch backend (automatically downloaded on first use)
- **LLM**: Perplexity Sonar (for PDF chat responses)

### Performance Notes
- First PDF with images: ~30-60 seconds (EasyOCR model downloads once)
- Subsequent PDFs: ~10-20 seconds (EasyOCR model cached)
- Image extraction only happens if images are detected

## Troubleshooting

### "No OCR library available"
**Cause**: Both Tesseract and EasyOCR failed to import
**Solution**: 
```bash
pip install --force-reinstall easyocr
```

### PDF processes but images not extracted
**Cause**: Either no images in PDF or OCR silently failed
**Solution**: Check logs for `[OCR]` messages. If none appear, PDF had no images.

### Very slow first PDF upload
**Cause**: EasyOCR downloading PyTorch models (~300MB)
**Solution**: First time takes longer (~5 min). Subsequent uploads use cached model.

### "numpy incompatibility" error
**Cause**: Wrong numpy version
**Solution**: 
```bash
pip install "numpy<2.0" --force-reinstall
```

## Optional: Enable Tesseract for Better Performance

Tesseract is **completely optional**. EasyOCR works perfectly as-is.

Benefits of Tesseract:
- 2-3x faster OCR processing
- Slightly better quality on small text
- More language support options

### Install Tesseract

#### Windows
1. Download: https://github.com/UB-Mannheim/tesseract/wiki
2. Run `.exe` installer (keep defaults)
3. Restart backend
4. pytesseract will auto-detect

#### macOS
```bash
brew install tesseract
```

#### Linux (Ubuntu)
```bash
sudo apt-get install tesseract-ocr
```

### Verify Tesseract Works
```bash
python -c "import pytesseract; print('✓ Tesseract ready')"
```

If successful, backend will use Tesseract instead of EasyOCR (see logs).

## Code Location

**Main Implementation**: `backend/app/services/rag_service.py`

Key functions:
- `_extract_images_and_ocr()` — Handles OCR with fallback
- `get_or_build_vector_store()` — Calls OCR during PDF processing
- `retrieve_context()` — Searches both text + images
- `build_answer()` — Returns LLM response with sources

## Example: What Gets Extracted

### PDF Content
```
[Text Layer]: "Machine Learning Basics"
[Image 1]: ER Diagram (text: "User", "Product", "Order" boxes with arrows)
[Image 2]: Neural Network Diagram (text: "Input Layer", "Hidden Layer", "Output Layer")
[Text Layer]: "Conclusion and References"
```

### After OCR + Chunking
```
Chunk 1: "Machine Learning Basics"
Chunk 2: [OCR'd text from ER diagram]
Chunk 3: [OCR'd text from Neural Network diagram]
Chunk 4: "Conclusion and References"
```

### Query: "What does the ER diagram show?"
- Similarity search matches Chunk 2
- LLM sees extracted text: "User, Product, Order, relationships"
- LLM responds: "This ER diagram shows the relationships between User, Product, and Order entities..."

## For Developers

To debug OCR extraction, add to `rag_service.py`:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

This will show detailed [OCR] messages in the console.

## Questions?

Check:
1. `DEPENDENCIES_AND_SETUP.md` — Full setup guide
2. `INSTALLATION_COMPLETE.md` — What was installed
3. Backend logs — `[OCR]` and `[PDF PROCESSING]` messages
