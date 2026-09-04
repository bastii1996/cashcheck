# Research — test-plan-refresh-2026-09-04

Ugruntowanie stanu faktycznego przed aktualizacją przewodnika. Kotwice plik:linia są
tu dozwolone (wynik badania), w §2 test-planu nadal zabronione.

## 1. Warstwy lokalne (m3l3) — co realnie działa

- **Hak per-edit**: `.claude/settings.json` rejestruje PostToolUse (matcher `Write|Edit`)
  → `node .claude/hooks/post-edit.mjs` (timeout 90 s). Skrypt (`.claude/hooks/post-edit.mjs`):
  - prettier `--write` na każdym edytowanym pliku o rozszerzeniu z listy (`PRETTIER_EXTENSIONS`, l. 15),
  - `vitest related "<plik>" --run` tylko dla obszarów ryzyka `src/lib/services/**`,
    `src/pages/api/**`, `test/**` (`RISK_AREAS`, l. 14) — plik `*.test.ts` uruchamia sam siebie,
  - exit 2 + stderr (limit 9 000 znaków, l. 11) = blokujący feedback dla agenta.
  - Dowód działania: wstrzyknięte naruszenie formatowania w `src/types.ts` naprawione
    przez hak w locie; oblany test tymczasowy zwrócił exit 2 z raportem vitest.
- **Pre-commit** (bez zmian od startera): `.husky/pre-commit` → `npx lint-staged`
  (eslint --fix na `*.{ts,tsx,astro}`, prettier na `*.{json,css,md}` — `package.json#lint-staged`).
- **Pre-push**: `.husky/pre-push` → `set -e; npm test; npx astro check`. Dowód: realny
  push m3l3/m3l4 przeszedł przez bramkę (23 testy vitest + astro check 0 błędów).

## 2. Playwright E2E (m3l4) — co realnie działa

- **Config**: `playwright.config.ts` — testDir `tests/e2e`, baseURL `http://localhost:4321`,
  `webServer: npm run dev` (reuseExistingServer), projekt `setup` (match `auth.setup.ts`)
  → projekt `chromium` z `storageState: tests/e2e/.auth/user.json`. Sekrety `E2E_EMAIL`/
  `E2E_PASSWORD` ładowane z `.env` przez `process.loadEnvFile()` (Node 22+); `.auth/`
  w `.gitignore`.
- **Dźwignie jakości**: `tests/e2e/seed.spec.ts` (egzemplarz: role-lokatory, izolacja,
  wait-for-state, unikalne dane, dwustopniowe Usuń) i `tests/e2e/AGENTS.md` (reguły —
  m.in. „Workers AI wywoływane server-side: page.route tego nie przechwyci; dane
  przygotowuj przez /api/expenses").
- **Test ryzyka #1**: `tests/e2e/corrected-proposal.spec.ts` — pełny przepływ
  zdanie → propozycja → korekta wszystkich pól → zapis → lista + podsumowanie (FR-007);
  bez asercji treści propozycji (zgodnie z §7 — nie testujemy jakości modelu).
  Weryfikacja sabotażem: zapis ignorujący skorygowaną kwotę (amount: 1 w
  `ExpensesApp.handleSave`) → czerwony dokładnie na asercji kwoty; sabotaż cofnięty.
- **Polecenia**: cała suita `npx playwright test`; pojedynczy spec
  `npx playwright test tests/e2e/<plik>.spec.ts`.
- **Koszt/founding**: jeden realny call Workers AI na przebieg speca ryzyka #1
  (aplikacja degraduje do karty ręcznej przy awarii AI, więc spec nie flakuje na AI).

## 3. Rozbieżności przewodnika względem stanu

| Miejsce        | Przewodnik mówi                                             | Rzeczywistość                                        |
| -------------- | ----------------------------------------------------------- | ---------------------------------------------------- |
| §4 wiersz e2e  | „brak — celowo… do rewizji przy wzroście UI"                | Playwright 1.x zainstalowany (m3l4), 2 specy + setup |
| §5 wiersz hook | „recommended after §3 Phase 4"                              | działa od m3l3 (per-edit, blokujący exit 2)          |
| §5             | brak wiersza pre-push                                       | bramka pre-push: pełna suita + typecheck             |
| §6             | brak wzorca E2E                                             | dźwignie + konwencje istnieją w `tests/e2e/`         |
| §3 Faza 4      | „testy w CI przed buildem, szybkie testy per-edit lokalnie" | połowa lokalna zrobiona (m3l3); zostaje CI           |

## 4. Ryzyka spekulatywne / korekty §2

Brak — mapa ryzyk aktualna; test E2E chroni przeglądarkową resztę ryzyka #1, co §2
już opisuje w Risk Response Guidance (warstwa „unit + kontrakt endpointu" pozostaje
najtańsza; E2E to uzupełnienie wprowadzone lekcją, nie zmiana priorytetów).
