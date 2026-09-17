import sys
import os
import threading

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

from faster_whisper import WhisperModel

_model = None
_model_lock = threading.Lock()

def get_whisper_model(model_size: str = "tiny"):
    """
    Returns the singleton WhisperModel instance.
    Defaults to 'tiny' for fast real-time inference on CPU with int8 quantization.
    """
    global _model
    with _model_lock:
        if _model is None:
            env_size = os.getenv("WHISPER_MODEL_SIZE", model_size)
            print(f"[KeyT Speech AI] Loading faster-whisper model: {env_size} (CPU, int8)...")
            _model = WhisperModel(env_size, device="cpu", compute_type="int8")
            print("[KeyT Speech AI] faster-whisper model loaded successfully!")
    return _model



def transcribe_japanese_audio(wav_path: str) -> dict:
    """
    Transcribes audio file using faster-whisper with word-level timestamps.
    Returns:
      transcript: str
      words: list of dicts with word, start, end, probability
      language: str
      duration: float
    """
    model = get_whisper_model()
    
    segments, info = model.transcribe(
        wav_path,
        language="ja",
        task="transcribe",
        beam_size=5,
        word_timestamps=True,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=400)
    )

    full_transcript = []
    word_list = []

    for seg in segments:
        full_transcript.append(seg.text)
        if seg.words:
            for w in seg.words:
                word_list.append({
                    "word": w.word.strip(),
                    "start": round(w.start, 2),
                    "end": round(w.end, 2),
                    "probability": round(w.probability, 3)
                })

    joined_transcript = "".join(full_transcript).strip()

    return {
        "transcript": joined_transcript,
        "words": word_list,
        "language": info.language,
        "duration": round(info.duration, 2)
    }
