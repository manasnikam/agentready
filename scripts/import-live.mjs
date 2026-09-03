#!/usr/bin/env node
// Pull serverless audit runs (D1, via the deployment's own API) into
// data/audits.json, replacing the runs of the matching slug entry.
// Usage: node scripts/import-live.mjs [slug] [deployment-url]
import { readFileSync, writeFileSync } from "node:fs";

const slug = process.argv[2] ?? "agentready-outfitters";
const base = process.argv[3] ?? "https://agentready.prescalesystems.workers.dev";
const dataPath = "data/audits.json";

const res = await fetch(`${base}/api/audit?slug=${encodeURIComponent(slug)}`);
const { runs: rows } = await res.json();
if (!rows?.length) {
  console.error(`No serverless runs for '${slug}' at ${base}.`);
  process.exit(1);
}

// Harness-error runs are not measurements of the site: exclude runs that
// failed on a known worker bug (fixed in-place), and say so.
const HARNESS_BUGS = [/content\.match is not a function/];
const excluded = rows.filter((r) => HARNESS_BUGS.some((p) => p.test(r.note ?? "")));
const kept = rows.filter((r) => !excluded.includes(r));

const runs = kept.map((r) => ({
  runId: r.id,
  mode: r.mode,
  task: r.task,
  completed: r.completed === 1 || r.completed === true,
  steps: r.steps,
  durationMs: r.duration_ms,
  ...(r.failure_category ? { failureCategory: r.failure_category } : {}),
  timestamp: r.ts,
}));

const audits = JSON.parse(readFileSync(dataPath, "utf8"));
const site = audits.find((a) => a.slug === slug);
if (!site) {
  console.error(`No '${slug}' entry in ${dataPath} to update.`);
  process.exit(1);
}
site.runs = runs;
site.synthetic = false;
writeFileSync(dataPath, JSON.stringify(audits, null, 2));

const by = (mode) => runs.filter((r) => r.mode === mode);
const ok = (rs) => rs.filter((r) => r.completed).length;
console.log(`Imported ${runs.length} measured run(s) for '${slug}' (excluded ${excluded.length} harness-error row(s)).`);
for (const mode of ["ui", "webmcp"]) {
  const rs = by(mode);
  if (rs.length) console.log(`  ${mode}: ${ok(rs)}/${rs.length} completed`);
}
console.log("Commit and redeploy to publish.");
