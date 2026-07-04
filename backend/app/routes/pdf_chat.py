import os
import tempfile

from flask import Blueprint, request, jsonify, Response

from ..services.rag_service import build_rag_pipeline, query_rag
from ..services.stt_service import speech_to_text
from ..services.tts_service import stream_audio

bp = Blueprint("pdf_chat", __name__, url_prefix="/pdf-chat")


@bp.route("/upload", methods=["POST"])
def upload_pdf():
    """
    POST /pdf-chat/upload
    Accept multipart/form-data with field 'pdf'.
    Returns {"session_id": "<hex>"} on success.
    """
    # Validate file presence
    if "pdf" not in request.files:
        return jsonify({"error": "No file provided. Send a PDF with field name 'pdf'."}), 400

    file = request.files["pdf"]

    # Validate file extension
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Invalid file type. Only .pdf files are accepted."}), 400

    try:
        file_bytes = file.read()
        session_id = build_rag_pipeline(file_bytes)
        return jsonify({"session_id": session_id}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/ask-text", methods=["POST"])
def ask_text():
    """
    POST /pdf-chat/ask-text
    Accept JSON body {"session_id": "...", "question": "..."}.
    Returns {"answer": "...", "sources": [...]}.
    """
    data = request.get_json(silent=True)

    if not data:
        return jsonify({"error": "Request body must be JSON."}), 400

    session_id = data.get("session_id")
    question = data.get("question")

    # Validate required fields
    if not session_id:
        return jsonify({"error": "Missing required field: 'session_id'."}), 400

    if not question or not question.strip():
        return jsonify({"error": "Question must not be empty."}), 400

    try:
        result = query_rag(session_id, question)
        return jsonify({"answer": result["answer"], "sources": result["sources"]}), 200
    except KeyError as e:
        return jsonify({"error": "Session not found. Please upload a PDF first."}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/ask-speech", methods=["POST"])
def ask_speech():
    """
    POST /pdf-chat/ask-speech
    Accept multipart/form-data with fields 'audio' and 'session_id'.
    Returns streaming audio body with X-Answer-Text header.
    """
    # Validate fields
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided. Send audio with field name 'audio'."}), 400

    session_id = request.form.get("session_id")
    if not session_id:
        return jsonify({"error": "Missing required field: 'session_id'."}), 400

    audio_file = request.files["audio"]

    # Save audio to a temp file for STT processing
    tmp_audio_fd, tmp_audio_path = tempfile.mkstemp(suffix=".webm")
    try:
        with os.fdopen(tmp_audio_fd, "wb") as f:
            audio_file.save(f)

        # Transcribe audio to text
        transcript = speech_to_text(tmp_audio_path)
    finally:
        if os.path.exists(tmp_audio_path):
            os.unlink(tmp_audio_path)

    # Handle empty STT transcript gracefully
    if not transcript or not transcript.strip():
        return jsonify({"error": "Could not transcribe audio. Please try again."}), 400

    # Query RAG with the transcribed question
    try:
        result = query_rag(session_id, transcript)
    except KeyError:
        return jsonify({"error": "Session not found. Please upload a PDF first."}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    answer = result["answer"]
    sources = result["sources"]

    # Build X-Answer-Text header value: answer with sources appended if present
    if sources:
        sources_str = ", ".join(str(p) for p in sources)
        answer_header = f"{answer} [Sources: pages {sources_str}]"
    else:
        answer_header = answer

    # Stream TTS audio response with answer in header
    try:
        return Response(
            stream_audio(answer),
            mimetype="text/plain",
            headers={"X-Answer-Text": answer_header},
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500
