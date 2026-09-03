#!/usr/bin/env node
/**
 * AgentReady audit runner. Executes locally on the operator's machine.
 *
 *   node run.mjs --site https://your-deployment.vercel.app/store \
 *     --slug agentready-outfitters --name "AgentReady Outfitters" \
 *     --task find_and_cart_product --mode both --runs 5
 *
 * Modes:
 *   ui      Playwright + LLM loop: the agent sees a text snapshot of the page
 *           and chooses click/type actions until the task completes or fails.
 *   webmcp  Enumerates the page's tool registry (window.__webmcpRegistry,
 *           mirrored from document.modelContext registration) and lets the LLM
 *           call tools directly — same tool functions a WebMCP browser exposes.
 *
 * Browser backend — Cloudflare Browser Run by default (headless Chrome on
 * Cloudflare's network, zero local install; https://developers.cloudflare.com/browser-run/):
 *   CF_ACCOUNT_ID=<account id>
 *   CF_API_TOKEN=<token with Browser Rendering Edit permission>
 * Without those env vars it falls back to local Chromium
 * (npm i playwright && npx playwright install chromium).
 *
 * LLM backend — any OpenAI-compatible endpoint. Cloudflare Workers AI (default
 * recommendation, keeps the whole stack on Cloudflare):
 *   OPENAI_BASE_URL=https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/ai/v1
 *   OPENAI_API_KEY=<CLOUDFLARE_API_TOKEN with Workers AI read>
 *   RUNNER_MODEL=@cf/meta/llama-3.3-70b-instruct-fp8-fast
 * Or OpenAI: leave OPENAI_BASE_URL unset, RUNNER_MODEL=gpt-4o-mini.
 *
 * Ethics: run against sites you own or have permission to test. Public-flow
 * runs elsewhere should stay at human browsing volumes. CAPTCHAs and auth
 * walls are recorded as failure categories and never bypassed.
 */

import { writeFileSync, mkdirSync } from "node:fs";

const { chromium } = await (async () => {
  try { return await import("playwright"); }
  catch { return await import("playwright-core"); }
})();

const args = Object.fromEntries(
  process.argv.slice(2).map((a, i, arr) =>
    a.startsWith("--") ? [a.slice(2), arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : "true"] : []
  ).filter((x) => x.length)
);

const SITE = args.site;
const SLUG = args.slug ?? new URL(SITE).hostname.replace(/\W+/g, "-");
const NAME = args.name ?? SLUG;
const TASK = args.task ?? "find_and_cart_product";
const MODE = args.mode ?? "both"; // ui | webmcp | both
const RUNS = Number(args.runs ?? 5);
const MAX_STEPS = Number(args.maxSteps ?? 25);
const MODEL = process.env.RUNNER_MODEL ?? "gpt-4o-mini";
const BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";

const TASK_PROMPTS = {
  find_and_cart_product:
    "Find any in-stock product on this site and add it to the shopping cart. The task is complete when the cart visibly contains at least one item.",
};

if (!SITE) {
  console.error("Usage: node run.mjs --site <url> [--slug s] [--mode ui|webmcp|both] [--runs 5]");
  process.exit(1);
}
if (!process.env.OPENAI_API_KEY) {
  console.error("Set OPENAI_API_KEY (any OpenAI-compatible endpoint via OPENAI_BASE_URL).");
  process.exit(1);
}

async function llm(messages) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.2 }),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${await res.text()}`);
  const j = await res.json();
  const content = j.choices[0].message.content ?? "";
  // Tolerate fences/prose around the JSON (some Workers AI models do this).
  try { return JSON.parse(content); } catch {}
  const match = content.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  throw new Error(`LLM returned non-JSON: ${content.slice(0, 200)}`);
}

/** Compact, numbered snapshot of interactive elements + visible text. */
async function snapshot(page) {
  return page.evaluate(() => {
    const interactive = [...document.querySelectorAll("a,button,input,select,textarea,[role=button]")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      })
      .slice(0, 120)
      .map((el, i) => {
        el.setAttribute("data-ar-ref", String(i));
        const label =
          el.getAttribute("aria-label") ||
          el.textContent?.trim().slice(0, 60) ||
          el.getAttribute("placeholder") ||
          el.getAttribute("name") || "";
        return `[${i}] <${el.tagName.toLowerCase()}> ${label}`;
      });
    const text = document.body.innerText.slice(0, 2500);
    return { interactive: interactive.join("\n"), text, title: document.title, url: location.href };
  });
}

function classifyFailure(note = "") {
  const n = note.toLowerCase();
  if (n.includes("captcha")) return "captcha";
  if (n.includes("login") || n.includes("sign in") || n.includes("auth")) return "auth_wall";
  if (n.includes("popup") || n.includes("modal") || n.includes("cookie")) return "popup_interference";
  if (n.includes("loop") || n.includes("same page")) return "navigation_loop";
  if (n.includes("not found") || n.includes("missing")) return "missing_info";
  if (n.includes("timeout")) return "timeout";
  if (n.includes("ambiguous") || n.includes("unclear")) return "ambiguous_ui";
  return "other";
}

async function runUiMode(browser, runIndex) {
  // Fresh context per run: no cookies/state carried over (methodology §Run protocol)
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const t0 = Date.now();
  let steps = 0;
  const history = [];
  try {
    await page.goto(SITE, { waitUntil: "domcontentloaded", timeout: 30000 });
    for (steps = 1; steps <= MAX_STEPS; steps++) {
      const snap = await snapshot(page);
      const decision = await llm([
        {
          role: "system",
          content:
            `You are a web agent completing a task by operating a page. Task: ${TASK_PROMPTS[TASK] ?? TASK}\n` +
            `Respond ONLY with JSON: {"action":"click"|"type"|"done"|"fail","ref":<number>,"text":"...","note":"..."}. ` +
            `"done" only when the task is verifiably complete based on the page. "fail" with a note explaining the blocker ` +
            `(mention captcha/login/popup/loop/ambiguous if applicable). Never attempt to solve a CAPTCHA or log in.`,
        },
        {
          role: "user",
          content: `Page: ${snap.title} (${snap.url})\n\nInteractive elements:\n${snap.interactive}\n\nVisible text:\n${snap.text}\n\nHistory:\n${history.slice(-6).join("\n") || "(none)"}`,
        },
      ]);
      history.push(`step ${steps}: ${decision.action} ${decision.ref ?? ""} ${decision.note ?? ""}`);
      if (decision.action === "done") {
        return { completed: true, steps, durationMs: Date.now() - t0 };
      }
      if (decision.action === "fail") {
        return { completed: false, steps, durationMs: Date.now() - t0, failureCategory: classifyFailure(decision.note), note: decision.note };
      }
      const sel = `[data-ar-ref="${decision.ref}"]`;
      if (decision.action === "click") {
        await page.click(sel, { timeout: 8000 }).catch(() => {});
      } else if (decision.action === "type") {
        await page.fill(sel, decision.text ?? "", { timeout: 8000 }).catch(() => {});
        await page.keyboard.press("Enter").catch(() => {});
      }
      await page.waitForTimeout(900);
    }
    return { completed: false, steps: MAX_STEPS, durationMs: Date.now() - t0, failureCategory: "timeout", note: "max steps reached" };
  } catch (e) {
    return { completed: false, steps, durationMs: Date.now() - t0, failureCategory: classifyFailure(String(e)), note: String(e).slice(0, 200) };
  } finally {
    await ctx.close();
  }
}

async function runWebmcpMode(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const t0 = Date.now();
  let steps = 0;
  try {
    await page.goto(SITE, { waitUntil: "networkidle", timeout: 30000 });
    const tools = await page.evaluate(() => {
      const reg = window.__webmcpRegistry;
      if (!reg) return null;
      return [...reg.values()].map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }));
    });
    if (!tools || tools.length === 0) {
      return { completed: false, steps: 0, durationMs: Date.now() - t0, failureCategory: "tool_error", note: "no WebMCP tools exposed" };
    }
    const transcript = [];
    for (steps = 1; steps <= 10; steps++) {
      const decision = await llm([
        {
          role: "system",
          content:
            `You complete tasks by calling the site's WebMCP tools. Task: ${TASK_PROMPTS[TASK] ?? TASK}\n` +
            `Tools:\n${JSON.stringify(tools, null, 1)}\n` +
            `Respond ONLY with JSON: {"call":"tool_name","input":{...}} or {"done":true} or {"fail":"reason"}.`,
        },
        { role: "user", content: `Transcript so far:\n${transcript.join("\n") || "(start)"}` },
      ]);
      if (decision.done) return { completed: true, steps, durationMs: Date.now() - t0 };
      if (decision.fail) return { completed: false, steps, durationMs: Date.now() - t0, failureCategory: "tool_error", note: decision.fail };
      const result = await page.evaluate(async ({ name, input }) => {
        const tool = window.__webmcpRegistry?.get(name);
        if (!tool) return { error: `no tool ${name}` };
        try { return await tool.execute(input); } catch (e) { return { error: String(e) }; }
      }, { name: decision.call, input: decision.input ?? {} });
      transcript.push(`${decision.call}(${JSON.stringify(decision.input ?? {})}) → ${JSON.stringify(result).slice(0, 300)}`);
    }
    return { completed: false, steps, durationMs: Date.now() - t0, failureCategory: "timeout", note: "max tool steps reached" };
  } catch (e) {
    return { completed: false, steps, durationMs: Date.now() - t0, failureCategory: "tool_error", note: String(e).slice(0, 200) };
  } finally {
    await ctx.close();
  }
}

async function getBrowser() {
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;
  if (accountId && apiToken) {
    const ws = `wss://api.cloudflare.com/client/v4/accounts/${accountId}/browser-rendering/devtools/browser?keep_alive=600000`;
    console.log("Browser: Cloudflare Browser Run (edge headless Chrome)");
    return chromium.connectOverCDP(ws, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });
  }
  console.log("Browser: local Chromium (set CF_ACCOUNT_ID + CF_API_TOKEN for Browser Run)");
  return chromium.launch({ headless: args.headed !== "true" });
}

const browser = await getBrowser();
const runs = [];
const modes = MODE === "both" ? ["ui", "webmcp"] : [MODE];

for (const mode of modes) {
  for (let i = 0; i < RUNS; i++) {
    process.stdout.write(`run ${i + 1}/${RUNS} [${mode}] … `);
    const r = mode === "ui" ? await runUiMode(browser, i) : await runWebmcpMode(browser);
    runs.push({
      runId: `${mode}-${Date.now()}-${i}`,
      mode, task: TASK,
      ...r,
      timestamp: new Date().toISOString(),
    });
    console.log(r.completed ? `PASS in ${r.steps} steps` : `FAIL (${r.failureCategory}: ${r.note ?? ""})`);
  }
}
await browser.close();

const byMode = (m) => runs.filter((r) => r.mode === m);
for (const m of modes) {
  const rs = byMode(m);
  const passed = rs.filter((r) => r.completed).length;
  const rate = passed / rs.length;
  // variance check: report a 95% CI half-width so publishable scores carry error bars
  const half = 1.96 * Math.sqrt((rate * (1 - rate)) / rs.length);
  console.log(`\n[${m}] success ${passed}/${rs.length} = ${(rate * 100).toFixed(0)}% ±${(half * 100).toFixed(0)}pp (95% CI)`);
}

const out = {
  slug: SLUG, name: NAME, url: SITE,
  category: args.category ?? "uncategorized",
  synthetic: false,
  hasWebMCP: runs.some((r) => r.mode === "webmcp" && r.failureCategory !== "tool_error"),
  runs,
};
mkdirSync("results", { recursive: true });
const file = `results/${SLUG}-${Date.now()}.json`;
writeFileSync(file, JSON.stringify(out, null, 2));
console.log(`\nWrote ${file} — merge into the dashboard with: npm run import-results`);
