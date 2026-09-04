# Devpost submission draft

## Project name
AgentReady — the readiness benchmark for the agent-native web

## Elevator (191 chars — Devpost limit is 200)
Can an AI agent actually use your website? AgentReady runs real agents through
your raw UI and your WebMCP tools, scores the site 0-100, and publishes the
gap. Measured: UI 0/3 vs WebMCP 3/3.

### Long version (for the description body)
Nobody can answer the most basic question of the agent era: *can an AI agent
actually use my website?* AgentReady measures it. We run real agents against
real task flows — once through the raw UI, once through WebMCP tools — score
every site 0–100, and publish the gap. Then we hand analysts a WebMCP-native
dashboard where their own agent queries the benchmark, diagnoses failures, and
co-writes the readiness report with them in a shared editor.

## Why this use case is a strong fit for WebMCP
AgentReady is WebMCP three times over: (1) it *measures* WebMCP's value — in
serverless audits of our own demo store, agents completed the task 3/3 times
via WebMCP tools in ~4 steps, and 0/3 times through the raw UI (all timed out); (2) the dashboard itself is an agent-native app — eight tools
let your agent analyze the benchmark alongside you; (3) our instrumentation SDK
wraps registerTool so every agent call becomes analytics — the observability
layer the agent-native web will need.

## How it creates a better user experience
An analyst and their agent work one shared surface: the agent queries scores,
compares sites, and drafts the report directly into the on-page editor; the
human edits; the agent reads those edits back (get_report_draft) before
revising. In the store, the agent respects what the human already put in the
cart (view_cart) and the human watches every agent action land live.

## What people and agents can do together that was difficult or impossible before
Before: businesses had zero visibility into agent success on their sites, and
"agent + human" meant copy-pasting between a chat window and a webpage.
Now: a live, inspectable benchmark of agent readiness — and a working pattern
for bidirectional human/agent collaboration on shared state (report editor,
shared cart), with every tool call observable in real time.

## How we implemented WebMCP
document.modelContext.registerTool (navigator fallback) via a small shim
(lib/webmcp.ts) that also instruments every execution and mirrors tools to a
page registry the audit agent drives headlessly. 13 tools across two surfaces.
The queue_live_audit tool is WebMCP eating its own dogfood: the judge's agent
calls a tool that enqueues a Cloudflare Queues job; a consumer Worker opens a
Browser Run browser, a Workers AI agent completes the task via the site's own
WebMCP tools, results persist to D1, and the agent reads them back with
get_live_audit_results. Entire stack: vinext + Workers + D1 + Queues +
Browser Run + Workers AI. Open methodology; MIT.

## Links
- Live: https://agentready.prescalesystems.workers.dev
- Repo: https://github.com/manasnikam/agentready (MIT license visible in About)
- Video: https://youtu.be/FuYCuj_4Tmw

---

## Devpost story sections

## Inspiration
Everyone in the agent era repeats the same claim — "AI agents struggle to use websites" — and nobody measures it. Site owners have zero visibility into whether an agent can actually finish a checkout on their site, and WebMCP adopters have no way to prove the investment worked. We stopped arguing and built the measuring instrument.

## What it does
AgentReady is the readiness benchmark for the agent-native web. It runs real AI agents against real task flows on a site twice — once through the raw UI, once through the site's WebMCP tools — and scores the site 0–100 from success rate, tool surface, and steps-to-complete, with a failure taxonomy (auth walls, popups, navigation loops, timeouts) explaining every miss. The benchmark's own dashboard is agent-native: 8 WebMCP tools let your agent query scores, compare sites, and co-write a readiness report with you in a shared on-page editor — it drafts, you edit by hand, and it reads your edits back through a tool before revising. Its `queue_live_audit` tool triggers a real serverless audit — headless browser, LLM agent, results into the database — that your agent then reads back. A demo store with 5 more tools (one cart shared between human and agent) is the reference implementation, and every tool call on the deployment streams to a live analytics view. Measured result on our own store: raw UI 0/3 (all timed out at 15 steps), WebMCP 3/3 in ~4 steps.

## How we built it
Entirely on Cloudflare: the app runs on vinext (the Vite-based Next.js reimplementation) on Workers, D1 stores telemetry and audit results, Queues orchestrates audit jobs, Browser Run provides headless Chrome at the edge, and Workers AI (Llama 3.3 70B) is the audit agent. A small shim (`lib/webmcp.ts`) registers WebMCP tools via `document.modelContext` with a `navigator` fallback, instruments every execution for the live analytics view, and mirrors tools onto a page registry so headless auditors can drive the exact same tool functions. A local Playwright runner audits external sites with confidence intervals; a queue-consumer Worker runs the serverless audits. The demo video was produced by a multi-agent pipeline too: strategy, script, Playwright screen-capture of the live site, Kyutai pocket-tts narration, Veo b-roll, and a Remotion composition.

## Challenges we ran into
vinext is explicitly experimental — our first deploys shipped an assets-only Worker (no server code) until we discovered the config needed an explicit `main: "vinext/server/fetch-handler"`. UI-mode audit runs take 12+ minutes, which blew past queue consumer wall-clocks when we batched runs into one message — the fix was one message per run. Workers AI sometimes returns parsed JSON objects where we expected strings, which silently killed our first serverless audits. Browser launch failures burned queue retries without recording anything until we made every failure write a result row. And securing an intentionally unauthenticated API (judges' agents must call it) meant same-origin audit restriction, a daily run budget, and payload caps instead of auth.

## Accomplishments that we're proud of
The headline number is measured, not claimed: same site, same task, same agent — 0/3 through the UI, 3/3 through WebMCP. The bidirectional co-writing loop (`draft_readiness_report` → human edits → `get_report_draft` reads them back) treats the page as a two-way channel between human and agent, not a tool facade. The benchmark audits its own demo store with one tool call, on camera, in production. And we kept the methodology honest: sample rows are clearly badged as synthetic, the real runs are labeled with their n, and the whole thing is MIT-licensed and reproducible.

## What we learned
Agent-readiness is measurable, and the gap is bigger than the discourse suggests — our agent burned 15 steps and still failed on a UI it could clear in 4 steps with tools. A tool surface beats heroic UI parsing every time, and the score gap is the business case in one number. Architecturally: mirroring tools onto a page registry made the site testable by any headless browser, serverless constraints (queue wall-clocks, browser session limits) should shape job design from day one, and honest small-n data presented plainly is more credible than inflated claims.

## What's next for Agent Ready
Audit real production sites (with permission) to grow the index into an industry readiness leaderboard. An embeddable "agent-ready score" badge and a CI check so a site's score updates on every deploy. Richer task suites beyond add-to-cart — search, auth flows, form completion, multi-step journeys. Durable Object browser-session pooling to parallelize serverless audits. And opening the instrumentation SDK so any site gets `/live`-style agent analytics by wrapping `registerTool` in one line.
