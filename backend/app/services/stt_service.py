import assemblyai as aai
from ..config import Config

aai.settings.api_key = Config.ASSEMBLYAI_API_KEY


def speech_to_text(audio_path):
    """Convert audio file to text using AssemblyAI"""
    transcriber = aai.Transcriber()
    config = aai.TranscriptionConfig(
        speech_models=["universal-3-pro", "universal-2"],
        language_detection=True, speaker_labels=True,
    )
    transcript = transcriber.transcribe(audio_path, config=config)
    return transcript.text if transcript.text else ""
