# AgentReady

**The readiness benchmark for the agent-native web.** AgentReady measures whether AI agents can actually complete tasks on a website — once through the raw UI, once through [WebMCP](https://webmachinelearning.github.io/webmcp/) tools — and scores every site 0–100. The gap between those two numbers is the business case for building agent-native.

Built for [The WebMCP Challenge](https://webmcp.devpost.com/). MIT licensed.

## What's in the box

| Piece | Where | What it does |
|---|---|---|
| Readiness Index dashboard | `/` | Scoreboard + readiness spectrum of audited sites. **WebMCP-native**: your agent can query scores, compare sites, read failure breakdowns, and co-write a readiness report with you in a shared on-page editor. |
| Demo store | `/store` | "AgentReady Outfitters" — a working shop with 5 WebMCP tools where a human and their agent share one cart. The reference implementation the benchmark audits. |
| Live agent analytics | `/live` | Every WebMCP tool call on the deployment, streamed from the instrumentation SDK. |
| Instrumentation SDK (seed) | `lib/webmcp.ts` | Wraps `registerTool` so every agent call is logged — the analytics layer any site can adopt. |
| Audit runner | `runner/` | Playwright + LLM loop that runs agents against target sites in UI mode and WebMCP mode, with failure taxonomy and confidence intervals. Runs on your machine, never deployed. |
| Hello-world check | `/webmcp-hello.html` | One-file page to verify WebMCP works in your browser before anything else. |

## Quickstart

```bash
npm install
npm run dev        # http://localhost:3000
```

Open in ChatGPT's in-app browser, or Chrome with `chrome://flags/#enable-webmcp-testing` enabled. Then ask your agent things like:

- *"Which audited site is most agent-ready and why?"*
- *"Why do the worst sites fail? Draft me a one-page readiness report."* (watch it land in the on-page editor — edit it, then ask the agent to revise: it reads your edits back first)
- On `/store`: *"Kit me out for a weekend trek under ₹10,000 — check what's already in my cart first."*

## Running real audits

```bash
cd runner && npm install          # playwright-core only — no browser download
export CF_ACCOUNT_ID=<account id>
export CF_API_TOKEN=<token with Browser Rendering Edit permission>
node run.mjs \
  --site https://your-deployment.workers.dev/store \
  --slug agentready-outfitters --name "AgentReady Outfitters" \
  --category demo --mode both --runs 5
cd .. && npm run import-results   # merge into data/audits.json, then redeploy
```

The runner drives **[Cloudflare Browser Run](https://developers.cloudflare.com/browser-run/)** — headless Chrome on Cloudflare's edge, connected over CDP — so there is no local browser install and audits scale to the whole benchmark from one laptop. Without the CF env vars it falls back to local Chromium (`npm i -D playwright && npx playwright install chromium`). Each run gets a fresh browser context: no cookies or state carry over.

Each site is run N times per mode; scores are reported with 95% confidence intervals. Failure categories: `auth_wall`, `captcha`, `popup_interference`, `ambiguous_ui`, `navigation_loop`, `missing_info`, `timeout`, `tool_error`. CAPTCHAs and logins are **recorded as failures, never bypassed**. Only audit sites you own or have permission to test; keep public-flow runs at human browsing volumes.

**About the shipped data:** rows badged *sample data* in the dashboard are synthetic fixtures (fictional site names) included so the scoring methodology is inspectable out of the box. They are not measurements of real companies. Replace them with your own runs via the runner.

## How WebMCP is used (for judges)

- Tools are registered with `document.modelContext.registerTool(...)` (with a `navigator.modelContext` fallback) via the shim in `lib/webmcp.ts`.
- The dashboard registers 8 tools (`list_audited_sites`, `get_site_score`, `compare_sites`, `get_failure_breakdown`, `queue_live_audit`, `get_live_audit_results`, `draft_readiness_report`, `get_report_draft`); the store registers 5 (`search_products`, `add_to_cart`, `remove_from_cart`, `view_cart`, `start_checkout`). `queue_live_audit` is the standout: the agent triggers a real serverless audit — a Queues job that drives a Browser Run browser with a Workers AI agent and writes results to D1 — then reads them back with `get_live_audit_results`.
- The human+agent loop is bidirectional: `draft_readiness_report` writes into a visible editor, the human edits, `get_report_draft` lets the agent read those edits before revising. In the store, `view_cart` returns items the human added by hand, so the agent builds on their choices.
- Every tool execution is instrumented and visible at `/live` — the product observes itself.

## Scoring rubric

`readiness = 100 × (0.70 × best_success_rate + 0.15 × has_webmcp + 0.15 × efficiency)` where efficiency maps average steps-to-complete from 4 (full credit) to 20 (none). Details and rationale: [`docs/METHODOLOGY.md`](docs/METHODOLOGY.md).

## Stack & deploy (Cloudflare + vinext)

The app runs on **[vinext](https://vinext.dev)** — Cloudflare's experimental Vite-based reimplementation of the Next.js API surface — deployed to **Workers**, with **D1** storing telemetry and results durably, **Workers AI** powering the audit agent, **Browser Run** providing the headless browsers, and **Queues** orchestrating serverless audit jobs at a rate that respects platform limits. R2 is pre-wired in comments for run artifacts. The D1 table auto-creates on first write, so there is no schema step blocking a first deploy.

```bash
npm install
npm run build                                  # vinext build (Vite 8 / Rolldown)
npx vinext start                               # local production server (telemetry
                                               # falls back to in-memory under Node)

npx wrangler login
npx wrangler kv namespace create VINEXT_KV_CACHE   # paste id into wrangler.jsonc
npx wrangler d1 create agentready-telemetry        # paste id into BOTH wrangler.jsonc files
npx wrangler queues create agentready-audits
npm run deploy                                     # main app → Workers
cd audit-worker && npm install && npm run deploy   # queue consumer → Workers
```

The audit worker consumes `agentready-audits` with `max_concurrency: 1` — that single knob keeps serverless audits inside [Browser Run limits](https://developers.cloudflare.com/browser-run/limits/); raise it as your plan allows. Retries (2, 30s delay) absorb transient browser errors. A Durable Object is deliberately not in the path yet: Queues covers throttling, and the DO earns its place later for browser session pooling/reuse across jobs.

`npm run dev` gives the Vite dev loop. If dev-mode routing misbehaves (vinext is explicitly experimental), the reliable loop is `npm run build && npx vinext start` — seconds per cycle on Vite's build speed.

Runner on Workers AI (any OpenAI-compatible endpoint works; this keeps it all-Cloudflare):

```bash
export OPENAI_BASE_URL=https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/ai/v1
export OPENAI_API_KEY=<api token with Workers AI permission>
export RUNNER_MODEL=@cf/meta/llama-3.3-70b-instruct-fp8-fast
```

## License

MIT — see [LICENSE](LICENSE).
