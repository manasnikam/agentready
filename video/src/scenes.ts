import narration from "../narration.json";

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/**
 * Flip these to true as assets land in public/:
 *  - audio: after `npm run audio` writes public/audio/<id>.wav
 *  - recordings: for each public/recordings/<id>.mp4 you capture
 * (Remotion fails the render on a missing staticFile, so presence is explicit.)
 */
export const HAS_AUDIO = true;
export const RECORDINGS: Record<string, boolean> = {
  hook: true,
  benchmark: true,
  copilot: true,
  liveaudit: true, // optional 2nd copilot clip: public/recordings/liveaudit.mp4
  store: true,
  close: false,
};

/**
 * Editorial trims: seconds cut from the front of each recording (OffthreadVideo
 * trimBefore) so the key beats land inside the scene window. Source timestamps:
 *  - copilot: draft lands ~0:09, human edit ~0:17–0:26, get_report_draft
 *    readback overlay ~0:28.5–0:34.5 (judge moment #2 — must play in full)
 *  - liveaudit: queue_live_audit overlay ~0:04–0:09, /live stream from ~0:10
 *  - store: human click-add ~0:12, agent view_cart/add_to_cart ~0:18–0:25,
 *    /live traffic page from ~0:28 (front page-load gets trimmed)
 */
export const TRIM_SECONDS: Record<string, number> = {
  hook: 0,
  benchmark: 2, // skip the unloaded white page — /sites is rendered by ~0:02
  copilot: 7,
  liveaudit: 20, // skip the washed-out overlay; dark /live event stream (queue_live_audit log line) is strongest ~0:20–0:35
  store: 11,
};

/**
 * Optional dimmed B-roll behind the hook/close cards.
 * Flip when public/broll/<id>-bg.mp4 exists; missing files never break the
 * render because the flag gates the <OffthreadVideo>.
 */
export const BROLL: Record<string, boolean> = {
  hook: true,
  close: true,
};

/** The Veo b-roll clips are exactly 8.0s each; <Loop> repeats them. */
export const BROLL_CLIP_SECONDS = 8;

/** Live deployment + repo — the URL chip and close card read these. */
export const SITE_URL = "agentready.prescalesystems.workers.dev";
export const REPO_URL = "github.com/manasnikam/agentready";

/**
 * Tool-call lower-third schedule per scene. `at` is the frame offset within
 * the scene (30fps), timed against the narration beats. Narration audio is
 * shorter than each scene, so calls are front-loaded.
 */
export const TOOL_CALLS: Record<string, { name: string; at: number }[]> = {
  benchmark: [
    { name: "list_audited_sites", at: 60 }, // "This is AgentReady, live in production"
    { name: "get_site_score", at: 290 }, // "demo store scores one hundred with tools"
    { name: "get_failure_breakdown", at: 400 }, // "the autopsy shows why"
  ],
  copilot: [
    { name: "draft_readiness_report", at: 120 }, // "my agent calls draft readiness report"
    { name: "get_report_draft", at: 480 }, // "the agent ... reads my edit back"
    { name: "queue_live_audit", at: 760 }, // "queue live audit fires a real audit"
    { name: "get_live_audit_results", at: 1020 }, // "my agent reads them back, live"
  ],
  store: [
    { name: "search_products", at: 90 }, // "my agent searches products"
    { name: "add_to_cart", at: 300 }, // "adds to cart"
    { name: "view_cart", at: 480 }, // "we share one cart"
    { name: "start_checkout", at: 660 }, // "starts checkout, through tools"
  ],
};

/**
 * In the copilot scene, hard-cut copilot.mp4 -> liveaudit.mp4 at 62% (~0:27.9).
 * With the 7s copilot trim the readback overlay finishes at ~0:27 scene time,
 * so the cut lands just after judge moment #2 completes.
 */
export const COPILOT_CUT_RATIO = 0.62;

/**
 * Insert narration lines (review fix #2): extra wavs layered at frame offsets
 * inside a scene, on top of the scene's main narration wav (which they must
 * not overlap). copilot-insert (6.3s) starts just after the copilot→liveaudit
 * hard cut (frame 837) and after the main copilot wav ends (27.1s = frame
 * 814); it sells the live /live event stream as a REAL serverless audit.
 * store-insert (5.0s) lands ~2/3 into the store scene, after the main store
 * wav ends (20.2s = frame 605), closing the benchmark loop.
 */
export const INSERT_AUDIO: Record<string, { file: string; at: number }[]> = {
  copilot: [{ file: "audio/copilot-insert.wav", at: 850 }], // ends ~frame 1039 < 1350
  store: [{ file: "audio/store-insert.wav", at: 700 }], // ends ~frame 850 < 1050
};

export interface Scene {
  id: string;
  title: string;
  durationInSeconds: number;
  narration: string;
}

export const scenes: Scene[] = narration.scenes;

export const totalDurationInFrames = scenes.reduce(
  (sum, s) => sum + s.durationInSeconds * FPS,
  0
);

export function sceneStartFrame(id: string): number {
  let acc = 0;
  for (const s of scenes) {
    if (s.id === id) return acc;
    acc += s.durationInSeconds * FPS;
  }
  throw new Error(`unknown scene ${id}`);
}

export const brand = {
  bg: "#0b0e14",
  panel: "#141927",
  ink: "#e8ecf4",
  dim: "#8b94a7",
  accent: "#4ade80",
  accent2: "#60a5fa",
  danger: "#f87171",
  mono: "'SF Mono', 'Fira Code', Menlo, monospace",
  sans: "'Inter', 'Helvetica Neue', Arial, sans-serif",
};
