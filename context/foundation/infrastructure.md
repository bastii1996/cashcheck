---
project: CashCheck
researched_at: 2026-09-01
recommended_platform: Cloudflare Workers
runner_up: Netlify
context_type: mvp
tech_stack:
  language: TypeScript
  framework: Astro 6 (SSR) + React 19
  runtime: workerd (Cloudflare Workers) via @astrojs/cloudflare
---

## Recommendation

**Deploy on Cloudflare Workers.**

Cloudflare Workers is the only candidate that passes all five agent-friendliness criteria, and its free tier (100k requests **per day**) covers CashCheck's expected volume (100k/month, `target_scale.users: small`) at zero cost — decisive given the stated priority of minimising monthly spend. The stack is already wired for it: `@astrojs/cloudflare` is installed, `wrangler.jsonc` exists with `nodejs_compat`, and a production build passes locally. No persistent connections are needed (realtime and background jobs are PRD non-goals), so nothing is lost by choosing a serverless runtime, and Supabase already supplies the database and auth externally, so co-located managed services carry no weight.

**Correction to the earlier hand-off**: `tech-stack.md` records `deployment_target: cloudflare-pages`, but `@astrojs/cloudflare` no longer supports Pages deployment, and Cloudflare's own docs direct new projects to Workers. The deployment target is **Workers**, not Pages.

## Platform Comparison

| Platform           | CLI-first | Managed/serverless | Agent-readable docs | Stable deploy API | MCP / integration | Total             |
| ------------------ | --------- | ------------------ | ------------------- | ----------------- | ----------------- | ----------------- |
| Cloudflare Workers | Pass      | Pass               | Pass                | Pass              | Pass              | 5 Pass            |
| Vercel             | Pass      | Pass               | Pass                | Pass              | Partial           | 4 Pass, 1 Partial |
| Netlify            | Partial   | Pass               | Pass                | Pass              | Pass              | 4 Pass, 1 Partial |
| Render             | Partial   | Pass               | Pass                | Pass              | Partial           | 3 Pass, 2 Partial |
| Railway            | Partial   | Pass               | Pass                | Partial           | Pass              | 3 Pass, 2 Partial |
| Fly.io             | Partial   | Partial            | Pass                | Pass              | Partial           | 2 Pass, 3 Partial |

Per-platform notes:

- **Cloudflare Workers** — full operational loop in `wrangler` v4 (`deploy`, `rollback [VERSION_ID]`, `tail`, `secret put`, plus `versions upload`/`versions deploy` for gradual rollout). Publishes `llms.txt` and serves every docs page as markdown via `Accept: text/markdown`. Managed remote MCP servers for docs, bindings, builds and observability. No raw infrastructure to misconfigure.
- **Vercel** — best-in-class agent documentation (`llms-full.txt`, `.md` per page, `.graph.md` cross-links, `vercel agent init`) and the only scriptable `rollback` verb among the serverless three. Disqualified on cost: the Hobby tier is explicitly restricted to non-commercial personal use, so any real deployment implies Pro at $20/month/seat. MCP server is public beta.
- **Netlify** — official Astro 6 support shipped day one; Astro Sessions auto-wire to Netlify Blobs with no external store (a genuine edge over Vercel, which needs Redis); MCP server is not labelled beta. Loses a criterion because **no `rollback` command exists** — rollback is UI-only, and scripting it requires raw `netlify api` calls. Credit-based free tier charges 15 credits per production deploy against a 300-credit monthly cap that takes sites **offline** when exhausted; roughly 20 production deploys consume the whole allowance.
- **Render** — the only genuinely free, no-credit-card tier (750 instance-hours/month). Free services spin down after 15 minutes idle and take 30–60 seconds to wake, which is a poor property for a link someone else opens to review. MCP server is GA but deliberately read-mostly (it can diagnose but cannot deploy). Rollback exists via API/dashboard but does not pause autodeploy, so the next push can silently restore bad code.
- **Railway** — strongest agent story overall (MCP server bundled into the CLI, reusing `railway login`), long-running containers with no cold starts. Held back by no rollback in the CLI (dashboard only, 24-hour retention on Free) and by Railpack — the now-default builder — still being beta, with reports of builds silently switching builders mid-project. Realistically ~$5/month after the one-time trial.
- **Fly.io** — real VMs, native long-lived connections, `llms.txt` published. Highest operational surface of the set (Dockerfile plus `fly.toml` plus regions), MCP server marked experimental, **no rollback verb by design** (redeploy a tagged image instead), and no free tier at all — free allowances ended in 2024 and every org must keep a card on file.

### Shortlisted Platforms

#### 1. Cloudflare Workers (Recommended)

Passes every criterion; free tier absorbs projected traffic entirely; the project is already configured for it, so choosing it costs zero migration work while any alternative means swapping adapters and re-verifying the build. Edge distribution is not needed (single-region audience) but costs nothing.

#### 2. Netlify

The closest architectural substitute — same serverless SSR shape, official adapter, zero-config session storage, no card required, and no non-commercial restriction. The gap versus the recommendation: no scriptable rollback, and a credit model where frequent deploys during a two-week build could exhaust the free allowance and take the site offline.

#### 3. Render

Picked over Railway and Fly purely on the cost priority: it is the only remaining option that is free without a credit card and cannot go offline from credit exhaustion. The gap: a 30–60 second cold start on the first request after idle, and an MCP server that cannot deploy.

## Anti-Bias Cross-Check: Cloudflare Workers

### Devil's Advocate — Weaknesses

1. **Prerender can corrupt output while reporting success.** A known workerd bug writes truncated HTML and still exits 0 (withastro/astro#17047). CI goes green, the deployed page is broken, and nothing in the pipeline flags it. Escape hatch: `prerenderEnvironment: 'node'`.
2. **Opaque 500s swallow the underlying error** (withastro/astro#15860). The natural-language parsing endpoint (FR-002/FR-003) is exactly the kind of code whose failures need a readable stack trace; on workerd it may surface as an unexplained 500.
3. **Astro sessions default to a Cloudflare KV binding that is eventually consistent**, with up to 60 seconds of global propagation. CashCheck signs a user in and immediately redirects to a protected route — a read-after-write on auth state is precisely the pattern KV does not guarantee.
4. **The 10 ms CPU-per-invocation free-tier limit is the real ceiling, not the request count.** Waiting on an LLM response is I/O, not CPU, so the parsing call itself is safe, but heavy JSON handling or crypto in the same request could brush the limit — and the failure mode is a killed request, not a slow one.
5. **The project sits on a maintenance branch.** Astro 7 shipped 2026-06-22 (current 7.2.10); the installed `@astrojs/cloudflare` 13.5.0 trails the current 14.2.5. Four npm-audit findings — including an Astro XSS advisory — remain open because their fix requires the Astro 7 major bump, deliberately deferred.
6. **No automatic per-branch preview environments.** That was a Pages feature; on Workers, preview URLs need explicit wiring, and the chosen flow (auto-deploy on merge to `main`) has no preview step today.

### Pre-Mortem — How This Could Fail

Six months on, the decision reads as a mistake. The first crack appeared early: a deploy went out green while one prerendered page shipped truncated HTML, and because nothing verified the build output, the breakage was found by a user rather than by CI. Trust in the pipeline eroded, and every deploy started requiring a manual click-through. Then the auth flow began failing intermittently — users signing in and landing back on the login screen — because session state was read from KV within the eventual-consistency window; the bug was unreproducible locally, where the store is immediate, and cost days to diagnose. Meanwhile the deferred Astro 6 → 7 upgrade compounded: the adapter branch stopped receiving fixes, and by the time the upgrade became unavoidable it spanned two majors instead of one. Underneath all of it was one wrong assumption — that because the starter arrived pre-configured for this platform, the platform's failure modes had been vetted for this application. They had been vetted for a template with no data flow, not for cookie-based auth plus a latency-sensitive parsing call.

### Unknown Unknowns

- **`nodejs_compat` is not full Node.** `@supabase/ssr` (cookie-based) works, but the newer `@supabase/server` package that actually targets Workers has no Astro adapter yet — so the modern path is closed for now.
- **Nearly every Astro + Cloudflare tutorial published in 2024–2025 targets Pages**, which the adapter no longer supports. Copy-pasted configuration from blog posts will fail in ways that look like project misconfiguration.
- **Astro's documentation removed its `llms.txt` in May 2026** and serves no markdown variants. The asymmetry is real: excellent agent-readable Cloudflare docs, poor agent-readable Astro docs — and Astro is where most implementation questions will land.
- **`compatibility_date` in `wrangler.jsonc` freezes runtime behaviour** at `2026-05-08`. Bumping it later can change semantics silently; leaving it stale means missing runtime fixes.
- **Durable Objects are the only path to shared state** and are paid-tier only. Nothing in the MVP needs them, but any future feature that does (shared household budgets — explicitly a non-goal today) crosses a billing boundary.

## Operational Story

- **Preview deploys**: not automatic on Workers (that was a Pages capability). `wrangler versions upload` produces a preview URL per version without promoting it to production; wiring it into pull requests is manual work not yet done.
- **Secrets**: `SUPABASE_URL` and `SUPABASE_KEY` live in three places — `.env` for Node-side local dev, `.dev.vars` for local workerd (both gitignored), and Workers secrets in production via `npx wrangler secret put <KEY>`. CI additionally needs them as GitHub repository secrets for the build step. Rotation means updating each surface; nothing syncs them automatically.
- **Rollback**: `wrangler rollback [VERSION_ID]` reverts to a prior version, typically in seconds. Caveat: it reverts code only — a Supabase migration applied by the bad release does not roll back with it, so migrations must be backward-compatible with the previous version.
- **Approval**: promoting to production and rotating secrets stay human decisions. An agent may run `npm run build`, `npm run lint`, and read logs unattended. Deleting a Worker or dropping database objects always requires a human.
- **Logs**: `npx wrangler tail cashcheck` streams runtime logs (filterable with `--status`, `--search`); `observability.enabled` is already true in `wrangler.jsonc`, so logs are retained and queryable. GitHub Actions logs cover the CI side.

## Risk Register

| Risk                                                                      | Source                              | Likelihood | Impact | Mitigation                                                                                                                                                                                              |
| ------------------------------------------------------------------------- | ----------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prerender writes truncated HTML, exit code 0                              | Devil's advocate (astro#17047)      | M          | H      | After every build, assert `dist/` contains the expected pages and non-trivial byte sizes; if it recurs, set `prerenderEnvironment: 'node'`                                                              |
| Auth state read from KV inside the eventual-consistency window            | Devil's advocate / Unknown unknowns | M          | H      | Never read session state immediately after writing it; drive post-signin redirects from the response the sign-in endpoint already holds, not from a fresh session read                                  |
| Opaque 500s hide the real parsing error                                   | Devil's advocate (astro#15860)      | M          | M      | Wrap the parsing endpoint in explicit try/catch that logs the caught error before returning; verify it appears in `wrangler tail`                                                                       |
| 4 unpatched advisories, incl. Astro XSS, from staying on Astro 6          | Research finding                    | M          | M      | Accepted deliberately (Astro 7 upgrade deferred past MVP). The XSS path is unescaped spread-attribute names — do not use spread props on user-controlled attributes; revisit the upgrade after delivery |
| 10 ms CPU per invocation kills a heavy request                            | Devil's advocate                    | L          | M      | Keep per-request work to I/O plus light JSON; if a request is killed, move parsing off the hot path rather than upgrading the plan                                                                      |
| Pages-targeted tutorials produce broken config                            | Unknown unknowns                    | H          | L      | Treat `@astrojs/cloudflare` docs plus this repo's `wrangler.jsonc` as the only configuration sources; ignore blog snippets mentioning Pages                                                             |
| Deferred Astro 6 → 7 upgrade compounds over time                          | Pre-mortem                          | M          | M      | Record it as an open question now; re-evaluate immediately after MVP delivery rather than at the next forced bump                                                                                       |
| Secrets drift across `.env`, `.dev.vars`, Workers secrets, GitHub secrets | Operational story                   | M          | M      | Change them in one pass across all four surfaces; treat `.env.example` as the authoritative list of required keys                                                                                       |

## Getting Started

1. `npx wrangler login` — the stored token is expired; this must run in an interactive terminal.
2. `npx wrangler secret put SUPABASE_URL` and `npx wrangler secret put SUPABASE_KEY` — production secrets (a Supabase project must exist first; local development can use `npx supabase start` instead).
3. `npm run build` — already verified to pass; inspect `dist/` before deploying rather than trusting the exit code.
4. `npx wrangler deploy` — publishes the Worker named `cashcheck` and prints its `workers.dev` URL.
5. Add `SUPABASE_URL` and `SUPABASE_KEY` as GitHub repository secrets so the CI build step succeeds.

## Out of Scope

The following were not evaluated in this research:

- Docker image configuration
- CI/CD pipeline setup
- Production-scale architecture (multi-region, HA, DR)
