import os
import subprocess
import tempfile
import numpy as np
import soundfile as sf

def convert_audio_to_wav(input_bytes: bytes, output_path: str = None) -> str:
    """
    Converts input audio bytes (e.g. webm, opus, mp3) to 16kHz 16-bit mono WAV.
    Returns the path to the converted WAV file.
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=".input") as tmp_in:
        tmp_in.write(input_bytes)
        tmp_in_path = tmp_in.name

    if not output_path:
        tmp_out = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
        output_path = tmp_out.name
        tmp_out.close()

    try:
        # Run ffmpeg command: -y (overwrite), -i (input), -ar 16000 (16kHz), -ac 1 (mono), -acodec pcm_s16le
        cmd = [
            "ffmpeg",
            "-y",
            "-i", tmp_in_path,
            "-ar", "16000",
            "-ac", "1",
            "-c:a", "pcm_s16le",
            output_path
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return output_path
    finally:
        if os.path.exists(tmp_in_path):
            try:
                os.remove(tmp_in_path)
            except Exception:
                pass


def analyze_audio_pauses(wav_path: str, frame_duration_ms: int = 30, threshold_db: float = -35.0):
    """
    Analyzes silence intervals and pauses in a 16kHz mono WAV file.
    Returns:
      total_duration_sec: float
      speech_duration_sec: float
      silence_duration_sec: float
      hesitation_count: int (number of pauses > 1.0 second)
      pauses: list of dicts with start, end, duration
    """
    data, sample_rate = sf.read(wav_path)
    if data.ndim > 1:
        data = np.mean(data, axis=1)

    total_samples = len(data)
    total_duration_sec = total_samples / sample_rate

    frame_len = int(sample_rate * (frame_duration_ms / 1000.0))
    if frame_len == 0 or total_samples == 0:
        return {
            "total_duration_sec": 0.0,
            "speech_duration_sec": 0.0,
            "silence_duration_sec": 0.0,
            "hesitation_count": 0,
            "pauses": []
        }

    # Compute RMS energy per frame
    num_frames = total_samples // frame_len
    energies = []
    for i in range(num_frames):
        frame = data[i * frame_len : (i + 1) * frame_len]
        rms = np.sqrt(np.mean(frame ** 2) + 1e-12)
        db = 20 * np.log10(rms)
        energies.append(db > threshold_db)

    # Group silent frames
    pauses = []
    in_silence = False
    silence_start = 0.0

    for i, is_speech in enumerate(energies):
        time_sec = (i * frame_len) / sample_rate
        if not is_speech:
            if not in_silence:
                in_silence = True
                silence_start = time_sec
        else:
            if in_silence:
                in_silence = False
                silence_dur = time_sec - silence_start
                if silence_dur >= 0.4:  # At least 400ms to consider a pause
                    pauses.append({
                        "start": round(silence_start, 2),
                        "end": round(time_sec, 2),
                        "duration": round(silence_dur, 2)
                    })

    if in_silence:
        silence_dur = total_duration_sec - silence_start
        if silence_dur >= 0.4:
            pauses.append({
                "start": round(silence_start, 2),
                "end": round(total_duration_sec, 2),
                "duration": round(silence_dur, 2)
            })

    total_silence = sum(p["duration"] for p in pauses)
    hesitation_count = sum(1 for p in pauses if p["duration"] >= 1.0)
    speech_duration = max(0.1, total_duration_sec - total_silence)

    return {
        "total_duration_sec": round(total_duration_sec, 2),
        "speech_duration_sec": round(speech_duration, 2),
        "silence_duration_sec": round(total_silence, 2),
        "hesitation_count": hesitation_count,
        "pauses": pauses
    }
