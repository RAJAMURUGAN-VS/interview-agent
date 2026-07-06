import assemblyai as aai
from ..config import Config

aai.settings.api_key = Config.ASSEMBLYAI_API_KEY

# Filler words to detect in the word list after transcription
FILLER_WORDS = {
    "uh", "um", "hmm", "like", "you know", "so", "actually",
    "basically", "right", "okay", "well", "i mean", "kind of",
    "sort of", "literally", "honestly",
}

# Minimum silence gap in milliseconds to count as a long pause
LONG_PAUSE_THRESHOLD_MS = 2000


def speech_to_text(audio_path: str) -> dict:
    """
    Transcribe audio using AssemblyAI with disfluencies enabled.

    Returns a dict:
    {
        "transcript": str,
        "fillers": list[dict],       # [{ "word": "um", "timestamp_ms": 1240 }]
        "long_pauses": list[dict],   # [{ "duration_ms": 2400, "after_word": "the",
                                     #    "timestamp_ms": 5100 }]
        "filler_count": int,
        "long_pause_count": int,
        "word_confidence_avg": float,
    }
    """
    transcriber = aai.Transcriber()

    config = aai.TranscriptionConfig(
        language_detection=True,
        speaker_labels=True,
        disfluencies=True,
    )

    transcript = transcriber.transcribe(audio_path, config=config)

    if not transcript or not transcript.text:
        return _empty_result()

    words = transcript.words or []

    fillers     = _extract_fillers(words)
    long_pauses = _extract_long_pauses(words)
    confidence  = _average_confidence(words)

    return {
        "transcript":          transcript.text,
        "fillers":             fillers,
        "long_pauses":         long_pauses,
        "filler_count":        len(fillers),
        "long_pause_count":    len(long_pauses),
        "word_confidence_avg": round(confidence, 3),
    }


def _extract_fillers(words: list) -> list:
    found = []
    for word_obj in words:
        word_text = (word_obj.text or "").strip().lower().rstrip(".,!?")
        if word_text in FILLER_WORDS:
            found.append({
                "word":         word_text,
                "timestamp_ms": word_obj.start,
            })
    return found


def _extract_long_pauses(words: list) -> list:
    pauses = []
    for i in range(len(words) - 1):
        gap_ms = words[i + 1].start - words[i].end
        if gap_ms >= LONG_PAUSE_THRESHOLD_MS:
            pauses.append({
                "duration_ms":  gap_ms,
                "after_word":   (words[i].text or "").strip(),
                "timestamp_ms": words[i].end,
            })
    return pauses


def _average_confidence(words: list) -> float:
    if not words:
        return 0.0
    total = sum(getattr(w, "confidence", 0.0) or 0.0 for w in words)
    return total / len(words)


def _empty_result() -> dict:
    return {
        "transcript":          "",
        "fillers":             [],
        "long_pauses":         [],
        "filler_count":        0,
        "long_pause_count":    0,
        "word_confidence_avg": 0.0,
    }
