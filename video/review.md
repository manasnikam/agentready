# Final Judge-Eyes Review — agentready-demo.mp4 (170s cut)

Reviewed by frame extraction at ~10s intervals plus targeted frames (0-5s, 15-25s, 90-97s, 122-124s)
and ffmpeg silencedetect on the narration track. Frames in /Users/manasnikam/project/prescale-systems/agentready/.omc/.

## Verdict: SHIP AFTER ONE TRIM PASS — content is winning, pacing is not.
Every judge moment is present, real, and readable at 1080p. But ~72 of 170 seconds are silent,
including an 18s silent stretch that swallows the queue_live_audit moment and a ~32s static end card.
The cut currently reads as a 135-second video padded to 170.

## Scores against the actual criteria (video's contribution)
- WebMCP Leverage: 9/10 — 12+ tool names visibly fire (lower-third pills, activity logs, /live
  calls-by-tool table). start_checkout pill lands at ~124s. Nothing looks trivial.
- Execution: 8/10 — live URL chip on every recording scene, real pages, real run log. Docked for
  a ~1s gray dead frame at 0:00, a ~2s blank white page at ~0:20, and dead-air holds.
- Potential Impact: 8/10 — "the readiness benchmark" tagline lands at ~0:15; close question is clean.
- Creativity & Ambition: 9/10 — co-writing readback and self-audit are on screen, not just claimed.

## (a) Judge moments — verdict per moment
1. Scorecard 0/3 vs 3/3 (~0:05–0:17): PRESENT, NAILED. Huge type, red/green, "all 3 runs timed out
   at 15 steps" vs "~4 steps average", benchmark tagline below. Readable from across a room.
2. Human-edit readback (~1:20): PRESENT, NAILED. Agent draft lands (~60s), human visibly types
   "Priority: fix the checkout flow first — that's where agents die." (~70s), get_report_draft
   overlay quotes it back with the human's sentence highlighted in yellow (~80s). Best moment in the cut.
3. queue_live_audit on /live (~1:33–1:37): PRESENT BUT UNDERSOLD. The /live page shows
   queue_live_audit (1 call, ok 1030ms) in table and event stream — real infra, on camera. But it
   sits inside an 18s narration gap (82–100s): nothing tells the judge this is a REAL serverless
   audit firing. The one moment that proves it isn't canned currently plays as silent B-roll.

## (b) Defects that would cost points
1. DEAD AIR (biggest cost). Silence gaps: 12–20s (8s), 41–55s (14s), 82–100s (18s), 120–135s (15s),
   153–170s (17s). Judges screening dozens of entries will scrub or drop off. The 82–100s gap is the
   most damaging — it silences judge moment 3.
2. STATIC END CARD ~32s (≈138–170s). "Are you agent-ready?" card is great; holding it a third of a
   minute reads as padding. URL is absent on the card's first seconds (visible by 145s) — fine once
   trimmed.
3. BLANK FRAMES. 0:00 is a solid gray frame (hook fades in late); ~0:20 is an unloaded white page at
   the benchmark scene's start (loaded by ~22s). Both read as render glitches to a critical eye.
4. WASHED-OUT OVERLAY at ~90s: the get_live_audit_results JSON panel is near-invisible (pale gray on
   light page). Either make it legible or cut it — the /live hard cut at 93s already proves the point.
5. MINOR: at 122–124s the start_checkout pill fires over a /live recording whose calls-by-tool table
   doesn't yet list start_checkout (older capture). Low risk; only fix if re-rendering anyway.
6. Synthetic VO: clarity is acceptable and does not materially hurt — the honesty positioning survives.
   What hurts is that there is too little of it, not its synthesis.

## (c) Fixes, ranked by impact (all Remotion re-render / trim — no re-recording)
1. TRIM 25–30s OF HOLDS: cut the 41–55s static site-detail hold to ~4s, tighten 12–20s to ~3s,
   cut the end card from ~32s to 8–10s (URL on screen the whole time). Target runtime ≈ 140s.
   This alone converts the cut from "padded" to "relentless".
2. ADD 2 NARRATION LINES (pocket-tts, drop-in audio, no visual change): over 90–98s — "queue_live_audit
   just triggered a real serverless audit — headless Chrome, Workers AI, live results, on camera";
   over 120–128s — one line closing the loop ("this store is the same site the benchmark scored").
   Fills the two most damaging silences exactly where judge moment 3 and the store climax land.
3. FIX THE THREE COSMETIC FRAMES: start the hook overlay at frame 0 (no gray frame), shift the
   benchmark recording in-point ~2s so the page is loaded on entry, and raise the ~90s
   get_live_audit_results overlay to the dark high-contrast style used at 80s and 110s (or delete it).

Nothing here requires re-recording. Fix 1 + 2 move this from a top-25% video to a top-10 video;
fix 3 is polish. The evidence on screen is already better than what most entries will have.
