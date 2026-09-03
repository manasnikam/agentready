"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import auditsJson from "@/data/audits.json";
import { scoreSite, pct } from "@/lib/scoring";
import { registerInstrumentedTools, hasWebMCP } from "@/lib/webmcp";
import type { SiteAudit, SiteScore } from "@/lib/types";

const audits = auditsJson as unknown as SiteAudit[];

function scoreColor(s: number): string {
  if (s >= 75) return "var(--ok)";
  if (s >= 45) return "var(--warn)";
  return "var(--bad)";
}

export default function IndexPage() {
  const scores = useMemo(
    () => audits.map(scoreSite).sort((a, b) => b.readinessScore - a.readinessScore),
    []
  );
  const [draft, setDraft] = useState("");
  const [apiPresent, setApiPresent] = useState<boolean | null>(null);
  const [activity, setActivity] = useState<string[]>([]);
  const registered = useRef(false);

  // refs so tool closures always see current state
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    setApiPresent(hasWebMCP());
    if (registered.current) return;
    registered.current = true;

    const bySlug = new Map(scores.map((s) => [s.slug, s]));
    const find = (q: string): SiteScore | undefined =>
      bySlug.get(q) ??
      scores.find((s) => s.name.toLowerCase().includes(q.toLowerCase()));

    const { registered: ok } = registerInstrumentedTools(
      "dashboard",
      [
        {
          name: "list_audited_sites",
          description:
            "List all sites in the AgentReady benchmark with their readiness score (0–100), category, and whether they expose WebMCP tools. Sorted by score, best first.",
          inputSchema: {
            type: "object",
            properties: {
              category: { type: "string", description: "Optional category filter, e.g. 'fashion'" },
            },
          },
          execute: async (input: { category?: string }) => {
            const list = scores.filter(
              (s) => !input?.category || s.category === input.category
            );
            return {
              count: list.length,
              sites: list.map((s) => ({
                slug: s.slug,
                name: s.name,
                category: s.category,
                readinessScore: s.readinessScore,
                hasWebMCP: s.hasWebMCP,
                sampleData: s.synthetic,
              })),
            };
          },
        },
        {
          name: "get_site_score",
          description:
            "Get the full readiness scorecard for one site: UI-mode vs WebMCP-mode agent success rates, average steps to complete the task, run count, and failure breakdown. Pass the site slug or part of its name.",
          inputSchema: {
            type: "object",
            properties: { site: { type: "string", description: "Site slug or name" } },
            required: ["site"],
          },
          execute: async (input: { site: string }) => {
            const s = find(input.site);
            if (!s) return { error: `No site matching '${input.site}'. Use list_audited_sites first.` };
            return s;
          },
        },
        {
          name: "compare_sites",
          description:
            "Compare two sites head-to-head on readiness score, success rates, and efficiency. Returns a verdict on which is more agent-ready and why.",
          inputSchema: {
            type: "object",
            properties: {
              siteA: { type: "string" },
              siteB: { type: "string" },
            },
            required: ["siteA", "siteB"],
          },
          execute: async (input: { siteA: string; siteB: string }) => {
            const a = find(input.siteA);
            const b = find(input.siteB);
            if (!a || !b) return { error: "One or both sites not found. Use list_audited_sites." };
            const winner = a.readinessScore >= b.readinessScore ? a : b;
            return {
              a, b,
              verdict: `${winner.name} is more agent-ready (${winner.readinessScore} vs ${
                winner === a ? b.readinessScore : a.readinessScore
              }). Key driver: ${winner.hasWebMCP ? "it exposes WebMCP tools, so agents skip UI guesswork" : "higher raw UI task completion"}.`,
            };
          },
        },
        {
          name: "get_failure_breakdown",
          description:
            "For a given site, return why agent runs failed there, by category (auth_wall, captcha, popup_interference, ambiguous_ui, navigation_loop, missing_info, timeout).",
          inputSchema: {
            type: "object",
            properties: { site: { type: "string" } },
            required: ["site"],
          },
          execute: async (input: { site: string }) => {
            const s = find(input.site);
            if (!s) return { error: `No site matching '${input.site}'.` };
            return { site: s.name, failures: s.failureBreakdown, totalRuns: s.totalRuns };
          },
        },
        {
          name: "queue_live_audit",
          description:
            "Queue a real serverless audit of a site. The job runs on Cloudflare's platform (Browser Run browser + Workers AI agent) and results land in the benchmark database within a minute or two. Use the demo store path '/store' to audit this deployment's own reference store. Check back with get_live_audit_results.",
          inputSchema: {
            type: "object",
            properties: {
              url: { type: "string", description: "Absolute URL, or '/store' for this deployment's demo store" },
              slug: { type: "string", description: "Short identifier for the site, e.g. 'agentready-outfitters'" },
              mode: { type: "string", enum: ["webmcp", "ui"], description: "Audit via WebMCP tools or raw UI. Default webmcp." },
              runs: { type: "number", description: "1–5 runs. Default 1." },
            },
            required: ["url", "slug"],
          },
          execute: async (input: { url: string; slug: string; mode?: string; runs?: number }) => {
            const r = await fetch("/api/audit", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(input),
            });
            return await r.json();
          },
        },
        {
          name: "get_live_audit_results",
          description:
            "Read results of serverless audits previously queued with queue_live_audit. Returns per-run completion, steps, duration, and failure category, freshest first.",
          inputSchema: {
            type: "object",
            properties: { slug: { type: "string", description: "Site slug used when queuing" } },
          },
          execute: async (input: { slug?: string }) => {
            const q = input?.slug ? `?slug=${encodeURIComponent(input.slug)}` : "";
            const r = await fetch(`/api/audit${q}`);
            return await r.json();
          },
        },
        {
          name: "draft_readiness_report",
          description:
            "Write a draft readiness report into the report panel on this page, where the human analyst can see and edit it. Pass the full markdown text of the draft. Use benchmark data from the other tools first. This is how the agent and the analyst collaborate: the agent drafts, the human refines on screen.",
          inputSchema: {
            type: "object",
            properties: {
              markdown: { type: "string", description: "Full report draft in markdown" },
            },
            required: ["markdown"],
          },
          execute: async (input: { markdown: string }) => {
            setDraft(input.markdown);
            return { ok: true, placed: "Report panel updated. The analyst can now edit it on screen." };
          },
        },
        {
          name: "get_report_draft",
          description:
            "Read the current contents of the report panel, including any edits the human analyst has made since the last draft. Call this before revising so you build on their changes instead of overwriting them.",
          inputSchema: { type: "object", properties: {} },
          execute: async () => ({ markdown: draftRef.current || "(empty)" }),
        },
      ],
      (line) => setActivity((prev) => [...prev.slice(-40), line])
    );
    if (!ok) setApiPresent(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const withMcp = scores.filter((s) => s.hasWebMCP);
  const avgAll = Math.round(scores.reduce((s, x) => s + x.readinessScore, 0) / scores.length);

  return (
    <main>
      <section className="hero">
        <h1>Can an AI agent actually use your website? We measured.</h1>
        <p className="lede">
          AgentReady runs real agents against real task flows — once through the raw UI,
          once through WebMCP tools — and scores every site 0–100. The gap between those
          two numbers is the case for the agent-native web.
        </p>
        <p className="lede subtle">
          Benchmark average today: <strong>{avgAll}/100</strong>. Sites exposing WebMCP tools
          average <strong>{withMcp.length ? Math.round(withMcp.reduce((s, x) => s + x.readinessScore, 0) / withMcp.length) : "—"}/100</strong>.
        </p>
        <div className="agent-hint" role="note">
          {apiPresent === false && (
            <>No WebMCP API detected in this browser. The dashboard still works by hand —
            but open it in ChatGPT&apos;s in-app browser or Chrome with{" "}
            <code>chrome://flags/#enable-webmcp-testing</code> to use it with your agent.</>
          )}
          {apiPresent && (
            <>WebMCP is live on this page — 8 tools registered. Try asking your agent:{" "}
            <em>&quot;Which audited site is most agent-ready, why do the worst ones fail,
            and draft me a one-page readiness report.&quot;</em></>
          )}
          {apiPresent === null && <>Checking for WebMCP API…</>}
        </div>
      </section>

      <section className="spectrum" aria-label="Readiness spectrum">
        <div className="rail">
          {[0, 25, 50, 75, 100].map((g) => (
            <span key={g}>
              <i className="gridline" style={{ left: `${g}%` }} />
              <i className="gridlabel" style={{ left: `${g}%` }}>{g}</i>
            </span>
          ))}
          {scores.map((s) => (
            <Link
              key={s.slug}
              href={`/site/${s.slug}`}
              className={`tick ${s.slug === "agentready-outfitters" ? "live" : s.hasWebMCP ? "mcp" : ""}`}
              style={{ left: `${s.readinessScore}%`, height: `${18 + s.readinessScore * 0.55}px` }}
              title={`${s.name}: ${s.readinessScore}/100`}
              aria-label={`${s.name}, score ${s.readinessScore} out of 100`}
            />
          ))}
        </div>
        <p className="spectrum-caption">
          Every audited site, placed by readiness score.
          <span className="swatch" style={{ background: "var(--ink-soft)" }} /> UI only
          <span className="swatch" style={{ background: "var(--ok)" }} /> exposes WebMCP
          <span className="swatch" style={{ background: "var(--accent)" }} /> our live demo store
        </p>
      </section>

      <table className="scoreboard">
        <thead>
          <tr>
            <th>Site</th><th>Category</th><th>Score</th>
            <th>Agent success (UI)</th><th>Agent success (WebMCP)</th><th></th>
          </tr>
        </thead>
        <tbody>
          {scores.map((s) => (
            <tr key={s.slug}>
              <td>
                <Link href={`/site/${s.slug}`}>{s.name}</Link>{" "}
                {s.synthetic && <span className="badge sample">sample data</span>}
              </td>
              <td>{s.category}</td>
              <td>
                <span className="score-pill" style={{ background: scoreColor(s.readinessScore) }}>
                  {s.readinessScore}
                </span>
              </td>
              <td className="num">{pct(s.uiSuccessRate)}</td>
              <td className="num">
                {s.hasWebMCP ? pct(s.webmcpSuccessRate) : <span className="subtle">no tools</span>}
              </td>
              <td><Link href={`/site/${s.slug}`}>detail</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="subtle" style={{ marginTop: 8 }}>
        Rows marked <span className="badge sample">sample data</span> are illustrative fixtures
        shipped with the open-source repo so the methodology is inspectable — they are not
        measurements of real companies. The demo store rows are live, reproducible runs.
      </p>

      <div className="split">
        <section className="panel">
          <h2>Readiness report</h2>
          <p className="subtle">
            Ask your agent to draft a report here (<code>draft_readiness_report</code>).
            It lands in this editor; you refine it; the agent can read your edits back
            (<code>get_report_draft</code>) and revise. Same document, two authors.
          </p>
          <textarea
            className="draft"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="No draft yet. Your agent writes here — or you do."
            aria-label="Readiness report draft"
          />
          <div className="draft-actions">
            <button onClick={() => navigator.clipboard?.writeText(draft)}>Copy report</button>
            <button onClick={() => setDraft("")}>Clear</button>
          </div>
        </section>

        <section className="panel">
          <h2>Agent activity on this page</h2>
          <p className="subtle">
            Every WebMCP tool call is logged by the AgentReady SDK — this is the analytics
            layer working on its own dashboard.
          </p>
          <div className="activity" aria-live="polite">
            {activity.length === 0 ? (
              <span className="muted">— no agent activity yet —</span>
            ) : (
              activity.join("\n")
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
