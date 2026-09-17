import sys
import os
import shutil
import tempfile

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from services.audio_service import convert_audio_to_wav, analyze_audio_pauses
from services.asr_service import transcribe_japanese_audio, get_whisper_model
from services.scoring_engine import evaluate_pronunciation

app = FastAPI(
    title="KeyT Japanese Speech AI Service",
    description="Microservice for Japanese speech recognition and pronunciation evaluation in FE Exam",
    version="1.0.0"
)

# Allow CORS for Frontend and Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    print("[KeyT Speech AI] KeyT Speech AI Service starting...")
    try:
        get_whisper_model("tiny")
        print("[KeyT Speech AI] Models initialized successfully!")
    except Exception as e:
        print(f"[KeyT Speech AI] Preload warning: {e}")


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "keyt-speech-ai",
        "version": "1.0.0"
    }


class TextEvaluationRequest(BaseModel):
    expectedText: str
    spokenText: str
    speechDurationSec: Optional[float] = 3.0
    hesitationCount: Optional[int] = 0


@app.post("/api/pronunciation/evaluate-text")
def evaluate_text_only(payload: TextEvaluationRequest):
    """
    Evaluates pronunciation by comparing expected text with a provided transcript directly.
    Useful for testing, debug, or fallback.
    """
    fake_asr = {
        "transcript": payload.spokenText,
        "words": [],
        "language": "ja",
        "duration": payload.speechDurationSec
    }
    fake_pause = {
        "total_duration_sec": payload.speechDurationSec,
        "speech_duration_sec": payload.speechDurationSec,
        "silence_duration_sec": 0.0,
        "hesitation_count": payload.hesitationCount,
        "pauses": []
    }
    result = evaluate_pronunciation(payload.expectedText, fake_asr, fake_pause)
    return {"success": True, "data": result}


@app.post("/api/pronunciation/evaluate")
async def evaluate_audio(
    audio: UploadFile = File(...),
    expectedText: str = Form(...),
    courseCode: Optional[str] = Form("jpd123"),
    passageId: Optional[str] = Form(None)
):
    """
    Full pipeline:
    1. Receive user audio (.webm, .wav, .mp3, .m4a)
    2. Transcode to 16kHz mono 16-bit WAV with FFmpeg
    3. Analyze pause intervals and speech rate with Silero/Energy VAD
    4. Speech-to-Text with faster-whisper (extract words, timestamps, confidences)
    5. Morphological analysis with Fugashi + UniDic
    6. Score with 4-criteria rubric (Accuracy, Pronunciation, Fluency, Rhythm)
    7. Return token-level evaluation with suggestions for FE UI
    """
    if not expectedText or not expectedText.strip():
        raise HTTPException(status_code=400, detail="expectedText cannot be empty.")

    # Read uploaded bytes
    audio_bytes = await audio.read()
    if not audio_bytes or len(audio_bytes) < 100:
        raise HTTPException(status_code=400, detail="Audio file is empty or corrupted.")

    wav_file_path = None
    try:
        # Step 2: Convert to clean WAV
        wav_file_path = convert_audio_to_wav(audio_bytes)

        # Step 3: Analyze pauses & silence
        pause_analysis = analyze_audio_pauses(wav_file_path)

        # Step 4: Transcribe with faster-whisper
        asr_result = transcribe_japanese_audio(wav_file_path)

        # Step 5 & 6: Score
        evaluation = evaluate_pronunciation(expectedText, asr_result, pause_analysis)
        evaluation["courseCode"] = courseCode
        evaluation["passageId"] = passageId

        return {
            "success": True,
            "data": evaluation
        }

    except Exception as e:
        print(f"❌ Error during speech evaluation: {e}")
        raise HTTPException(status_code=500, detail=f"Speech evaluation failed: {str(e)}")
    finally:
        if wav_file_path and os.path.exists(wav_file_path):
            try:
                os.remove(wav_file_path)
            except Exception:
                pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8001, reload=True)
