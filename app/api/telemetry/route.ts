import { NextRequest, NextResponse } from "next/server";
import { addEvent, listEvents } from "@/lib/telemetryStore";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (typeof body?.tool !== "string" || typeof body?.source !== "string") {
      return NextResponse.json({ error: "tool and source are required" }, { status: 400 });
    }
    const evt = await addEvent({
      source: String(body.source).slice(0, 64),
      tool: String(body.tool).slice(0, 64),
      input: capJson(body.input, 2000),
      ok: Boolean(body.ok),
      durationMs: Number(body.durationMs) || 0,
      result: capJson(body.result, 4000),
      error: body.error ? String(body.error).slice(0, 400) : undefined,
    });
    return NextResponse.json({ ok: true, id: evt.id });
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ events: await listEvents(100) });
}

/** Unauthenticated endpoint — bound what a single event can put into D1. */
function capJson(v: unknown, max: number): unknown {
  if (v === undefined) return undefined;
  try {
    const s = JSON.stringify(v) ?? "";
    return s.length <= max ? v : { truncated: s.slice(0, max) };
  } catch {
    return { truncated: String(v).slice(0, max) };
  }
}
