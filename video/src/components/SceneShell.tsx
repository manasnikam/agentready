import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  COPILOT_CUT_RATIO,
  RECORDINGS,
  Scene,
  TOOL_CALLS,
  TRIM_SECONDS,
  brand,
} from "../scenes";
import { ToolCall } from "./ToolCall";
import { UrlChip } from "./UrlChip";

/** Brief 2s lower-third scene title intro (recording mode only). */
const TitleIntro: React.FC<{ title: string }> = ({ title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const HOLD = 60; // 2s
  const FADE = 15;
  if (frame > HOLD + FADE) return null;
  const enter = spring({ frame, fps, config: { damping: 200 } });
  const exit = interpolate(frame, [HOLD, HOLD + FADE], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        bottom: 60,
        padding: "20px 34px",
        borderRadius: 12,
        backgroundColor: "rgba(11, 14, 20, 0.9)",
        border: `1px solid rgba(139, 148, 167, 0.25)`,
        opacity: Math.min(enter, exit),
        transform: `translateX(${(1 - enter) * -70}px)`,
      }}
    >
      <div
        style={{
          color: brand.accent,
          fontFamily: brand.mono,
          fontSize: 22,
          letterSpacing: 4,
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        AgentReady
      </div>
      <div style={{ fontSize: 40, fontWeight: 700, color: brand.ink }}>
        {title}
      </div>
    </div>
  );
};

const videoStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

/** Full-bleed recording with a subtle rounded-corner inset (no title bar). */
const RecordingLayer: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { fps } = useVideoConfig();
  const durationInFrames = scene.durationInSeconds * fps;
  // Copilot optionally hard-cuts to the live-audit clip partway through.
  const dual = scene.id === "copilot" && RECORDINGS.liveaudit;
  const cut = Math.round(durationInFrames * COPILOT_CUT_RATIO);
  const trim = (id: string) => Math.round((TRIM_SECONDS[id] ?? 0) * fps);
  return (
    <AbsoluteFill style={{ padding: 24 }}>
      <div
        style={{
          flex: 1,
          position: "relative",
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid rgba(139, 148, 167, 0.18)",
          backgroundColor: brand.panel,
        }}
      >
        {dual ? (
          <>
            <Sequence from={0} durationInFrames={cut}>
              <OffthreadVideo
                src={staticFile("recordings/copilot.mp4")}
                trimBefore={trim("copilot")}
                style={videoStyle}
                muted
              />
            </Sequence>
            <Sequence from={cut}>
              <OffthreadVideo
                src={staticFile("recordings/liveaudit.mp4")}
                trimBefore={trim("liveaudit")}
                style={videoStyle}
                muted
              />
            </Sequence>
          </>
        ) : (
          <OffthreadVideo
            src={staticFile(`recordings/${scene.id}.mp4`)}
            trimBefore={trim(scene.id)}
            style={videoStyle}
            muted
          />
        )}
      </div>
    </AbsoluteFill>
  );
};

/** Styled placeholder until the recording lands (RECORDINGS[id] false). */
const PlaceholderLayer: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ padding: 60 }}>
      <div
        style={{
          transform: `translateY(${(1 - enter) * -40}px)`,
          opacity: enter,
          marginBottom: 36,
          marginRight: 640, // keep clear of the URL chip top-right
        }}
      >
        <div
          style={{
            color: brand.accent,
            fontFamily: brand.mono,
            fontSize: 26,
            letterSpacing: 4,
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          AgentReady
        </div>
        <div style={{ fontSize: 56, fontWeight: 700 }}>{scene.title}</div>
      </div>
      <div
        style={{
          flex: 1,
          borderRadius: 18,
          overflow: "hidden",
          border: `1px solid ${brand.panel}`,
          backgroundColor: brand.panel,
          transform: `translateY(${(1 - enter) * 60}px)`,
          opacity: enter,
          position: "relative",
        }}
      >
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
            padding: "0 80px 90px", // bottom padding clears the tool-call pills
          }}
        >
          <div
            style={{
              fontFamily: brand.mono,
              fontSize: 30,
              color: brand.accent2,
            }}
          >
            public/recordings/{scene.id}.mp4
          </div>
          <div
            style={{
              maxWidth: 1100,
              textAlign: "center",
              fontSize: 30,
              lineHeight: 1.5,
              color: brand.dim,
            }}
          >
            {scene.narration}
          </div>
        </AbsoluteFill>
      </div>
    </AbsoluteFill>
  );
};

/**
 * Recording scenes (benchmark / copilot / store): full-bleed capture when the
 * mp4 exists, otherwise a placeholder. Always overlaid with the URL chip and
 * the scene's scheduled tool-call lower-thirds (WebMCP Leverage is scored on
 * visible use).
 */
export const SceneShell: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationInFrames = scene.durationInSeconds * fps;
  const hasRecording = RECORDINGS[scene.id] === true;
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const toolCalls = TOOL_CALLS[scene.id] ?? [];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: brand.bg,
        fontFamily: brand.sans,
        color: brand.ink,
        opacity: fadeOut,
      }}
    >
      {hasRecording ? (
        <RecordingLayer scene={scene} />
      ) : (
        <PlaceholderLayer scene={scene} />
      )}
      {hasRecording ? <TitleIntro title={scene.title} /> : null}
      <UrlChip />
      {toolCalls.map((tc) => (
        <ToolCall key={`${tc.name}-${tc.at}`} name={tc.name} at={tc.at} />
      ))}
    </AbsoluteFill>
  );
};
