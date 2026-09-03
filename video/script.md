# AgentReady — 3-minute demo video (production script)

Five scenes, 180 seconds, 1920×1080 @ 30fps. Narration lives in
`narration.json` (single source of truth — the TTS generator and the Remotion
compositions both read it). Screen recordings drop into `public/recordings/`
as `<scene-id>.mp4`; until they exist each scene renders a styled placeholder.

| # | id | time | on screen | narration (gist) |
|---|----|------|-----------|------------------|
| 1 | `hook` | 0:00–0:20 | Title card → readiness spectrum on the live dashboard | Can an agent use your website? We built the measuring instrument. |
| 2 | `benchmark` | 0:20–0:50 | Scoreboard scroll → site detail: UI vs WebMCP delta (success %, steps) | Same task, two modes. The gap is the case for agent-native. |
| 3 | `copilot` | 0:50–1:50 | Agent drafts report into on-page editor; human edits; agent reads edits back (`get_report_draft`); `queue_live_audit` fires a real serverless audit | Two authors, one document. The agent queues a real audit on Cloudflare. |
| 4 | `store` | 1:50–2:30 | `/store`: shared cart demo (trek under ₹10,000) → flip to `/live` analytics stream | Shared cart, every call instrumented. Any site gets this by wrapping registerTool. |
| 5 | `close` | 2:30–3:00 | Logo, three pillars, repo + live URL | Benchmark, reference implementation, analytics layer. MIT. All-Cloudflare. |

## Recording checklist (screen captures to make)

1. **hook.mp4** — slow scroll of the readiness spectrum at `/`.
2. **benchmark.mp4** — scoreboard scroll, click into the demo store's site detail, hover the UI-vs-WebMCP numbers.
3. **copilot.mp4** — in a WebMCP browser (ChatGPT in-app or Chrome flag): ask *"Which sites are least agent-ready, why do they fail, draft me a one-page readiness report"*; show tool calls in the activity panel; edit a line by hand; ask *"Tighten the summary but keep my edits"*; show `get_report_draft` firing first. Then: *"Queue a live audit of /store and read back the results."*
4. **store.mp4** — on `/store`: *"Kit me out for a weekend trek under ₹10,000 — check my cart first."* Cart updates live. Flip to `/live`.
5. **close.mp4** — optional; the close scene works as a pure title card.

## Build pipeline

```bash
cd video
npm install                      # remotion + react
python3 -m venv tts/.venv && tts/.venv/bin/pip install -r tts/requirements.txt
npm run audio                    # pocket-tts → public/audio/<scene>.wav
npm run dev                      # Remotion Studio: preview & tweak
npm run render                   # → out/agentready-demo.mp4
```

After `npm run audio`, the generator prints each clip's real duration —
if narration overruns a scene, bump that scene's `durationInSeconds` in
`narration.json` (compositions and audio stay in sync automatically).
