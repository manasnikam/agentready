# Devpost submission draft

## Project name
AgentReady — the readiness benchmark for the agent-native web

## Elevator
Nobody can answer the most basic question of the agent era: *can an AI agent
actually use my website?* AgentReady measures it. We run real agents against
real task flows — once through the raw UI, once through WebMCP tools — score
every site 0–100, and publish the gap. Then we hand analysts a WebMCP-native
dashboard where their own agent queries the benchmark, diagnoses failures, and
co-writes the readiness report with them in a shared editor.

## Why this use case is a strong fit for WebMCP
AgentReady is WebMCP three times over: (1) it *measures* WebMCP's value — our
demo store shows agents succeeding ~2.5× more often via tools than via the UI,
with fewer steps; (2) the dashboard itself is an agent-native app — eight tools
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
- Live: <DEPLOYMENT URL>
- Repo: <GITHUB URL> (MIT license visible in About)
- Video: <YOUTUBE URL>
