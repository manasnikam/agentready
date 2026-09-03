import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Scene, brand } from "../scenes";

/** Opening title card: the question, then the answer. */
export const HookCard: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const q = spring({ frame, fps, config: { damping: 200 } });
  const a = spring({ frame: frame - fps * 1.2, fps, config: { damping: 200 } });
  const fadeOut = interpolate(
    frame,
    [scene.durationInSeconds * fps - 15, scene.durationInSeconds * fps],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: brand.bg,
        fontFamily: brand.sans,
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
        opacity: fadeOut,
        padding: 120,
      }}
    >
      <div
        style={{
          fontSize: 84,
          fontWeight: 800,
          color: brand.ink,
          textAlign: "center",
          lineHeight: 1.2,
          opacity: q,
          transform: `translateY(${(1 - q) * 40}px)`,
        }}
      >
        Can an AI agent actually
        <br />
        use your website?
      </div>
      <div
        style={{
          fontSize: 40,
          color: brand.accent,
          fontFamily: brand.mono,
          opacity: a,
          transform: `translateY(${(1 - a) * 30}px)`,
        }}
      >
        AgentReady — the readiness benchmark for the agent-native web
      </div>
    </AbsoluteFill>
  );
};
