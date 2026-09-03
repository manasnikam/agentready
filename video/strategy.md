# AgentReady — 3-Minute Video Strategy Memo
For: scriptwriter + editor. Source: actual WebMCP Challenge criteria (webmcp.devpost.com, fetched 2026-09-04).
Judging: WebMCP Leverage / Execution / Potential Impact / Creativity & Ambition (unweighted, so treat as equal).
Prizes: 10 winners x $3,500 — we are not fighting for 1st place, we are fighting to be top-10 undeniable.
Video rule: under 3:00, public YouTube, with audio. Hard-cut at 2:55 to be safe.

## 1. Criteria to nail (in priority order)
1. **WebMCP Leverage** — our strongest card: 13 real tools, two surfaces, and tools that WRITE and TRIGGER
   (queue_live_audit fires a real serverless pipeline; get_report_draft reads human edits back). Most rivals
   will demo 3 read-only tools. Show tool NAMES on screen every time one fires — judges score what they can see.
2. **Potential Impact** — the meta-play: AgentReady doesn't just *use* WebMCP, it *measures whether the rest
   of the web needs it*. One line of script must land this: "Every site that adopts WebMCP will ask 'did it
   work?' — this is the benchmark that answers." That's a real audience (site owners) and a specific problem.
3. **Creativity & Ambition** — the recursion sells itself: a WebMCP app that benchmarks WebMCP, and audits its
   own demo store. Say the word "benchmark" early; judges file projects by category and "the benchmark entry"
   is a category of one. Execution is proven implicitly by everything being live — don't spend seconds on it.

## 2. Narrative spine — validated, with one upgrade
"0/3 vs 3/3" is the right spine — keep it. Upgrade: frame it as **evidence, not claim**. The story is:
"Everyone says agents struggle with UIs. We stopped arguing and built the instrument that measures it. Here's
the reading: 0/3 through the UI, 3/3 through WebMCP, on the same site, same task, same agent." The gap is the
hook; the INSTRUMENT is the product; the copilot + live-audit scenes prove the instrument is real. Every scene
must either show the gap or show the machine that measured it. Anything else gets cut.

## 3. Shot-by-shot: 5 scenes, 180 seconds

**Scene 1 — Hook (0:00–0:20)**
- On screen: split view — left, headless-agent trace grinding through the raw store UI and timing out at step
  15; right, the same task via tools completing in 4 steps. Then a hard cut to the scorecard: 0/3 vs 3/3.
- VO: "Same website. Same task. Same AI agent. Through the UI: zero for three. Through WebMCP: three for
  three. AgentReady is the benchmark that measures this gap — for any site." Title card 2s max.
- Cut: any logo animation, any "the web is changing" throat-clearing. Cold-open on the data.

**Scene 2 — Benchmark dashboard (0:20–0:55)**
- On screen: live dashboard at the real URL (URL bar visible — proves it's deployed). Agent in Chrome/ChatGPT
  calls list_audited_sites → get_site_score → get_failure_breakdown, tool names visible as they fire. Show the
  100/100 score AND the failure breakdown of the UI runs (the 15-step timeouts) — the autopsy is the credibility.
- VO explains scoring in one sentence: "Each site gets audited twice — raw UI vs WebMCP tools — and scored 0-100."
- Cut: scrolling through UI features, explaining the methodology beyond one sentence.

**Scene 3 — Copilot co-writing (0:55–1:40) — the centerpiece, largest time block**
- On screen, uninterrupted: (a) agent calls draft_readiness_report — text appears in the ON-PAGE editor;
  (b) HUMAN clicks in and edits a sentence, visibly typing; (c) agent calls get_report_draft and quotes the
  human's edit back before revising. Then queue_live_audit fires a REAL audit (Queues → Browser Run → Workers
  AI → D1) and get_live_audit_results reads it back — show /live streaming the tool calls as it happens.
- VO: "This is bidirectional. The page is shared workspace: the agent writes, I edit, the agent reads my edits
  back through a tool. And it can trigger a real headless-browser audit and read the results." Name the
  Cloudflare pipeline in one breath — sponsor is in the judge pool.
- Cut: nothing here; protect this block. If time is tight, trim Scene 4 instead.

**Scene 4 — Store (1:40–2:15)**
- On screen: agent runs search_products → add_to_cart → view_cart → start_checkout; human adds a second item
  by clicking — one shared cart updates from both sides. One line: "This store is also our test subject — it's
  the site the benchmark audited in Scene 1." That closes the loop.
- Cut: browsing multiple products, checkout details, any second task.

**Scene 5 — Close (2:15–2:50)**
- On screen: /live analytics streaming real tool calls; then a single slide: 13 tools, 2 surfaces, real
  serverless audits, MIT, live URL + repo. End frame holds URL 3+ seconds.
- VO: "As the web adds WebMCP, every site will ask: are we agent-ready? Now there's a number for that. Audit
  your site — it's live today." No music swell needed; end on the question judges will repeat to each other.

## 4. Three judge moments (the rewind seconds)
1. **~0:08 — the 0/3 vs 3/3 scorecard.** Real measured data, same agent, same task. Judges rewind to verify
   it says what they think it says. Make the numbers huge and hold 2 full seconds.
2. **~1:15 — the agent quotes the human's edit back.** get_report_draft returning text the viewer just watched
   a human type is the single most novel WebMCP use in the video — the page as two-way channel, not a tool
   facade. No one else will have this. Slow the pacing right here.
3. **~1:35 — queue_live_audit visibly kicks off real infrastructure** and /live lights up with the tool-call
   stream. It proves the whole thing isn't a canned demo: the benchmark is running, on camera, in production.

## 5. Messaging do's and don'ts
DO:
- Lead with measured numbers; say "three of three runs" and "all three UI runs timed out at 15 steps" — the
  small sample stated plainly reads as scientific honesty, and honesty is rare in hackathon videos. Own it:
  "early data, real methodology."
- Show tool names on screen at every call (lower-third or /live feed). WebMCP Leverage is scored on visible use.
- Keep the URL bar in frame — "live, not localhost" is Execution proof that costs zero seconds.
- Say "benchmark" and "agent-ready score" repeatedly; own the category noun.
DON'T:
- Don't claim "we tested the whole web" or project industry-wide stats from n=3 — one overclaim poisons the
  real data. The demo store result is the proof of method, not a market study.
- Don't explain WebMCP itself — judges know it; every second of protocol tutorial is a second of demo lost.
- Don't show code, config, or architecture diagrams; name the stack verbally over live footage instead.
- Don't use AI-generated b-roll, stock footage, or a synthetic voiceover if avoidable — real screen capture
  with a human voice matches the project's honesty positioning.
- Don't end on a feature list; end on the category claim: the readiness benchmark for the agent-native web.
