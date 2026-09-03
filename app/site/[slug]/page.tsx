"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import auditsJson from "@/data/audits.json";
import { scoreSite, pct } from "@/lib/scoring";
import type { SiteAudit } from "@/lib/types";

const audits = auditsJson as unknown as SiteAudit[];

export default function SitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const site = useMemo(() => audits.find((a) => a.slug === slug), [slug]);

  if (!site) {
    return (
      <main>
        <h1>Site not found</h1>
        <p><Link href="/">Back to the index</Link></p>
      </main>
    );
  }

  const s = scoreSite(site);
  const failures = Object.entries(s.failureBreakdown).sort((a, b) => b[1] - a[1]);
  const failTotal = failures.reduce((t, [, n]) => t + n, 0);

  return (
    <main>
      <p><Link href="/">← Readiness index</Link></p>
      <section className="hero">
        <h1>{site.name}</h1>
        <p className="lede subtle">
          {site.category} · {s.totalRuns} audit runs · task: find a product and add it to the cart
          {site.synthetic && " · sample data (illustrative fixture, not a real measurement)"}
        </p>
      </section>

      <div className="split">
        <section className="panel">
          <h3>Readiness score</h3>
          <div className="bignum" style={{ color: s.readinessScore >= 75 ? "var(--ok)" : s.readinessScore >= 45 ? "var(--warn)" : "var(--bad)" }}>
            {s.readinessScore}<span className="subtle" style={{ fontSize: "1rem" }}>/100</span>
          </div>
          <p className="subtle">
            70% task success · 15% WebMCP tool surface · 15% efficiency (steps to complete).
            Full rubric in the open methodology.
          </p>
        </section>

        <section className="panel">
          <h3>The WebMCP delta</h3>
          <p style={{ margin: "6px 0 4px" }}>Agent success via raw UI</p>
          <div className="bar"><i style={{ width: `${(s.uiSuccessRate ?? 0) * 100}%`, background: "var(--ink-soft)" }} /></div>
          <p className="subtle" style={{ margin: "2px 0 12px" }}>{pct(s.uiSuccessRate)} · avg {s.avgStepsUi ?? "—"} steps</p>
          <p style={{ margin: "6px 0 4px" }}>Agent success via WebMCP tools</p>
          <div className="bar"><i style={{ width: `${(s.webmcpSuccessRate ?? 0) * 100}%`, background: "var(--ok)" }} /></div>
          <p className="subtle" style={{ margin: "2px 0 0" }}>
            {site.hasWebMCP ? `${pct(s.webmcpSuccessRate)} · avg ${s.avgStepsWebmcp ?? "—"} steps` : "No WebMCP tools exposed — this is the opportunity."}
          </p>
        </section>
      </div>

      <div className="split">
        <section className="panel">
          <h3>Why runs fail here</h3>
          {failTotal === 0 ? (
            <p className="subtle">No failed runs recorded.</p>
          ) : (
            failures.map(([cat, n]) => (
              <div key={cat} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                  <span>{cat.replace(/_/g, " ")}</span>
                  <span className="subtle">{n} of {failTotal}</span>
                </div>
                <div className="bar"><i style={{ width: `${(n / failTotal) * 100}%`, background: "var(--bad)" }} /></div>
              </div>
            ))
          )}
        </section>

        <section className="panel">
          <h3>Run log</h3>
          <div className="runlist">
            {site.runs.slice(0, 24).map((r) => (
              <div key={r.runId}>
                <span className={r.completed ? "pass" : "fail"}>{r.completed ? "PASS" : "FAIL"}</span>
                {"  "}{r.mode.padEnd(6, " ")} {String(r.steps).padStart(2, " ")} steps
                {"  "}{(r.durationMs / 1000).toFixed(1)}s
                {!r.completed && r.failureCategory ? `  ${r.failureCategory}` : ""}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
