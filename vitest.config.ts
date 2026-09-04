import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Plain Vitest config on purpose — booting Astro's config here would drag the
// Cloudflare adapter into the test runtime (see change research.md).
export default defineConfig({
  resolve: {
    alias: {
      // Unit tests never talk to Workers AI; the stub exposes a mutable env.
      "cloudflare:workers": fileURLToPath(new URL("./test/stubs/cloudflare-workers.ts", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
