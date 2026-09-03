# 3-minute demo video script

0:00–0:20 — Hook
"Can an AI agent actually use your website? Almost no business can answer that.
We built the measuring instrument." Show the readiness spectrum on the index.

0:20–0:50 — The benchmark
Scroll the scoreboard. "Every site gets 5+ agent runs through the raw UI and,
where tools exist, through WebMCP. Same task, two modes." Open the demo store's
site detail: point at the delta — UI ~40% success vs ~100% via tools, 12 steps
vs 3. "That gap is the case for the agent-native web."

0:50–1:50 — Human + agent, one surface (the core demo, in ChatGPT's browser)
On the index, ask the agent: "Which sites are least agent-ready, why do they
fail, and draft me a one-page readiness report." Show tool calls firing in the
activity panel, then the draft landing in the editor. Edit one line by hand.
Ask: "Tighten the summary but keep my edits." Show it calling get_report_draft
first — "the agent reads my changes before revising. Two authors, one document."

1:50–2:30 — The store + live analytics
On /store: "Kit me out for a weekend trek under ₹10,000 — check my cart first."
Agent checks view_cart, adds items; cart updates on screen. Flip to /live:
every call, latency, success — "this is our SDK instrumenting the site; any
site gets this by wrapping registerTool."

2:30–3:00 — Close
"AgentReady is a benchmark, a reference implementation, and the analytics layer
for the agent-native web — open methodology, MIT licensed, built on WebMCP.
The web is about to get its most important new user. We measure whether it's
ready." Show repo + URL.
