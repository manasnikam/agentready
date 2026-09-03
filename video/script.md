# AgentReady — 3-minute demo video (production script)

Five scenes, 170 seconds (margin under the 3:00 limit), 1920×1080 @ 30fps.
Narration lives in `narration.json` (single source of truth — the TTS
generator and the Remotion compositions both read it). Screen recordings drop
into `public/recordings/` as `<scene-id>.mp4`; until they exist each scene
renders a styled placeholder.

Strategy source of truth: `strategy.md`. Spine: cold-open on the measured
0/3 vs 3/3 gap as evidence, the instrument is the product, protect the copilot
centerpiece, close on the category claim.

| # | id | time | on screen | narration (gist) |
|---|----|------|-----------|------------------|
| 1 | `hook` | 0:00–0:20 | Split view: headless-agent trace grinding through the raw store UI and timing out at step 15 (left) vs the same task via tools finishing in 4 steps (right) → hard cut to the 0/3 vs 3/3 scorecard, numbers huge, hold 2 full seconds (~0:08 judge moment). Title card 2s max. No logo animation, no throat-clearing. | Same website, same task, same agent. UI: zero for three. WebMCP: three for three. AgentReady measures the gap. |
| 2 | `benchmark` | 0:20–0:55 | Live dashboard at the real URL, URL bar in frame. Agent calls `list_audited_sites` → `get_site_score` → `get_failure_breakdown`, tool names visible as they fire. Show the 100/100 score AND the failure breakdown (three 15-step timeouts) — the autopsy is the credibility. No feature scrolling. | Audited twice — raw UI vs WebMCP tools — scored 0–100. Store: 100/100 with tools; all three UI runs timed out. Three runs: early data, real methodology. |
| 3 | `copilot` | 0:55–1:40 | THE CENTERPIECE — protect this block. First half: agent calls `draft_readiness_report` → text lands in the on-page editor; human visibly types an edit; agent calls `get_report_draft` and quotes the edit back before revising (~1:15 judge moment — slow the pacing here). Second half: `queue_live_audit` fires a REAL audit (Queues → Browser Run → Workers AI → D1) and `get_live_audit_results` reads it back while `/live` streams the tool calls (~1:35 judge moment). | Bidirectional: agent writes, I edit, agent reads my edit back through a tool. Then one tool call triggers a real headless-browser audit on Cloudflare and reads the results. |
| 4 | `store` | 1:40–2:15 | `/store`: agent runs `search_products` → `add_to_cart` → `view_cart` → `start_checkout`; human clicks a second item in — one shared cart updates from both sides. No product browsing, no checkout detail, no second task. | Agent shops through tools, I click, one shared cart. This store is the test subject — the exact site the benchmark scored 0/3 through the UI. |
| 5 | `close` | 2:15–2:50 | `/live` analytics streaming real tool calls → single slide: 13 tools, 2 surfaces, real serverless audits, MIT, live URL + repo. End frame holds the URL 3+ seconds. No feature list, no music swell. | 13 tools, 2 surfaces, MIT. Every site that adopts WebMCP will ask "did it work?" — this is the benchmark that answers. Audit your site — live today. |

## Recording checklist (screen captures to make)

1. **hook.mp4** — split-screen: raw-UI agent trace timing out at step 15 vs the
   4-step tool run, then the 0/3 vs 3/3 scorecard held for 2 seconds.
2. **benchmark.mp4** — live dashboard (URL bar visible): agent fires
   `list_audited_sites` → `get_site_score` → `get_failure_breakdown`; linger on
   the 100/100 score and the three 15-step UI timeouts.
3. **copilot.mp4** — in a WebMCP browser: ask *"Draft me a readiness report for
   the demo store"*; show `draft_readiness_report` landing in the on-page
   editor; edit a line by hand, visibly typing; ask *"Tighten the summary but
   keep my edits"*; show `get_report_draft` firing first and the reply quoting
   the human edit.
4. **liveaudit.mp4** — folded into the second half of the copilot scene (there
   is no separate scene for it): *"Queue a live audit of /store and read back
   the results."* Capture `queue_live_audit` firing, `/live` lighting up with
   the streamed tool calls, and `get_live_audit_results` returning. Editor
   note: cut copilot.mp4 → liveaudit.mp4 back-to-back inside scene 3's 45s.
5. **store.mp4** — on `/store`: agent runs search → add-to-cart → view-cart →
   start-checkout while the human clicks a second item in; hold on the shared
   cart updating from both sides.
6. **close.mp4** — optional; `/live` stream then the stats/URL title card works
   as a pure card if no capture.

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
every clip must fit its scene budget with at least 3 seconds of headroom;
if one is tight, shorten the narration in `narration.json` and regenerate
(compositions and audio stay in sync automatically).
