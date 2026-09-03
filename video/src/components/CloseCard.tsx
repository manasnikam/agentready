import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Scene, brand } from "../scenes";

const PILLARS = ["Benchmark", "Reference implementation", "Analytics layer"];

/** Closing card: three pillars, then the URLs. */
export const CloseCard: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fadeOut = interpolate(
    frame,
    [scene.durationInSeconds * fps - 10, scene.durationInSeconds * fps],
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
        gap: 56,
        opacity: fadeOut,
      }}
    >
      <div
        style={{
          fontSize: 72,
          fontWeight: 800,
          color: brand.ink,
          fontFamily: brand.mono,
        }}
      >
        AgentReady
      </div>
      <div style={{ display: "flex", gap: 32 }}>
        {PILLARS.map((p, i) => {
          const s = spring({
            frame: frame - i * 12,
            fps,
            config: { damping: 200 },
          });
          return (
            <div
              key={p}
              style={{
                padding: "24px 40px",
                borderRadius: 14,
                border: `1px solid ${brand.accent}`,
                color: brand.accent,
                fontSize: 34,
                opacity: s,
                transform: `translateY(${(1 - s) * 30}px)`,
              }}
            >
              {p}
            </div>
          );
        })}
      </div>
      <div
        style={{
          textAlign: "center",
          fontFamily: brand.mono,
          fontSize: 32,
          color: brand.dim,
          lineHeight: 1.8,
        }}
      >
        agentready.prescalesystems.workers.dev
        <br />
        github.com/manasnikam/agentready · MIT · built on WebMCP + Cloudflare
      </div>
    </AbsoluteFill>
  );
};
