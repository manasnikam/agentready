import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";

// Minimal Cloudflare config: this app is client-heavy with one API route, so
// the KV/CDN cache adapters and image optimizer are intentionally omitted.
export default defineConfig({
  plugins: [
    vinext(),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
  build: {
    rolldownOptions: {
      // cloudflare:* modules are provided by workerd at runtime
      external: [/^cloudflare:/],
    },
  },
});
