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
export const HAS_AUDIO = false;
export const RECORDINGS: Record<string, boolean> = {
  hook: false,
  benchmark: false,
  copilot: false,
  store: false,
  close: false,
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
