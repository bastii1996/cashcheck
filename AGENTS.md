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

## Commands

- `npm run dev` / `build` / `preview` — dev server (workerd), production build, preview.
- `npm run lint` / `lint:fix` / `format` — ESLint (type-checked) and Prettier.
- `npx supabase start` — local Supabase stack (Docker).
- Pre-commit: husky + lint-staged run `eslint --fix` and `prettier --write`. Node 22.14.0 (@.nvmrc).

## Testing

The quality contract lives in @context/foundation/test-plan.md — read it before writing or changing any test. Risks are scenarios (§2), rollout state is §3, cookbook patterns land in §6. The test stack (Vitest, local Supabase) arrives only through that plan's rollout phases — do not introduce runners or test layers ad hoc.

Local quality layers (fast → heavy): a PostToolUse agent hook (@.claude/settings.json → `.claude/hooks/post-edit.mjs`) runs prettier plus `vitest related` on risk-area files after every Write/Edit; pre-commit (husky + lint-staged) lints staged files; pre-push runs the full test suite plus `astro check`. A failing hook is a signal to fix the code, never to bypass the hook.

## Commits & CI

Commit subjects: imperative mood, ≤72 chars, say what changes (e.g. `Add expense list filtering by month`); no enforced prefix convention yet. CI (@.github/workflows/ci.yml) runs `astro sync` + lint + build on every push/PR to `main`; requires `SUPABASE_URL`/`SUPABASE_KEY` repository secrets.
