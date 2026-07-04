from dataclasses import dataclass
from langchain.chat_models import init_chat_model
from langgraph.checkpoint.memory import InMemorySaver
from langchain.agents import create_agent
from ..config import Config


@dataclass
class SessionState:
    question_count: int
    current_subject: str
    thread_id: str


session = SessionState(0, "", "interview_session")

model = init_chat_model(
    "google_genai:gemini-2.5-flash",
    api_key=Config.GOOGLE_API_KEY
)

agent = ""
checkpointer = ""


def reset_agent(subject: str):
    global agent, checkpointer
    session.current_subject = subject
    session.question_count = 1
    checkpointer = InMemorySaver()
    agenilt = create_agent(
        model=model,
        tools=[],
        checkpointer=checkpointer
    )


def invoke_agent(messages, config):
    return agent.invoke(messages, config)
