"use client";

/**
 * WebMCP shim. The draft spec and Chrome docs expose the API as
 * document.modelContext.registerTool({ name, description, inputSchema, execute });
 * some builds expose navigator.modelContext. We support both, and no-op
 * gracefully when neither exists so the site still works as a plain web app.
 */

export interface WebMCPToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: any) => Promise<unknown> | unknown;
}

type ModelContextLike = {
  registerTool: (tool: WebMCPToolDef, opts?: unknown) => unknown;
};

export function getModelContext(): ModelContextLike | null {
  if (typeof window === "undefined") return null;
  const d = document as unknown as { modelContext?: ModelContextLike };
  const n = navigator as unknown as { modelContext?: ModelContextLike };
  const mc = d.modelContext ?? n.modelContext ?? null;
  return mc && typeof mc.registerTool === "function" ? mc : null;
}

export function hasWebMCP(): boolean {
  return getModelContext() !== null;
}

async function logTelemetry(evt: {
  source: string; tool: string; input: unknown; ok: boolean;
  durationMs: number; result?: unknown; error?: string;
}) {
  try {
    await fetch("/api/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(evt),
      keepalive: true,
    });
  } catch {
    /* telemetry must never break the product */
  }
}

/**
 * Register tools and instrument every execution. This wrapper IS the seed of
 * the AgentReady analytics SDK: one line per tool, and every agent call is
 * observable in the /live view.
 */
export function registerInstrumentedTools(
  source: string,
  tools: WebMCPToolDef[],
  onActivity?: (line: string) => void
): { registered: boolean } {
  const mc = getModelContext();

  for (const tool of tools) {
    const wrapped: WebMCPToolDef = {
      ...tool,
      execute: async (input: any) => {
        const t0 = performance.now();
        try {
          const result = await tool.execute(input);
          const durationMs = Math.round(performance.now() - t0);
          onActivity?.(`${tool.name}(${compact(input)}) → ok in ${durationMs}ms`);
          void logTelemetry({ source, tool: tool.name, input, ok: true, durationMs, result });
          return result;
        } catch (e: any) {
          const durationMs = Math.round(performance.now() - t0);
          const error = e?.message ?? String(e);
          onActivity?.(`${tool.name}(${compact(input)}) → error: ${error}`);
          void logTelemetry({ source, tool: tool.name, input, ok: false, durationMs, error });
          throw e;
        }
      },
    };
    if (mc) {
      try {
        void mc.registerTool(wrapped);
      } catch (e) {
        console.warn("registerTool failed for", tool.name, e);
      }
    }
    exposeToRunner(wrapped);
  }
  return { registered: mc !== null };
}

/**
 * Mirror registered tools on window.__webmcpRegistry so the AgentReady audit
 * runner (Playwright, headless) can enumerate and execute the exact same tool
 * functions via page.evaluate — even in browsers without native WebMCP.
 * Registered even when the native API is absent.
 */
export function exposeToRunner(tool: WebMCPToolDef) {
  if (typeof window === "undefined") return;
  const w = window as unknown as {
    __webmcpRegistry?: Map<string, WebMCPToolDef>;
  };
  if (!w.__webmcpRegistry) w.__webmcpRegistry = new Map();
  w.__webmcpRegistry.set(tool.name, tool);
}

function compact(v: unknown): string {
  try {
    const s = JSON.stringify(v);
    return s.length > 60 ? s.slice(0, 57) + "…" : s;
  } catch {
    return "?";
  }
}
