# CashCheck

Rejestrator wydatków, w którym wydatek dodajesz **jednym polskim zdaniem** — „biedronka 87,50", „paliwo 200 zł wczoraj" — a AI proponuje kwotę, kategorię i datę. Ty tylko sprawdzasz, poprawiasz i zapisujesz. Widok pokazuje wydatki bieżącego miesiąca z podsumowaniem per kategoria.

Produkcja: **https://cashcheck.sebastian-sobiech.workers.dev**

Projekt zaliczeniowy kursu [10xDevs 3.0](https://www.10xdevs.pl/) — zbudowany w całości w przepływie 10x (PRD → roadmap → zmiany → archiwum), z umową jakości opartą na ryzyku.

## Jak to działa

1. Wpisujesz zdanie i klikasz **Dodaj** — serwer wysyła je do Workers AI (`llama-3.3-70b`, tryb JSON) i normalizuje wynik (przecinki dziesiętne, kategorie bez wielkości liter, daty względne w strefie Europe/Warsaw).
2. Dostajesz **propozycję do korekty** — braki lub awaria modelu degradują do pustej karty, nigdy nie blokują zapisu (to Ty decydujesz, AI tylko proponuje).
3. Zapis trafia do Postgresa (Supabase) z izolacją per-użytkownik (RLS). Lista i podsumowanie „Ten miesiąc" aktualizują się na żywo; wpisy można edytować i usuwać (dwustopniowe potwierdzenie).

## Stos

[Astro 6](https://astro.build/) SSR + [React 19](https://react.dev/) (wyspy) + TypeScript + [Tailwind 4](https://tailwindcss.com/) + [Supabase](https://supabase.com/) (auth + Postgres z RLS) + [Cloudflare Workers](https://workers.cloudflare.com/) (deploy + Workers AI). Uzasadnienie: [context/foundation/tech-stack.md](context/foundation/tech-stack.md).

## Szybki start

Wymagania: Node.js v22.14.0 (`.nvmrc`), npm, konto Supabase (albo lokalny stack przez Dockera), zalogowany `wrangler` (binding Workers AI otwiera sesję zdalną nawet w dev).

```bash
npm install
cp .env.example .env        # uzupełnij SUPABASE_URL i SUPABASE_KEY
cp .env.example .dev.vars   # sekrety dla workerd w dev
npm run dev                 # http://localhost:4321
```

Schemat bazy: zastosuj migracje z [`supabase/migrations/`](supabase/migrations/) (SQL editor w dashboardzie Supabase albo `npx supabase db push`). Tabela `expenses` ma włączone RLS z politykami per-operacja — użytkownik widzi wyłącznie własne wiersze.

### Zmienne środowiskowe

| Zmienna                         | Opis                                                                             |
| ------------------------------- | -------------------------------------------------------------------------------- |
| `SUPABASE_URL` / `SUPABASE_KEY` | projekt Supabase (klucz publishable/anon); czytane server-only przez `astro:env` |
| `E2E_EMAIL` / `E2E_PASSWORD`    | konto testowe do E2E (Playwright) — tylko lokalnie, nigdy w repo                 |

## Skrypty

- `npm run dev` / `build` / `preview` — serwer dev (workerd), build produkcyjny, podgląd
- `npm test` / `npm run test:watch` — testy jednostkowe (Vitest)
- `npx playwright test` — testy E2E (uruchamiają własny serwer dev)
- `npm run lint` / `lint:fix` / `format` — ESLint (type-checked) i Prettier

## Testy i jakość

Umowa jakości żyje w [context/foundation/test-plan.md](context/foundation/test-plan.md) — mapa ryzyk, fazowy rollout i przepisy „jak dodać test" (§6). Obecnie: **32 testy jednostkowe** (golden-zestaw parsera, walidacja zapisu, okno miesiąca) + **4 testy E2E** (Playwright, auth przez `storageState`, reguły w [tests/e2e/AGENTS.md](tests/e2e/AGENTS.md)).

Lokalne bramki (od najszybszej): hak per-edit agenta (prettier + `vitest related` na obszarach ryzyka) → pre-commit (lint-staged) → pre-push (pełny lint + testy + `astro check`) → CI.

## Dokumentacja projektu

Fundament 10x w [`context/foundation/`](context/foundation/): [prd.md](context/foundation/prd.md) (wymagania), [roadmap.md](context/foundation/roadmap.md), [test-plan.md](context/foundation/test-plan.md), [infrastructure.md](context/foundation/infrastructure.md), [lessons.md](context/foundation/lessons.md). Historia zamkniętych zmian (research → plan → implementacja) w [`context/archive/`](context/archive/). Reguły dla agentów: [AGENTS.md](AGENTS.md).

## Deploy

```bash
npm run build
npx wrangler deploy
```

Sekrety na Workers: `npx wrangler secret put SUPABASE_URL` i `SUPABASE_KEY`. Binding Workers AI (`env.AI`) konfiguruje `wrangler.jsonc`. Nowa wersja propaguje się kilka sekund.

## CI

GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml)) uruchamia `astro sync` + lint + build na każdy push/PR do `main`. Wymagane sekrety repozytorium: `SUPABASE_URL`, `SUPABASE_KEY`, `CLOUDFLARE_API_TOKEN` (binding AI otwiera sesję zdalną podczas `astro sync`/`build`).

## Licencja

MIT
