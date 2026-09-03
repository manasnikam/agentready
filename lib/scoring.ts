import type { AuditRun, SiteAudit, SiteScore } from "./types";

function rate(runs: AuditRun[]): number | null {
  if (runs.length === 0) return null;
  return runs.filter((r) => r.completed).length / runs.length;
}

function avgSteps(runs: AuditRun[]): number | null {
  const done = runs.filter((r) => r.completed);
  if (done.length === 0) return null;
  return Math.round(done.reduce((s, r) => s + r.steps, 0) / done.length);
}

/**
 * Readiness score 0–100.
 * 70% weighted on the best available success rate (webmcp if present, else ui),
 * 15% on offering a WebMCP tool surface at all,
 * 15% on efficiency (fewer steps to complete = better).
 */
export function scoreSite(site: SiteAudit): SiteScore {
  const uiRuns = site.runs.filter((r) => r.mode === "ui");
  const mcpRuns = site.runs.filter((r) => r.mode === "webmcp");
  const uiRate = rate(uiRuns);
  const mcpRate = rate(mcpRuns);

  const best = mcpRate ?? uiRate ?? 0;
  const toolBonus = site.hasWebMCP ? 1 : 0;
  const stepsBase = avgSteps(mcpRuns) ?? avgSteps(uiRuns);
  // 4 steps or fewer = full efficiency credit; 20+ = none.
  const efficiency =
    stepsBase == null ? 0 : Math.max(0, Math.min(1, (20 - stepsBase) / 16));

  const readiness = Math.round(100 * (0.7 * best + 0.15 * toolBonus + 0.15 * efficiency));

  const failureBreakdown: Record<string, number> = {};
  for (const r of site.runs) {
    if (!r.completed) {
      const k = r.failureCategory ?? "other";
      failureBreakdown[k] = (failureBreakdown[k] ?? 0) + 1;
    }
  }

  return {
    slug: site.slug,
    name: site.name,
    category: site.category,
    synthetic: site.synthetic,
    hasWebMCP: site.hasWebMCP,
    uiSuccessRate: uiRate,
    webmcpSuccessRate: mcpRate,
    readinessScore: readiness,
    totalRuns: site.runs.length,
    avgStepsUi: avgSteps(uiRuns),
    avgStepsWebmcp: avgSteps(mcpRuns),
    failureBreakdown,
  };
}

export function pct(v: number | null): string {
  return v == null ? "—" : `${Math.round(v * 100)}%`;
}
