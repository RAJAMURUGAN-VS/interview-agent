from dataclasses import dataclass, field
from typing import Any

from langchain.chat_models import init_chat_model
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage

from ..config import Config


@dataclass
class SessionState:
    question_count: int
    current_subject: str
    current_department: str
    thread_id: str
    pronunciation_log: list = field(default_factory=list)


session = SessionState(0, "", "", "interview_session")

model = init_chat_model(
    "perplexity:sonar",
    api_key=Config.PERPLEXITY_API_KEY
)

# Conversation history stored as plain dicts — no LangGraph checkpointer needed.
# Key: thread_id, Value: list of {"role": ..., "content": ...} message dicts
_conversation_history: dict[str, list[dict[str, str]]] = {}


def reset_agent(subject: str) -> None:
    """Reset the session for a new interview and clear conversation history."""
    session.current_subject = subject
    session.current_department = ""
    session.question_count = 1
    session.pronunciation_log = []
    _conversation_history[session.thread_id] = []


def invoke_agent(messages_input: dict[str, Any], config: dict) -> dict[str, Any]:
    """
    Invoke the LLM with the accumulated conversation history.

    Accepts the same input shape that the interview routes pass:
        {"messages": [{"role": ..., "content": ...}, ...]}

    Returns a dict shaped like a LangGraph state:
        {"messages": [...all messages including the new AIMessage...]}
    """
    thread_id = config.get("configurable", {}).get("thread_id", session.thread_id)

    if thread_id not in _conversation_history:
        _conversation_history[thread_id] = []

    history = _conversation_history[thread_id]

    # Merge incoming messages with history. New messages are appended.
    new_messages: list[dict[str, str]] = messages_input.get("messages", [])

    # Build the full prompt: history + new messages
    full_messages = history + new_messages

    # Call the model with plain message dicts (langchain accepts these natively)
    response = model.invoke(full_messages)

    # Extract plain text content — discard SDK-specific metadata objects
    # that would fail msgpack serialization if checkpointed.
    answer = response.content if hasattr(response, "content") else str(response)

    # Persist only the serializable parts of the exchange to history
    for msg in new_messages:
        history.append({"role": msg["role"], "content": msg.get("content", "")})
    history.append({"role": "assistant", "content": answer})

    _conversation_history[thread_id] = history

    # Return a dict that mirrors the LangGraph MessagesState shape
    # so all existing callers (response["messages"][-1].content) keep working.
    all_messages = [
        AIMessage(content=m["content"]) if m["role"] == "assistant"
        else HumanMessage(content=m["content"]) if m["role"] == "user"
        else SystemMessage(content=m["content"])
        for m in history
    ]

    return {"messages": all_messages}
