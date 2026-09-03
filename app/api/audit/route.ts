import { NextRequest, NextResponse } from "next/server";
import { getCfEnv } from "@/lib/cf";

export const dynamic = "force-dynamic";

interface QueueLike { send: (body: unknown) => Promise<void>; }
interface D1Like {
  prepare: (sql: string) => {
    bind: (...args: unknown[]) => { all: <T>() => Promise<{ results: T[] }> };
  };
}
interface Bindings { AUDIT_QUEUE?: QueueLike; DB?: D1Like; }

/** POST — enqueue an audit job for serverless execution by the audit worker. */
export async function POST(req: NextRequest) {
  const env = await getCfEnv<Bindings>();
  if (!env?.AUDIT_QUEUE) {
    return NextResponse.json(
      { error: "Audit queue not available in this environment. On Cloudflare, create the queue (wrangler queues create agentready-audits) and deploy the audit worker." },
      { status: 503 }
    );
  }
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const url = String(body?.url ?? "");
  if (!/^https?:\/\//.test(url) && !url.startsWith("/")) {
    return NextResponse.json({ error: "url must be absolute (or a path on this deployment)" }, { status: 400 });
  }
  // This endpoint spends real Browser Run + Workers AI quota and is
  // unauthenticated by design (judges' agents call it). Two guardrails:
  // only this deployment may be audited, and total daily runs are capped.
  let resolved: URL;
  try {
    resolved = new URL(url, req.nextUrl.origin);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }
  if (resolved.origin !== req.nextUrl.origin) {
    return NextResponse.json(
      { error: "live audits are restricted to this deployment — try '/store'. To audit external sites, use the local runner (runner/run.mjs)." },
      { status: 403 }
    );
  }
  const runs = Math.min(Math.max(Number(body?.runs) || 1, 1), 5);
  if (env.DB) {
    try {
      const dayStart = new Date().toISOString().slice(0, 10);
      const { results } = await env.DB
        .prepare("SELECT COUNT(*) AS c FROM audit_runs WHERE ts >= ?")
        .bind(dayStart)
        .all<{ c: number }>();
      if ((results[0]?.c ?? 0) + runs > 150) {
        return NextResponse.json({ error: "daily audit budget reached — try again tomorrow" }, { status: 429 });
      }
    } catch {
      /* table not created yet — first runs are within budget by definition */
    }
  }
  const mode = body?.mode === "ui" ? "ui" : "webmcp";
  const job = {
    jobId: crypto.randomUUID().slice(0, 12),
    slug: String(body?.slug ?? "adhoc").slice(0, 64).replace(/[^a-z0-9-]/gi, "-").toLowerCase(),
    name: String(body?.name ?? body?.slug ?? "Ad-hoc audit").slice(0, 120),
    url: resolved.toString(),
    task: "find_and_cart_product",
    mode,
    runs: 1,
  };
  // One queue message per run: a UI-mode run can take >10 minutes, so batching
  // several into one consumer invocation risks the queue wall-clock limit
  // killing the batch mid-way and retrying already-recorded runs.
  for (let i = 0; i < runs; i++) await env.AUDIT_QUEUE.send(job);
  return NextResponse.json({ ok: true, queued: { ...job, runs } });
}

/** GET ?slug= — read serverless audit results written by the audit worker. */
export async function GET(req: NextRequest) {
  const env = await getCfEnv<Bindings>();
  if (!env?.DB) return NextResponse.json({ runs: [], note: "no D1 binding in this environment" });
  const slug = req.nextUrl.searchParams.get("slug");
  try {
    const stmt = slug
      ? env.DB.prepare("SELECT * FROM audit_runs WHERE slug = ? ORDER BY ts DESC LIMIT 50").bind(slug)
      : env.DB.prepare("SELECT * FROM audit_runs ORDER BY ts DESC LIMIT 50").bind();
    const { results } = await stmt.all<Record<string, unknown>>();
    return NextResponse.json({ runs: results });
  } catch {
    return NextResponse.json({ runs: [], note: "no audit_runs yet — queue one first" });
  }
}
