"""
Doubt Solver Blueprint — /doubt-solver/* endpoints.

Endpoints:
  POST /doubt-solver/ask   Ask a question → get explanation + resources
"""

import logging
from flask import Blueprint, jsonify, request

from ..services import doubt_solver_service

logger = logging.getLogger(__name__)

bp = Blueprint("doubt_solver", __name__, url_prefix="/doubt-solver")


@bp.route("/ask", methods=["POST"])
def ask_doubt_endpoint():
    """
    Answer a student's doubt with curated explanation and resources.
    
    Request JSON:
      { "question": str }
    
    Response:
      {
        "success": bool,
        "explanation": str,
        "youtube_videos": [ { title, url, channel, reason }, ... ],
        "documentation": [ { title, url, source }, ... ],
        "practice_resources": [ { title, url, source }, ... ],
        "github_examples": [ { title, url, description }, ... ]
      }
    """
    data = request.json or {}
    question = str(data.get("question", "")).strip()

    if not question:
        return jsonify({"success": False, "error": "Question is required"}), 400

    try:
        logger.info(f"Processing doubt: {question}")
        result = doubt_solver_service.ask_doubt(question)
        logger.info(f"Doubt result: {result}")
        
        # Always return 200 — success field indicates actual result
        if result.get("success"):
            return jsonify(result), 200
        else:
            # Return 200 with error in response body instead of 422
            # This allows frontend to properly parse error messages
            return jsonify(result), 200
    
    except Exception as exc:
        logger.exception("Doubt solver endpoint error")
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(exc)}"
        }), 500
