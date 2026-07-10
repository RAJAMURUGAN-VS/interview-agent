from dataclasses import dataclass, field
from langchain.chat_models import init_chat_model
from langgraph.checkpoint.memory import InMemorySaver
from langchain.agents import create_agent
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
    "google_genai:gemini-3.5-flash",
    api_key=Config.GOOGLE_API_KEY
)

agent = None
checkpointer = None


def reset_agent(subject: str):
    global agent, checkpointer
    session.current_subject = subject
    session.current_department = ""
    session.question_count = 1
    session.pronunciation_log = []
    checkpointer = InMemorySaver()
    agent = create_agent(
        model=model,
        tools=[],
        checkpointer=checkpointer
    )


def invoke_agent(messages, config):
    global agent, checkpointer
    if agent is None:
        reset_agent(session.current_subject or "Python")
    return agent.invoke(messages, config)
