/**
 * AgentReady audit worker — serverless audit execution.
 *
 * Flow: main app enqueues a job → this consumer runs the audit inside
 * Cloudflare's platform (Browser Run browser, Workers AI agent) → results land
 * in D1 → the dashboard's WebMCP tools read them back.
 *
 * Queues' max_concurrency (wrangler.jsonc) is the throttle that keeps us
 * inside Browser Run session limits; retries absorb transient browser errors.
 * A Durable Object is intentionally NOT used yet — it becomes worthwhile when
 * we pool/reuse browser sessions across jobs.
 */

import { launch, type BrowserWorker } from "@cloudflare/playwright";

export interface AuditJob {
  jobId: string;
  slug: string;
  name: string;
  url: string;
  task: string;
  mode: "ui" | "webmcp";
  runs: number;
}

export interface Env {
  BROWSER: BrowserWorker;
  AI: Ai;
  DB: D1Database;
}

const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const MAX_UI_STEPS = 15; // tighter than the laptop runner: queue wall-clock budget
const MAX_TOOL_STEPS = 8;

const TASK_PROMPTS: Record<string, string> = {
  find_and_cart_product:
    "Find any in-stock product on this site and add it to the shopping cart. The task is complete when the cart visibly contains at least one item.",
};

// ---------- LLM ----------

async function llm(env: Env, system: string, user: string): Promise<any> {
  const res = (await env.AI.run(MODEL as any, {
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_tokens: 400,
    temperature: 0.2,
  })) as { response?: string };
  const content = res.response ?? "";
  try {
    return JSON.parse(content);
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {}
    }
  }
  throw new Error(`LLM returned non-JSON: ${content.slice(0, 150)}`);
}

function classifyFailure(note = ""): string {
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

interface RunResult {
  completed: boolean;
  steps: number;
  durationMs: number;
  failureCategory?: string;
  note?: string;
}

// ---------- UI mode ----------

async function runUiMode(env: Env, job: AuditJob): Promise<RunResult> {
  const browser = await launch(env.BROWSER);
  const t0 = Date.now();
  let steps = 0;
  const history: string[] = [];
  try {
    const page = await browser.newPage();
    await page.goto(job.url, { waitUntil: "domcontentloaded", timeout: 25000 });

    for (steps = 1; steps <= MAX_UI_STEPS; steps++) {
      const snap = await page.evaluate(() => {
        const els = Array.from(
          document.querySelectorAll("a,button,input,select,textarea,[role=button]")
        )
          .filter((el) => {
            const r = (el as HTMLElement).getBoundingClientRect();
            return r.width > 0 && r.height > 0;
          })
          .slice(0, 100)
          .map((el, i) => {
            el.setAttribute("data-ar-ref", String(i));
            const label =
              el.getAttribute("aria-label") ||
              el.textContent?.trim().slice(0, 50) ||
              el.getAttribute("placeholder") ||
              "";
            return `[${i}] <${el.tagName.toLowerCase()}> ${label}`;
          });
        return {
          interactive: els.join("\n"),
          text: document.body.innerText.slice(0, 2000),
          title: document.title,
        };
      });

      const decision = await llm(
        env,
        `You are a web agent completing a task by operating a page. Task: ${
          TASK_PROMPTS[job.task] ?? job.task
        }\nRespond ONLY with JSON: {"action":"click"|"type"|"done"|"fail","ref":<number>,"text":"...","note":"..."}. "done" only when verifiably complete. Never attempt to solve a CAPTCHA or log in — use "fail" with a note instead.`,
        `Page: ${snap.title}\n\nElements:\n${snap.interactive}\n\nText:\n${snap.text}\n\nHistory:\n${history.slice(-5).join("\n") || "(none)"}`
      );
      history.push(`step ${steps}: ${decision.action} ${decision.ref ?? ""} ${decision.note ?? ""}`);

      if (decision.action === "done") return { completed: true, steps, durationMs: Date.now() - t0 };
      if (decision.action === "fail")
        return {
          completed: false, steps, durationMs: Date.now() - t0,
          failureCategory: classifyFailure(decision.note), note: decision.note,
        };

      const sel = `[data-ar-ref="${decision.ref}"]`;
      if (decision.action === "click") await page.click(sel, { timeout: 6000 }).catch(() => {});
      else if (decision.action === "type") {
        await page.fill(sel, decision.text ?? "", { timeout: 6000 }).catch(() => {});
        await page.keyboard.press("Enter").catch(() => {});
      }
      await page.waitForTimeout(700);
    }
    return { completed: false, steps: MAX_UI_STEPS, durationMs: Date.now() - t0, failureCategory: "timeout", note: "max steps reached" };
  } catch (e: any) {
    return { completed: false, steps, durationMs: Date.now() - t0, failureCategory: classifyFailure(String(e)), note: String(e).slice(0, 180) };
  } finally {
    await browser.close();
  }
}

// ---------- WebMCP mode ----------

async function runWebmcpMode(env: Env, job: AuditJob): Promise<RunResult> {
  const browser = await launch(env.BROWSER);
  const t0 = Date.now();
  let steps = 0;
  try {
    const page = await browser.newPage();
    await page.goto(job.url, { waitUntil: "networkidle", timeout: 25000 });

    const tools = await page.evaluate(() => {
      const reg = (window as any).__webmcpRegistry as Map<string, any> | undefined;
      if (!reg) return null;
      return Array.from(reg.values()).map((t) => ({
        name: t.name, description: t.description, inputSchema: t.inputSchema,
      }));
    });
    if (!tools || tools.length === 0) {
      return { completed: false, steps: 0, durationMs: Date.now() - t0, failureCategory: "tool_error", note: "no WebMCP tools exposed" };
    }

    const transcript: string[] = [];
    for (steps = 1; steps <= MAX_TOOL_STEPS; steps++) {
      const decision = await llm(
        env,
        `You complete tasks by calling the site's WebMCP tools. Task: ${TASK_PROMPTS[job.task] ?? job.task}\nTools:\n${JSON.stringify(tools)}\nRespond ONLY with JSON: {"call":"tool_name","input":{...}} or {"done":true} or {"fail":"reason"}.`,
        `Transcript:\n${transcript.join("\n") || "(start)"}`
      );
      if (decision.done) return { completed: true, steps, durationMs: Date.now() - t0 };
      if (decision.fail)
        return { completed: false, steps, durationMs: Date.now() - t0, failureCategory: "tool_error", note: decision.fail };

      const result = await page.evaluate(
        async (args: { name: string; input: unknown }) => {
          const reg = (window as any).__webmcpRegistry as Map<string, any> | undefined;
          const tool = reg?.get(args.name);
          if (!tool) return { error: `no tool ${args.name}` };
          try { return await tool.execute(args.input); } catch (e) { return { error: String(e) }; }
        },
        { name: decision.call, input: decision.input ?? {} }
      );
      transcript.push(`${decision.call}(${JSON.stringify(decision.input ?? {})}) → ${JSON.stringify(result).slice(0, 250)}`);
    }
    return { completed: false, steps, durationMs: Date.now() - t0, failureCategory: "timeout", note: "max tool steps reached" };
  } catch (e: any) {
    return { completed: false, steps, durationMs: Date.now() - t0, failureCategory: "tool_error", note: String(e).slice(0, 180) };
  } finally {
    await browser.close();
  }
}

// ---------- persistence ----------

let schemaReady = false;
async function ensureSchema(db: D1Database) {
  if (schemaReady) return;
  await db
    .prepare(
      "CREATE TABLE IF NOT EXISTS audit_runs (id TEXT PRIMARY KEY, job_id TEXT, slug TEXT NOT NULL, name TEXT, url TEXT, mode TEXT NOT NULL, task TEXT NOT NULL, completed INTEGER NOT NULL, steps INTEGER NOT NULL, duration_ms INTEGER NOT NULL, failure_category TEXT, note TEXT, ts TEXT NOT NULL)"
    )
    .run();
  schemaReady = true;
}

async function saveRun(env: Env, job: AuditJob, r: RunResult) {
  await ensureSchema(env.DB);
  await env.DB.prepare(
    "INSERT INTO audit_runs (id, job_id, slug, name, url, mode, task, completed, steps, duration_ms, failure_category, note, ts) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)"
  )
    .bind(
      crypto.randomUUID().slice(0, 12), job.jobId, job.slug, job.name, job.url,
      job.mode, job.task, r.completed ? 1 : 0, r.steps, r.durationMs,
      r.failureCategory ?? null, r.note ?? null, new Date().toISOString()
    )
    .run();
}

// ---------- entrypoint ----------

export default {
  async queue(batch: MessageBatch, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      const job = msg.body as AuditJob;
      const runs = Math.min(Math.max(job.runs ?? 1, 1), 5);
      try {
        for (let i = 0; i < runs; i++) {
          const r = job.mode === "ui" ? await runUiMode(env, job) : await runWebmcpMode(env, job);
          await saveRun(env, job, r);
        }
        msg.ack();
      } catch (e) {
        console.error("audit job failed", job.jobId, e);
        msg.retry();
      }
    }
  },
} satisfies ExportedHandler<Env>;
