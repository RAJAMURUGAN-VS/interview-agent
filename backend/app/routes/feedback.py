from flask import Blueprint, request, jsonify
from ..services import agent_service
from ..utils.prompts import FEEDBACK_PROMPT
import json

bp = Blueprint('feedback', __name__)


@bp.route("/get-feedback", methods=["POST"])
def get_feedback():
    """Generate detailed interview feedback"""
    config = {"configurable": {"thread_id": agent_service.session.thread_id}}
    response = agent_service.invoke_agent({
        "messages": [
            {
                "role": "user",
                "content": f"{FEEDBACK_PROMPT}\n\nReview our complete {agent_service.session.current_subject} interview conversation and provide detailed feedback."
            }
        ]
    }, config)
    text = response["messages"][-1].content
    cleaned = text.strip()
    if "```" in cleaned:
        cleaned = cleaned.split("```")[1].replace("json", "").strip()
    feedback = json.loads(cleaned)

    return jsonify({"success": True, "feedback": feedback})
