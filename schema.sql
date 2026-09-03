-- D1 schema for AgentReady telemetry
CREATE TABLE IF NOT EXISTS telemetry_events (
  id TEXT PRIMARY KEY,
  ts TEXT NOT NULL,
  source TEXT NOT NULL,
  tool TEXT NOT NULL,
  input TEXT,
  ok INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  result TEXT,
  error TEXT
);
CREATE INDEX IF NOT EXISTS idx_telemetry_ts ON telemetry_events (ts DESC);
