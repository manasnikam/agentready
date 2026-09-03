/**
 * Lazy access to Cloudflare bindings. On Workers, cloudflare:workers resolves
 * natively (marked external in vite.config); under plain Node it throws and
 * callers degrade gracefully.
 */
export async function getCfEnv<T = Record<string, unknown>>(): Promise<T | null> {
  try {
    const mod = (await import("cloudflare:workers")) as { env?: T };
    return mod.env ?? null;
  } catch {
    return null;
  }
}
