import React from "react";
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BROLL, REPO_URL, SITE_URL, Scene, brand } from "../scenes";
import { BrollBackground } from "./BrollBackground";

const STATS = ["13 tools", "2 surfaces", "real serverless audits", "MIT"];

/**
 * Closing slide: the stats line, the huge category question, then URL + repo
 * held on screen for the final stretch (no fade — the end frame must hold the
 * URL 3+ seconds). Optional dimmed b-roll loops behind it via BROLL.close.
 */
export const CloseCard: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 20s card: stats, question, and URLs must all be settled inside the first
  // ~8s; the URLs then hold with no fade until the final frame.
  const stats = spring({ frame: frame - 10, fps, config: { damping: 200 } });
  const question = spring({
    frame: frame - 55,
    fps,
    config: { damping: 200 },
  });
  const urls = spring({ frame: frame - 130, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill style={{ backgroundColor: brand.bg, fontFamily: brand.sans }}>
      {BROLL.close ? (
        <BrollBackground src="broll/close-bg.mp4" opacity={0.25} />
      ) : null}

      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          gap: 64,
          padding: "60px 100px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
            fontFamily: brand.mono,
            fontSize: 38,
            color: brand.ink,
            opacity: stats,
            transform: `translateY(${(1 - stats) * -30}px)`,
          }}
        >
          {STATS.map((s, i) => (
            <React.Fragment key={s}>
              {i > 0 ? <span style={{ color: brand.dim }}>·</span> : null}
              <span>{s}</span>
            </React.Fragment>
          ))}
        </div>

        <div
          style={{
            fontSize: 150,
            fontWeight: 800,
            lineHeight: 1.1,
            color: brand.ink,
            textAlign: "center",
            opacity: question,
            transform: `translateY(${(1 - question) * 50}px) scale(${
              0.94 + question * 0.06
            })`,
            textShadow: "0 0 60px rgba(0,0,0,0.6)",
          }}
        >
          Are you <span style={{ color: brand.accent }}>agent-ready</span>?
        </div>

        <div
          style={{
            textAlign: "center",
            fontFamily: brand.mono,
            lineHeight: 1.7,
            opacity: urls,
            transform: `translateY(${(1 - urls) * 30}px)`,
          }}
        >
          <div style={{ fontSize: 48, color: brand.accent, fontWeight: 700 }}>
            {SITE_URL}
          </div>
          <div style={{ fontSize: 32, color: brand.dim, marginTop: 10 }}>
            {REPO_URL} · built on WebMCP + Cloudflare
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
