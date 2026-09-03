import type { TelemetryEvent } from "./types";

/**
 * Telemetry store, Cloudflare-native.
 * - On Workers: persists to D1 (binding: DB) — durable across isolates/regions.
 * - In plain `next dev`/`next start` without a binding: in-memory fallback so
 *   local development needs zero setup.
 * Production path beyond the hackathon: mirror writes to Workers Analytics
 * Engine for aggregate queries, and OTel export for customer backends.
 */

const globalStore = globalThis as unknown as { __agentreadyEvents?: TelemetryEvent[] };
if (!globalStore.__agentreadyEvents) globalStore.__agentreadyEvents = [];

type D1Like = {
  prepare: (sql: string) => {
    bind: (...args: unknown[]) => {
      run: () => Promise<unknown>;
      all: <T>() => Promise<{ results: T[] }>;
    };
  };
};

async function getDb(): Promise<D1Like | null> {
  // On Cloudflare Workers, bindings live on the env export of the runtime's
  // cloudflare:workers module (the import is marked external in vite.config,
  // so workerd resolves it natively). Under plain Node (`vinext start`
  // locally) the import throws and we fall back to in-memory storage.
  try {
    const mod = (await import("cloudflare:workers")) as { env?: { DB?: D1Like } };
    return mod.env?.DB ?? null;
  } catch {
    return null;
  }
}

function makeEvent(e: Omit<TelemetryEvent, "id" | "ts">): TelemetryEvent {
  return {
    ...e,
    id: crypto.randomUUID().slice(0, 8),
    ts: new Date().toISOString(),
  };
}

let schemaReady = false;

async function ensureSchema(db: D1Like) {
  if (schemaReady) return;
  await db
    .prepare(
      "CREATE TABLE IF NOT EXISTS telemetry_events (id TEXT PRIMARY KEY, ts TEXT NOT NULL, source TEXT NOT NULL, tool TEXT NOT NULL, input TEXT, ok INTEGER NOT NULL, duration_ms INTEGER NOT NULL, result TEXT, error TEXT)"
    )
    .bind()
    .run();
  schemaReady = true;
}

export async function addEvent(e: Omit<TelemetryEvent, "id" | "ts">): Promise<TelemetryEvent> {
  const evt = makeEvent(e);
  const db = await getDb();
  if (db) {
    await ensureSchema(db);
    await db
      .prepare(
        "INSERT INTO telemetry_events (id, ts, source, tool, input, ok, duration_ms, result, error) VALUES (?,?,?,?,?,?,?,?,?)"
      )
      .bind(
        evt.id, evt.ts, evt.source, evt.tool,
        JSON.stringify(evt.input ?? null),
        evt.ok ? 1 : 0,
        evt.durationMs,
        JSON.stringify(evt.result ?? null),
        evt.error ?? null
      )
      .run();
    return evt;
  }
  const store = globalStore.__agentreadyEvents!;
  store.push(evt);
  if (store.length > 500) store.splice(0, store.length - 500);
  return evt;
}

interface Row {
  id: string; ts: string; source: string; tool: string;
  input: string | null; ok: number; duration_ms: number;
  result: string | null; error: string | null;
}

export async function listEvents(limit = 100): Promise<TelemetryEvent[]> {
  const db = await getDb();
  if (db) {
    await ensureSchema(db);
    const { results } = await db
      .prepare("SELECT * FROM telemetry_events ORDER BY ts DESC LIMIT ?")
      .bind(limit)
      .all<Row>();
    return results.map((r) => ({
      id: r.id, ts: r.ts, source: r.source, tool: r.tool,
      input: safeParse(r.input), ok: r.ok === 1, durationMs: r.duration_ms,
      result: safeParse(r.result), error: r.error ?? undefined,
    }));
  }
  return globalStore.__agentreadyEvents!.slice(-limit).reverse();
}

function safeParse(v: string | null): unknown {
  if (v == null) return undefined;
  try { return JSON.parse(v); } catch { return v; }
}
