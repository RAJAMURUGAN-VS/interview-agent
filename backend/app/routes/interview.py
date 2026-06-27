from flask import Blueprint, request, Response
from ..services import agent_service, stt_service, tts_service
from ..utils.prompts import INTERVIEW_PROMPT
import os
import tempfile

bp = Blueprint('interview', __name__)


@bp.route("/start-interview", methods=["POST"])
def start_interview():
    data = request.json
    subject = data.get("subject", "Python")
    agent_service.reset_agent(subject)

    config = {"configurable": {"thread_id": agent_service.session.thread_id}}
    formatted_prompt = INTERVIEW_PROMPT.format(subject=agent_service.session.current_subject)
    response = agent_service.invoke_agent({
        "messages": [
            {"role": "system", "content": formatted_prompt},
            {"role": "user", "content": f"Start the interview with a warm greeting and ask the first question about {agent_service.session.current_subject}. Keep it SHORT (1-2 sentences)."}
        ]
    }, config)
    question = response["messages"][-1].content
    print(f"\n[Question {agent_service.session.question_count}] {question}")
    return tts_service.stream_audio(question), {"Content-Type": "text/plain"}


@bp.route("/submit-answer", methods=["POST"])
def submit_answer():
    """Process user's answer and generate next question"""
    audio_file = request.files["audio"]

    temp_path = tempfile.NamedTemporaryFile(delete=False, suffix=".webm").name
    audio_file.save(temp_path)

    answer = stt_service.speech_to_text(temp_path)
    os.unlink(temp_path)

    if not answer or answer.strip() == "":
        answer = "[Candidate provided a verbal response]"

    config = {"configurable": {"thread_id": agent_service.session.thread_id}}

    agent_service.invoke_agent({"messages": [{"role": "user", "content": answer}]}, config)

    if agent_service.session.question_count >= 5:
        response = agent_service.invoke_agent({
            "messages": [{"role": "user", "content": "That was the 5th question. Briefly acknowledge their ACTUAL answer and let them know the interview is complete. Keep it SHORT."}]
        }, config)

        closing_message = response["messages"][-1].content
        print(f"\n[Closing] {closing_message}")

        return Response(
            tts_service.stream_audio(closing_message),
            mimetype='text/plain',
            headers={'X-Interview-Complete': 'true'}
        )

    agent_service.session.question_count += 1

    prompt = f"""The candidate just answered question {agent_service.session.question_count - 1}.

Look at their ACTUAL answer above. Do NOT assume or make up what they said.

Now ask question {agent_service.session.question_count} of 5:
1. Briefly acknowledge what they ACTUALLY said (1 sentence) - quote their exact words if needed
2. Ask your next question that builds on their REAL response (1-2 sentences)
3. If they said "I don't know" or gave a wrong answer, acknowledge that and ask something simpler
4. Keep the TOTAL response under 3 sentences

Be conversational but CONCISE. Only reference what they truly said."""

    response = agent_service.invoke_agent({"messages": [{"role": "user", "content": prompt}]}, config)

    question = response["messages"][-1].content
    print(f"\n[Question {agent_service.session.question_count}] {question}")

    return Response(
        tts_service.stream_audio(question),
        mimetype='text/plain',
        headers={'X-Question-Number': str(agent_service.session.question_count)}
    )
