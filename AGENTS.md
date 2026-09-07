# Repository Guidelines

CashCheck — an expense tracker where a user logs an expense as one natural-language sentence ("biedronka 87,50") and confirms an AI-derived amount/category/date. Astro 6 SSR + React 19 islands + TypeScript + Tailwind 4 + Supabase (auth + Postgres), deployed to Cloudflare Workers. Product scope: @context/foundation/prd.md; stack rationale: @context/foundation/tech-stack.md.

## Hard rules

- Never commit `.env` or `.dev.vars` — secrets are `SUPABASE_URL`, `SUPABASE_KEY`, read via `astro:env/server` (schema in @astro.config.mjs); never expose them client-side.
- Every new table in `supabase/migrations/` must enable RLS with granular per-operation, per-role policies — a user may only ever read/write their own rows (PRD privacy guardrail).
- All pages render server-side (`output: "server"`); API routes must export `const prerender = false`.
- Merge Tailwind classes with `cn()` from `@/lib/utils`; never concatenate class strings manually.
- No Next.js directives (`"use client"` etc.) in React code.

## Structure

- `src/pages/` — Astro pages; `src/pages/api/` — endpoints with uppercase `GET`/`POST` exports, zod-validated input.
- `src/components/` — Astro for static, React only when interactive; shadcn/ui ("new-york") in `src/components/ui/` (`npx shadcn@latest add [name]`); hooks in `src/components/hooks/`.
- `src/lib/` — services/helpers (`src/lib/services/` for business logic); shared entities/DTOs in `src/types.ts`; path alias `@/*` → `./src/*`.
- `src/middleware.ts` — resolves `context.locals.user`; add gated paths to `PROTECTED_ROUTES`.
- `supabase/migrations/` — files named `YYYYMMDDHHmmss_short_description.sql`.

## Context architecture

Instruction files merge **additively** (root → subdirectory), so keep this root file lean and reference-heavy; durable knowledge lives in `context/` (foundation = current truth, archive = closed changes), never inline here. One scoped file exists today: @tests/e2e/AGENTS.md. Add another per-directory AGENTS.md only on an observable trigger — an area grows its own conventions or framework (like E2E did), agents repeatedly make the same mistake there, or rules for that area start crowding this root. Never paste `context/` content into rule files; link it.

## Commands

- `npm run dev` / `build` / `preview` — dev server (workerd), production build, preview.
- `npm run lint` / `lint:fix` / `format` — ESLint (type-checked) and Prettier.
- `npx supabase start` — local Supabase stack (Docker).
- Pre-commit: husky + lint-staged run `eslint --fix` and `prettier --write`. Node 22.14.0 (@.nvmrc).

## Testing

The quality contract lives in @context/foundation/test-plan.md — read it before writing or changing any test. Risks are scenarios (§2), rollout state is §3, cookbook patterns land in §6. The test stack (Vitest, local Supabase) arrives only through that plan's rollout phases — do not introduce runners or test layers ad hoc.

Local quality layers (fast → heavy): a PostToolUse agent hook (@.claude/settings.json → `.claude/hooks/post-edit.mjs`) runs prettier plus `vitest related` on risk-area files after every Write/Edit; pre-commit (husky + lint-staged) lints staged files; pre-push runs full `npm run lint`, the test suite and `astro check` (staged-only lint once let a repo-wide lint error reach CI). A failing hook is a signal to fix the code, never to bypass the hook.

E2E (Playwright) lives in `tests/e2e/` — rules in @tests/e2e/AGENTS.md, exemplar in `tests/e2e/seed.spec.ts`, auth via storageState (`auth.setup.ts`, credentials `E2E_EMAIL`/`E2E_PASSWORD` in `.env`). Generate E2E through `/10x-e2e` only.

## Commits & CI

Commit subjects: imperative mood, ≤72 chars, say what changes (e.g. `Add expense list filtering by month`); no enforced prefix convention yet. CI (@.github/workflows/ci.yml) runs `astro sync` + lint + build on every push/PR to `main`; requires `SUPABASE_URL`/`SUPABASE_KEY` repository secrets.
