#!/usr/bin/env python3
"""Generate narration audio for the AgentReady demo video with pocket-tts.

Reads ../narration.json (single source of truth shared with Remotion) and
writes one wav per scene to ../public/audio/<scene-id>.wav. Prints each clip's
duration next to its scene budget so overruns are obvious.

Setup (from video/):
  python3 -m venv tts/.venv
  tts/.venv/bin/pip install -r tts/requirements.txt
Run (from video/):
  npm run audio          # or: tts/.venv/bin/python tts/generate_audio.py
Then set HAS_AUDIO = true in src/scenes.ts.
"""

import json
import os
import sys

VOICE = os.environ.get("TTS_VOICE", "alba")  # kyutai catalog voice (en)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "public", "audio")


def main() -> int:
    with open(os.path.join(ROOT, "narration.json")) as f:
        scenes = json.load(f)["scenes"]

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

    overruns = 0
    for scene in scenes:
        out = os.path.join(OUT_DIR, f"{scene['id']}.wav")
        audio = model.generate_audio(voice_state, scene["narration"])
        pcm = audio.detach().cpu().numpy()
        scipy.io.wavfile.write(out, model.sample_rate, pcm)
        secs = len(pcm) / model.sample_rate
        budget = scene["durationInSeconds"]
        flag = "" if secs <= budget else "  ← OVERRUN: raise durationInSeconds"
        if secs > budget:
            overruns += 1
        print(f"  {scene['id']:<10} {secs:5.1f}s / {budget}s budget{flag}")

    print(f"\nwrote {len(scenes)} clips to public/audio/")
    if overruns:
        print(f"{overruns} scene(s) overrun their budget — bump durationInSeconds in narration.json")
    else:
        print("all clips fit — set HAS_AUDIO = true in src/scenes.ts")
    return 0


if __name__ == "__main__":
    sys.exit(main())
