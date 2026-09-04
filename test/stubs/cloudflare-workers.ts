// Test stand-in for the `cloudflare:workers` module (aliased in
// vitest.config.ts). Exposes the same `env` symbol production code imports.
// AI.run rejects by default so a test that forgets to override it fails
// loudly instead of silently passing.

type AiRun = (model: string, options: unknown) => Promise<unknown>;

export const env = {
  AI: {
    run: (() => Promise.reject(new Error("cloudflare-workers stub: override env.AI.run in the test"))) as AiRun,
  },
};
