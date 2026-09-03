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
import { RECORDINGS, Scene, brand } from "../scenes";

/**
 * Default scene: kicker + title bar on top, screen recording below.
 * Until public/recordings/<id>.mp4 exists (flip RECORDINGS[id]), a styled
 * placeholder shows what to capture there.
 */
export const SceneShell: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 } });
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
        color: brand.ink,
        opacity: fadeOut,
        padding: 60,
      }}
    >
      <div
        style={{
          transform: `translateY(${(1 - enter) * -40}px)`,
          opacity: enter,
          marginBottom: 36,
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
        }}
      >
        {RECORDINGS[scene.id] ? (
          <OffthreadVideo
            src={staticFile(`recordings/${scene.id}.mp4`)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            muted
          />
        ) : (
          <AbsoluteFill
            style={{
              position: "relative",
              alignItems: "center",
              justifyContent: "center",
              gap: 24,
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
        )}
      </div>
    </AbsoluteFill>
  );
};
