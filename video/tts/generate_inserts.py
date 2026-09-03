#!/usr/bin/env python3
"""Generate the two insert narration clips for the AgentReady demo video.

These are drop-in lines (review fix #2) layered at offsets inside the copilot
and store scenes; the five main scene wavs from generate_audio.py are untouched.
Writes ../public/audio/<id>.wav and prints each clip's duration.

Run (from video/):
  tts/.venv/bin/python tts/generate_inserts.py
"""

import os
import sys

VOICE = os.environ.get("TTS_VOICE", "alba")  # kyutai catalog voice (en)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "public", "audio")

INSERTS = [
    {
        "id": "copilot-insert",
        "text": (
            "That call just triggered a real serverless audit. Headless "
            "Chrome, a Workers A I agent, live results, on camera."
        ),
    },
    {
        "id": "store-insert",
        "text": (
            "And this store is the same site the benchmark scored: zero "
            "for three through the U I."
        ),
    },
]


def main() -> int:
    try:
        import scipy.io.wavfile
        from pocket_tts import TTSModel
    except ImportError as e:
        print(f"missing dependency ({e}); run: tts/.venv/bin/pip install -r tts/requirements.txt")
        return 1

    os.makedirs(OUT_DIR, exist_ok=True)
    print(f"loading pocket-tts model (voice: {VOICE})…")
    model = TTSModel.load_model()
    voice_state = model.get_state_for_audio_prompt(VOICE)

    for insert in INSERTS:
        out = os.path.join(OUT_DIR, f"{insert['id']}.wav")
        audio = model.generate_audio(voice_state, insert["text"])
        pcm = audio.detach().cpu().numpy()
        scipy.io.wavfile.write(out, model.sample_rate, pcm)
        secs = len(pcm) / model.sample_rate
        print(f"  {insert['id']:<16} {secs:5.1f}s -> {out}")

    print(f"\nwrote {len(INSERTS)} insert clips to public/audio/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
