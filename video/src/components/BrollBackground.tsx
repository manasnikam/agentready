import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, staticFile } from "remotion";
import { BROLL_CLIP_SECONDS, FPS, brand } from "../scenes";

/**
 * Dimmed, seamlessly-looped background video under a card scene.
 * The Veo b-roll clips are exactly 8.0s, so <Loop> repeats them for the full
 * scene length. Kept at low opacity with a dark scrim so foreground text
 * stays fully readable.
 */
export const BrollBackground: React.FC<{ src: string; opacity?: number }> = ({
  src,
  opacity = 0.25,
}) => (
  <AbsoluteFill style={{ backgroundColor: brand.bg }}>
    <AbsoluteFill style={{ opacity }}>
      <Loop durationInFrames={BROLL_CLIP_SECONDS * FPS}>
        <OffthreadVideo
          src={staticFile(src)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          muted
        />
      </Loop>
    </AbsoluteFill>
    {/* scrim: guarantees contrast for 300px numbers over bright b-roll frames */}
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse at center, rgba(11,14,20,0.25) 0%, rgba(11,14,20,0.7) 100%)",
      }}
    />
  </AbsoluteFill>
);
