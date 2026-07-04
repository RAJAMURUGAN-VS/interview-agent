import os
import tempfile

from flask import Blueprint, request, jsonify, Response

from ..services.rag_service import (
    get_or_build_vector_store,
    retrieve_context,
    build_answer,
    create_session,
    clear_session,
    _cached_vector_stores,
    _session_threads,
)
from ..services.stt_service import speech_to_text
from ..services.tts_service import stream_audio
from ..services.agent_service import model

bp = Blueprint("pdf_chat", __name__)


@bp.route("/pdf-chat/upload", methods=["POST"])
def upload_pdf():
    """
    Accept a PDF upload, build its vector store, create a LangGraph
    session thread, and return the thread_id to the frontend.
    """
    if "pdf" not in request.files:
        return jsonify({"success": False, "error": "No PDF file provided"}), 400

    pdf_file = request.files["pdf"]

    if not pdf_file.filename or not pdf_file.filename.lower().endswith(".pdf"):
        return jsonify({"success": False, "error": "File must be a PDF"}), 400

    file_bytes = pdf_file.read()

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        _, file_hash = get_or_build_vector_store(tmp_path, file_bytes)
        thread_id = create_session(file_hash, model)
        return jsonify({
            "success": True,
            "thread_id": thread_id,
            "file_hash": file_hash,
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@bp.route("/pdf-chat/ask-text", methods=["POST"])
def ask_text():
    """
    Accept a text question and thread_id.
    Retrieve context from the vector store and invoke the LangGraph agent.
    """
    data = request.json or {}
    thread_id = data.get("thread_id", "").strip()
    question = data.get("question", "").strip()

    if not thread_id or not question:
        return jsonify({"success": False,
                        "error": "Missing thread_id or question"}), 400

    # Resolve which file hash this thread belongs to
    file_hash = next(
        (fh for fh, tid in _session_threads.items() if tid == thread_id),
        None,
    )
    if not file_hash:
        return jsonify({"success": False,
                        "error": "Session not found. Please re-upload the PDF."}), 404

    vector_store = _cached_vector_stores.get(file_hash)
    if not vector_store:
        return jsonify({"success": False,
                        "error": "Vector store not found. Please re-upload the PDF."}), 404

    try:
        context, source_docs = retrieve_context(vector_store, question, k=5)
        answer = build_answer(thread_id, context, question, source_docs)
        return jsonify({"success": True, "answer": answer})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/pdf-chat/ask-speech", methods=["POST"])
def ask_speech():
    """
    Accept an audio file and thread_id.
    Transcribe (STT), retrieve context, invoke LangGraph agent, stream TTS.
    """
    if "audio" not in request.files:
        return jsonify({"success": False, "error": "No audio file provided"}), 400

    thread_id = request.form.get("thread_id", "").strip()
    if not thread_id:
        return jsonify({"success": False, "error": "Missing thread_id"}), 400

    file_hash = next(
        (fh for fh, tid in _session_threads.items() if tid == thread_id),
        None,
    )
    if not file_hash:
        return jsonify({"success": False,
                        "error": "Session not found. Please re-upload the PDF."}), 404

    vector_store = _cached_vector_stores.get(file_hash)
    if not vector_store:
        return jsonify({"success": False, "error": "Vector store not found."}), 404

    audio_file = request.files["audio"]
    tmp_audio_fd, tmp_audio_path = tempfile.mkstemp(suffix=".webm")
    try:
        with os.fdopen(tmp_audio_fd, "wb") as f:
            audio_file.save(f)
        question = speech_to_text(tmp_audio_path)
        if not question or not question.strip():
            question = "Please summarise the document."
    finally:
        if os.path.exists(tmp_audio_path):
            os.unlink(tmp_audio_path)

    try:
        context, source_docs = retrieve_context(vector_store, question, k=5)
        answer = build_answer(thread_id, context, question, source_docs)
        spoken_answer = answer.split("\n\n📄 Sources:")[0]
        return Response(
            stream_audio(spoken_answer),
            mimetype="text/plain",
            headers={"X-Answer-Text": answer},
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/pdf-chat/session", methods=["DELETE"])
def delete_session():
    """
    Called when the user closes a PDF tab.
    Clears the agent, vector store, and thread mapping from memory.
    """
    data = request.json or {}
    thread_id = data.get("thread_id", "").strip()

    if not thread_id:
        return jsonify({"success": False, "error": "Missing thread_id"}), 400

    clear_session(thread_id)
    return jsonify({"success": True})
