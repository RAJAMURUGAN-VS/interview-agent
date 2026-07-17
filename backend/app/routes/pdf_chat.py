import os
import tempfile
import traceback

from flask import Blueprint, request, jsonify, Response

from ..services.rag_service import (
    get_or_build_vector_store,
    retrieve_context,
    build_answer,
    create_session,
    clear_session,
    _cached_vector_stores,
    _session_threads,
    CHROMA_PERSIST_DIR,
)
from ..services.stt_service import speech_to_text
from ..services.tts_service import stream_audio
from ..services.agent_service import model

bp = Blueprint("pdf_chat", __name__)


@bp.route("/pdf-chat/upload", methods=["POST"])
def upload_pdf():
    """
    Accept a PDF upload, build its vector store, create a session
    thread, and return the thread_id to the frontend.
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
    Retrieve context from the vector store and invoke the RAG model.
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
        context, source_docs, relevance_score = retrieve_context(vector_store, question, k=5)
        answer = build_answer(thread_id, context, question, source_docs, relevance_score)
        return jsonify({"success": True, "answer": answer})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/pdf-chat/transcribe", methods=["POST"])
def transcribe():
    """
    Step 1 of speech mode: accept audio, run STT, return transcript immediately.
    Frontend shows the transcript in chat, then calls /pdf-chat/ask-speech-answer.
    """
    if "audio" not in request.files:
        return jsonify({"success": False, "error": "No audio file provided"}), 400

    audio_file = request.files["audio"]
    temp_path = tempfile.NamedTemporaryFile(delete=False, suffix=".webm").name
    audio_file.save(temp_path)
    try:
        transcript = speech_to_text(temp_path)
        if not transcript or not transcript.strip():
            transcript = "Please summarise the document."
        else:
            transcript = transcript.strip()
    except Exception as e:
        print(f"[STT ERROR] {e}")
        traceback.print_exc()
        return jsonify({"success": False, "error": f"Transcription failed: {str(e)}"}), 500
    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)

    return jsonify({"success": True, "transcript": transcript})


@bp.route("/pdf-chat/ask-speech-answer", methods=["POST"])
def ask_speech_answer():
    """
    Step 2 of speech mode: accept thread_id + transcript, run RAG, stream TTS.
    Returns audio stream with X-Answer-Text header.
    """
    data = request.json or {}
    thread_id = data.get("thread_id", "").strip()
    question = data.get("transcript", "").strip()

    if not thread_id or not question:
        return jsonify({"success": False, "error": "Missing thread_id or transcript"}), 400

    file_hash = next(
        (fh for fh, tid in _session_threads.items() if tid == thread_id), None
    )
    if not file_hash:
        return jsonify({"success": False, "error": "Session not found. Please re-upload the PDF."}), 404

    vector_store = _cached_vector_stores.get(file_hash)
    if not vector_store:
        return jsonify({"success": False, "error": "Vector store not found."}), 404

    try:
        context, source_docs, relevance_score = retrieve_context(vector_store, question, k=5)
        answer = build_answer(thread_id, context, question, source_docs, relevance_score)
        spoken_answer = answer.split("\n\n📄 Sources:")[0]
        import urllib.parse
        safe_answer = urllib.parse.quote(answer)
        return Response(
            stream_audio(spoken_answer),
            mimetype="text/plain",
            headers={"X-Answer-Text": safe_answer},
        )
    except Exception as e:
        print(f"[RAG/TTS ERROR] {e}")
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/pdf-chat/tts", methods=["POST"])
def text_to_speech():
    """Accept text and stream TTS audio chunks."""
    data = request.json or {}
    text = data.get("text", "").strip()
    if not text:
        return jsonify({"success": False, "error": "Missing text"}), 400
    try:
        return Response(
            stream_audio(text),
            mimetype="text/plain",
        )
    except Exception as e:
        print(f"[TTS ERROR] {e}")
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


def ask_speech():
    """
    Accept an audio file and thread_id.
    Transcribe (STT), retrieve context, invoke RAG model, stream TTS.
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
    temp_path = tempfile.NamedTemporaryFile(delete=False, suffix=".webm").name
    audio_file.save(temp_path)
    try:
        question = speech_to_text(temp_path)
        if not question or not question.strip():
            question = "Please summarise the document."
        else:
            question = question.strip()
    except Exception as e:
        print(f"[STT ERROR] {e}")
        traceback.print_exc()
        return jsonify({"success": False, "error": f"Speech transcription failed: {str(e)}"}), 500
    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)

    try:
        context, source_docs, relevance_score = retrieve_context(vector_store, question, k=5)
        answer = build_answer(thread_id, context, question, source_docs, relevance_score)
        spoken_answer = answer.split("\n\n📄 Sources:")[0]
        import urllib.parse
        safe_answer = urllib.parse.quote(answer)
        safe_transcript = urllib.parse.quote(question)
        return Response(
            stream_audio(spoken_answer),
            mimetype="text/plain",
            headers={
                "X-Answer-Text": safe_answer,
                "X-Transcript": safe_transcript,
            },
        )
    except Exception as e:
        print(f"[RAG/TTS ERROR] {e}")
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/pdf-chat/session", methods=["DELETE"])
def delete_session():
    """
    Called when the user closes a PDF tab.
    Clears the vector store and thread mapping from memory.
    """
    data = request.json or {}
    thread_id = data.get("thread_id", "").strip()

    if not thread_id:
        return jsonify({"success": False, "error": "Missing thread_id"}), 400

    clear_session(thread_id)
    return jsonify({"success": True})


@bp.route("/pdf-chat/session-from-hash", methods=["POST"])
def session_from_hash():
    """
    Create a new conversation session for a PDF that is already embedded in ChromaDB.
    The frontend calls this when its IndexedDB cache has the fileHash but the session
    was lost (e.g. backend restarted). We look up the existing Chroma collection and
    create a fresh thread without re-processing the file.
    """
    data = request.json or {}
    file_hash = data.get("file_hash", "").strip()
    file_name = data.get("file_name", "unknown.pdf").strip()

    if not file_hash:
        return jsonify({"success": False, "error": "Missing file_hash"}), 400

    # Check if the vector store is already in memory
    vector_store = _cached_vector_stores.get(file_hash)

    if not vector_store:
        # Try to reload from the persisted ChromaDB directory
        try:
            import chromadb
            from langchain_chroma import Chroma
            from ..services.rag_service import _embeddings

            collection_name = f"pdf_chat_{file_hash}"

            # Check if the collection exists on disk
            client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
            existing = [c.name for c in client.list_collections()]

            if collection_name not in existing:
                # Collection doesn't exist — frontend must re-upload
                return jsonify({
                    "success": False,
                    "error": "collection-not-found",
                }), 404

            # Re-attach using the same client= pattern as rag_service
            vector_store = Chroma(
                client=client,
                collection_name=collection_name,
                embedding_function=_embeddings,
            )
            _cached_vector_stores[file_hash] = vector_store
            print(f"[session-from-hash] Reloaded collection {collection_name} from disk")
        except Exception as e:
            print(f"[session-from-hash] Failed to reload collection: {e}")
            return jsonify({"success": False, "error": str(e)}), 500

    # Create a fresh thread for this session
    thread_id = create_session(file_hash, model)
    print(f"[session-from-hash] Created thread {thread_id} for hash {file_hash[:8]}… ({file_name})")

    return jsonify({
        "success": True,
        "thread_id": thread_id,
        "file_hash": file_hash,
    })
