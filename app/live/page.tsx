"use client";

import { useEffect, useState } from "react";
import type { TelemetryEvent } from "@/lib/types";

export default function LivePage() {
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const r = await fetch("/api/telemetry", { cache: "no-store" });
        const j = await r.json();
        if (alive) { setEvents(j.events ?? []); setError(null); }
      } catch {
        if (alive) setError("Could not reach the telemetry API.");
      }
    }
    poll();
    const t = setInterval(poll, 2500);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const byTool = new Map<string, { calls: number; fails: number }>();
  for (const e of events) {
    const cur = byTool.get(e.tool) ?? { calls: 0, fails: 0 };
    cur.calls += 1;
    if (!e.ok) cur.fails += 1;
    byTool.set(e.tool, cur);
  }

  return (
    <main>
      <section className="hero">
        <h1>Live agent traffic</h1>
        <p className="lede">
          Every WebMCP tool call on this deployment, captured by the AgentReady SDK — the
          instrumentation any site gets by wrapping <code>registerTool</code>. Open the demo
          store in another tab, let an agent shop, and watch the calls land here.
        </p>
        <p className="subtle">
          Updates every 2.5s. Stored in memory for this demo; the production SDK ships
          OpenTelemetry traces to your own backend.
        </p>
      </section>

      <section className="panel">
        <h3>Calls by tool</h3>
        {byTool.size === 0 ? (
          <p className="subtle">No agent traffic yet in this session.</p>
        ) : (
          <table className="scoreboard">
            <thead>
              <tr><th>Tool</th><th>Calls</th><th>Failures</th></tr>
            </thead>
            <tbody>
              {[...byTool.entries()].sort((a, b) => b[1].calls - a[1].calls).map(([tool, s]) => (
                <tr key={tool}>
                  <td>{tool}</td>
                  <td className="num">{s.calls}</td>
                  <td className="num" style={{ color: s.fails ? "var(--bad)" : undefined }}>{s.fails}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel">
        <h3>Event stream</h3>
        {error && <p className="subtle">{error}</p>}
        <div className="activity">
          {events.length === 0 ? (
            <span className="muted">— listening —</span>
          ) : (
            events
              .map(
                (e) =>
                  `${e.ts.slice(11, 19)}  ${e.source}/${e.tool}  ${e.ok ? "ok" : "FAIL"}  ${e.durationMs}ms  ${
                    e.error ? e.error : JSON.stringify(e.input ?? {}).slice(0, 80)
                  }`
              )
              .join("\n")
          )}
        </div>
      </section>
    </main>
  );
}
