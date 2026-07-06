from flask import Blueprint, request, jsonify
from ..services import agent_service
from ..services.agent_service import session
from ..utils.prompts import FEEDBACK_PROMPT
import json

bp = Blueprint('feedback', __name__)


@bp.route("/get-feedback", methods=["POST"])
def get_feedback():
    """Generate detailed interview feedback with pronunciation analysis"""
    config = {"configurable": {"thread_id": agent_service.session.thread_id}}

    # Serialize pronunciation log to inject into the prompt
    pronunciation_data = json.dumps(session.pronunciation_log, indent=2)

    response = agent_service.invoke_agent({
        "messages": [
            {
                "role": "user",
                "content": (
                    f"{FEEDBACK_PROMPT.format(pronunciation_data=pronunciation_data)}"
                    f"\n\nReview our complete {session.current_subject} interview "
                    f"conversation and provide detailed feedback."
                )
            }
        ]
    }, config)

    text = response["messages"][-1].content
    cleaned = text.strip()
    if "```" in cleaned:
        cleaned = cleaned.split("```")[1].replace("json", "").strip()

    feedback = json.loads(cleaned)
    return jsonify({"success": True, "feedback": feedback})
