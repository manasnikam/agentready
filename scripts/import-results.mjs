#!/usr/bin/env node
// Merge runner/results/*.json into data/audits.json (replaces same-slug entries).
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const dataPath = "data/audits.json";
const resultsDir = "runner/results";
if (!existsSync(resultsDir)) { console.error("No runner/results directory."); process.exit(1); }

const audits = JSON.parse(readFileSync(dataPath, "utf8"));
const bySlug = new Map(audits.map((a) => [a.slug, a]));

let merged = 0;
for (const f of readdirSync(resultsDir).filter((f) => f.endsWith(".json"))) {
  const site = JSON.parse(readFileSync(join(resultsDir, f), "utf8"));
  const existing = bySlug.get(site.slug);
  if (existing && !existing.synthetic) {
    existing.runs.push(...site.runs);
    existing.hasWebMCP = existing.hasWebMCP || site.hasWebMCP;
  } else {
    bySlug.set(site.slug, site); // real runs replace synthetic fixtures
  }
  merged++;
}
writeFileSync(dataPath, JSON.stringify([...bySlug.values()], null, 2));
console.log(`Merged ${merged} result file(s) into ${dataPath}. Commit and redeploy to publish.`);
