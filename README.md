# AI Interview Coach

An AI-powered mock interview application that conducts a conversational 5-question interview on your chosen topic, streams voice responses via Murf TTS, transcribes your answers via AssemblyAI, and generates detailed feedback using Google Gemini. The frontend is built with React + Vite + TypeScript and the backend is a Flask app-factory with a service layer.

## Prerequisites

- Node.js 18+
- Python 3.10+
- API keys for: Google Gemini, Murf, AssemblyAI

## Setup — Backend

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env   # fill in your API keys
python run.py          # starts on http://localhost:5000
```

## Setup — Frontend

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL is already set correctly
npm run dev            # starts on http://localhost:5173
```

## Environment Variables

| Variable            | Location | Description                                      |
|---------------------|----------|--------------------------------------------------|
| `GOOGLE_API_KEY`    | backend  | Google Gemini API key for the interview agent    |
| `MURF_API_KEY`      | backend  | Murf API key for streaming text-to-speech        |
| `ASSEMBLYAI_API_KEY`| backend  | AssemblyAI API key for speech-to-text            |
| `VITE_API_URL`      | frontend | Backend base URL (default: http://127.0.0.1:5000)|
