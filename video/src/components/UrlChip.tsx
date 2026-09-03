import React from "react";
import { brand, SITE_URL } from "../scenes";

/**
 * Persistent minimal URL chip, top-right: "live, not localhost" proof that
 * costs zero seconds. Shown on every scene except hook and close.
 */
export const UrlChip: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 36,
      right: 60,
      padding: "10px 20px",
      borderRadius: 999,
      backgroundColor: "rgba(20, 25, 39, 0.88)",
      border: "1px solid rgba(139, 148, 167, 0.28)",
      fontFamily: brand.mono,
      fontSize: 22,
      letterSpacing: 0.5,
      color: brand.dim,
      display: "flex",
      alignItems: "center",
      gap: 12,
    }}
  >
    <span
      style={{
        width: 10,
        height: 10,
        borderRadius: 999,
        backgroundColor: brand.accent,
        display: "inline-block",
      }}
    />
    <span>{SITE_URL}</span>
  </div>
);
