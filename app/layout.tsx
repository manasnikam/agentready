import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentReady — readiness benchmark for the agent-native web",
  description:
    "AgentReady measures whether AI agents can actually use your website — and proves how much WebMCP improves it. Benchmark, live agent analytics, and a WebMCP-native workbench.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <header className="topbar">
          <Link href="/" className="wordmark">
            Agent<span>Ready</span>
          </Link>
          <nav>
            <Link href="/">Index</Link>
            <Link href="/store">Demo store</Link>
            <Link href="/live">Live agent traffic</Link>
            <a href="/webmcp-hello.html">API check</a>
          </nav>
        </header>
        {children}
        <footer className="foot">
          AgentReady · a Prescale Systems project · ready before you scale ·{" "}
          <a href="https://github.com/prescale-systems/agentready">source (MIT)</a>
        </footer>
      </body>
    </html>
  );
}
