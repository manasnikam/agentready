export type FailureCategory =
  | "auth_wall"
  | "captcha"
  | "popup_interference"
  | "ambiguous_ui"
  | "missing_info"
  | "navigation_loop"
  | "timeout"
  | "tool_error"
  | "other";

export interface AuditRun {
  runId: string;
  mode: "ui" | "webmcp";
  task: string;
  completed: boolean;
  steps: number;
  durationMs: number;
  failureCategory?: FailureCategory;
  note?: string;
  timestamp: string;
}

export interface SiteAudit {
  slug: string;
  name: string;
  url: string;
  category: string;
  /** true = illustrative sample data shipped with the repo, not a real measurement */
  synthetic: boolean;
  hasWebMCP: boolean;
  runs: AuditRun[];
}

export interface SiteScore {
  slug: string;
  name: string;
  category: string;
  synthetic: boolean;
  hasWebMCP: boolean;
  uiSuccessRate: number | null;
  webmcpSuccessRate: number | null;
  readinessScore: number; // 0–100
  totalRuns: number;
  avgStepsUi: number | null;
  avgStepsWebmcp: number | null;
  failureBreakdown: Record<string, number>;
}

export interface TelemetryEvent {
  id: string;
  ts: string;
  source: string; // e.g. "demo-store"
  tool: string;
  input: unknown;
  ok: boolean;
  durationMs: number;
  result?: unknown;
  error?: string;
}
