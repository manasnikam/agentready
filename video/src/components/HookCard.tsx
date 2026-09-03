import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BROLL, RECORDINGS, Scene, brand } from "../scenes";
import { BrollBackground } from "./BrollBackground";

/** One half of the scorecard: label, huge number, method line. */
const ScoreColumn: React.FC<{
  label: string;
  score: string;
  detail: string;
  color: string;
  enterFrame: number;
}> = ({ label, score, detail, color, enterFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: frame - enterFrame,
    fps,
    config: { damping: 200 },
  });
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        opacity: s,
        transform: `translateY(${(1 - s) * 60}px) scale(${0.9 + s * 0.1})`,
        width: 700,
      }}
    >
      <div
        style={{
          fontFamily: brand.mono,
          fontSize: 40,
          letterSpacing: 8,
          color: brand.ink,
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 320,
          fontWeight: 800,
          lineHeight: 1.05,
          color,
          fontVariantNumeric: "tabular-nums",
          textShadow: "0 0 80px rgba(0,0,0,0.6)",
        }}
      >
        {score}
      </div>
      <div
        style={{
          fontFamily: brand.mono,
          fontSize: 32,
          color: brand.dim,
          textAlign: "center",
        }}
      >
        {detail}
      </div>
    </div>
  );
};

/**
 * Cold-open scorecard: kicker, then RAW UI 0/3 vs WEBMCP 3/3 in huge numbers
 * (held steady well over 2 seconds — the ~0:08 judge moment), then the
 * product line. Real measured data: 3 runs each, same site/task/agent.
 * If recordings/hook.mp4 exists (RECORDINGS.hook) it plays dimmed underneath;
 * otherwise the looped b-roll (BROLL.hook) does; the card works standalone.
 */
export const HookCard: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationInFrames = scene.durationInSeconds * fps;

  // Kicker settles via spring but is fully opaque from frame 0 — the first
  // frame must never read as a gray/blank render glitch (review fix #3a).
  const kicker = spring({ frame, fps, config: { damping: 200 } });
  const product = spring({
    frame: frame - 260, // "AgentReady is the benchmark…" beat, ~8.7s of 12.2s VO
    fps,
    config: { damping: 200 },
  });
  const vs = spring({ frame: frame - 140, fps, config: { damping: 200 } });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: brand.bg, fontFamily: brand.sans }}>
      {/* dimmed background: screen recording wins over b-roll if both exist */}
      {RECORDINGS.hook ? (
        <AbsoluteFill style={{ opacity: 0.22 }}>
          <OffthreadVideo
            src={staticFile("recordings/hook.mp4")}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            muted
          />
        </AbsoluteFill>
      ) : BROLL.hook ? (
        <BrollBackground src="broll/hook-bg.mp4" opacity={0.25} />
      ) : null}

      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          gap: 36,
          opacity: fadeOut,
          padding: "60px 80px",
        }}
      >
        <div
          style={{
            fontFamily: brand.mono,
            fontSize: 44,
            letterSpacing: 12,
            color: brand.ink,
            fontWeight: 700,
            opacity: 1, // visible on the very first frame
            transform: `translateY(${(1 - kicker) * -30}px)`,
            textAlign: "center",
          }}
        >
          SAME SITE. SAME TASK. SAME AGENT.
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 40,
          }}
        >
          <ScoreColumn
            label="RAW UI"
            score="0/3"
            detail="all 3 runs timed out at 15 steps"
            color={brand.danger}
            enterFrame={100}
          />
          <div
            style={{
              fontFamily: brand.mono,
              fontSize: 48,
              color: brand.dim,
              opacity: vs,
              paddingBottom: 40,
            }}
          >
            vs
          </div>
          <ScoreColumn
            label="WEBMCP"
            score="3/3"
            detail="~4 steps average"
            color={brand.accent}
            enterFrame={180}
          />
        </div>

        <div
          style={{
            fontFamily: brand.mono,
            fontSize: 36,
            color: brand.accent,
            opacity: product,
            transform: `translateY(${(1 - product) * 30}px)`,
            textAlign: "center",
          }}
        >
          AgentReady — the readiness benchmark for the agent-native web
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
