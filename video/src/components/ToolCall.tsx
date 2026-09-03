import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "../scenes";

const ENTER_FRAMES = 14;
const HOLD_FRAMES = 75; // ~2.5s at 30fps
const FADE_FRAMES = 15;
export const TOOL_CALL_LIFETIME = ENTER_FRAMES + HOLD_FRAMES + FADE_FRAMES;

/**
 * Lower-third tool-call pill: "▸ tool_name()" slides in bottom-left at frame
 * `at` (scene-local), holds ~2.5s, fades out. Judges score visible tool use —
 * this is the on-screen receipt for every WebMCP call.
 */
export const ToolCall: React.FC<{ name: string; at: number }> = ({
  name,
  at,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - at;
  if (local < 0 || local > TOOL_CALL_LIFETIME) return null;

  const enter = spring({
    frame: local,
    fps,
    config: { damping: 200 },
    durationInFrames: ENTER_FRAMES + 6,
  });
  const exit = interpolate(
    local,
    [ENTER_FRAMES + HOLD_FRAMES, TOOL_CALL_LIFETIME],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        bottom: 60,
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "18px 30px",
        borderRadius: 12,
        backgroundColor: "rgba(20, 25, 39, 0.94)",
        border: "1px solid rgba(74, 222, 128, 0.35)",
        borderLeft: `6px solid ${brand.accent}`,
        boxShadow: "0 10px 34px rgba(0, 0, 0, 0.5)",
        fontFamily: brand.mono,
        fontSize: 32,
        color: brand.ink,
        opacity: Math.min(enter, exit),
        transform: `translateX(${(1 - enter) * -70}px)`,
      }}
    >
      <span style={{ color: brand.accent }}>▸</span>
      <span>
        {name}
        <span style={{ color: brand.dim }}>()</span>
      </span>
    </div>
  );
};
